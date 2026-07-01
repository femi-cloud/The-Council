import OpenAI from "openai"
import {
  AGENT_PROMPTS,
  AGENT_LABELS,
  moderatorPrompt,
  AgentRole,
  OutputLanguage,
  AgentResponse,
  Finding,
} from "./prompts"
import { detectConflicts, Conflict } from "./conflictDetector"

// Keywords that belong exclusively to SecurityAgent's domain. Even with explicit
// prompt instructions, LLMs sometimes report obvious security issues from other
// personas anyway (e.g. an exposed API key is "too obvious" to skip). This guard
// removes cross-domain findings programmatically rather than relying on prompt
// compliance alone.
const SECURITY_ONLY_PATTERN =
  /secret|api key|apikey|hardcod|credential|password|sql injection|\binjection\b|xss|auth(entication|orization)?\s*(flaw|bypass|check)|buffer overflow|path traversal|unsanitiz|unparameteriz|logged? (to console|in plaintext)|exposed? (key|secret|token)|\beval\(\)|arbitrary code execution|remote code execution|\brce\b|untrusted (input|user)/i

function enforceLanes(responses: AgentResponse[]): AgentResponse[] {
  return responses.map((response) => {
    if (response.agent === "security") return response
    return {
      ...response,
      findings: response.findings.filter((f) => !SECURITY_ONLY_PATTERN.test(f.issue)),
    }
  })
}

const client = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: process.env.QWEN_BASE_URL,
})

const MODEL = process.env.QWEN_MODEL || "qwen-plus"
const AGENT_ROLES: AgentRole[] = ["security", "performance", "readability", "architect"]

export interface ModeratorVerdict {
  verdict: string
  priority_order: string[]
  resolved_conflicts: { conflict: string; resolution: string }[]
}

export interface CouncilResult {
  agentResponses: AgentResponse[]
  conflicts: Conflict[]
  debateRound: AgentResponse[] // final agent positions after the debate round
  moderatorVerdict: ModeratorVerdict
  metrics: {
    totalFindings: number
    conflictCount: number
    durationMs: number
  }
}

// Optional streaming callback — lets the SSE server push
// events to the frontend as they happen.
export type StreamEvent =
  | { type: "agent_start"; agent: AgentRole }
  | { type: "agent_done"; agent: AgentRole; response: AgentResponse }
  | { type: "conflicts_detected"; conflicts: Conflict[] }
  | { type: "debate_start" }
  | { type: "debate_done"; responses: AgentResponse[] }
  | { type: "moderator_start" }
  | { type: "moderator_done"; verdict: ModeratorVerdict }
  | { type: "error"; message: string }

export type StreamCallback = (event: StreamEvent) => void

// ─────────────────────────────────────────────────────────────
// Generic agent call, with safe JSON parsing
// ─────────────────────────────────────────────────────────────
async function callAgent(
  role: AgentRole,
  code: string,
  lang: OutputLanguage,
  extraContext?: string
): Promise<AgentResponse> {
  const systemPrompt = AGENT_PROMPTS[role](lang)
  const userMessage = extraContext
    ? `Code to review:\n\`\`\`\n${code}\n\`\`\`\n\n` +
      `You are now in a DEBATE ROUND. Here is what the other agents found:\n${extraContext}\n\n` +
      `If you have a genuine, domain-specific objection to any of the above — e.g. a security fix that ` +
      `imposes a real, concrete performance cost, or an architectural suggestion that's premature — state it ` +
      `explicitly and back it with a specific estimate or reason (not vague concern). ` +
      `Do NOT manufacture disagreement for its own sake — if you have no substantive objection, keep your original findings ` +
      `and say so in "overall_take". Respond with the same JSON format as before, representing your final position after seeing the others.`
    : `Code to review:\n\`\`\`\n${code}\n\`\`\``

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.4,
    max_tokens: 600,
  })

  const raw = completion.choices[0].message.content || "{}"
  const parsed = safeParseJSON(raw)

  return {
    agent: role,
    findings: parsed.findings || [],
    overall_take: parsed.overall_take || "",
  }
}

function safeParseJSON(raw: string): { findings: Finding[]; overall_take: string } {
  try {
    // Strip any code fences the model might add despite the instruction
    const cleaned = raw.replace(/```json|```/g, "").trim()
    return JSON.parse(cleaned)
  } catch {
    return { findings: [], overall_take: "" }
  }
}

// ─────────────────────────────────────────────────────────────
// Moderator call
// ─────────────────────────────────────────────────────────────
async function callModerator(
  code: string,
  responses: AgentResponse[],
  conflicts: Conflict[],
  lang: OutputLanguage
): Promise<ModeratorVerdict> {
  const summary = responses
    .map((r) => {
      const findingsText = r.findings
        .map((f) => `  - [${f.severity}] ${f.issue} — ${f.reasoning}`)
        .join("\n")
      return `${AGENT_LABELS[r.agent]} (verdict: ${r.overall_take}):\n${findingsText || "  (no findings)"}`
    })
    .join("\n\n")

  const conflictsText =
    conflicts.length > 0
      ? conflicts.map((c) => `- ${c.agentA} vs ${c.agentB}: ${c.description}`).join("\n")
      : "No direct conflicts detected between agents."

  const userMessage = `
Code reviewed:
\`\`\`
${code}
\`\`\`

Council findings:
${summary}

Conflicts identified:
${conflictsText}
`.trim()

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: moderatorPrompt(lang) },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 500,
  })

  const raw = completion.choices[0].message.content || "{}"
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim()
    return JSON.parse(cleaned)
  } catch {
    return { verdict: "Unable to synthesize verdict.", priority_order: [], resolved_conflicts: [] }
  }
}

// ─────────────────────────────────────────────────────────────
// Main pipeline
// ─────────────────────────────────────────────────────────────
export async function runCouncil(
  code: string,
  lang: OutputLanguage = "en",
  onEvent?: StreamCallback
): Promise<CouncilResult> {
  const startTime = Date.now()

  // 1. Round 1 — independent parallel analysis
  onEvent?.({ type: "debate_start" }) // generic start signal (optional, UI-side)
  const round1Promises = AGENT_ROLES.map(async (role) => {
    onEvent?.({ type: "agent_start", agent: role })
    const response = await callAgent(role, code, lang)
    onEvent?.({ type: "agent_done", agent: role, response })
    return response
  })
  const round1Responses = await Promise.all(round1Promises)
  const guardedRound1 = enforceLanes(round1Responses)

  // 2. Initial conflict scan — informational, also used to decide which agents
  // get flagged as "involved" in the debate summary shown in the UI.
  const initialConflicts = detectConflicts(guardedRound1)
  onEvent?.({ type: "conflicts_detected", conflicts: initialConflicts })

  // 3. Debate round — Security and Performance always debate, since that's the
  // axis most likely to produce real tension (a security fix with a real cost).
  // Readability and Architect only join if the initial scan specifically flagged
  // them in a conflict — this keeps the call count down (6 typical vs 8 fixed)
  // without losing debate quality on the pair that matters most.
  onEvent?.({ type: "debate_start" })
  const flaggedAgents = new Set<AgentRole>()
  initialConflicts.forEach((c) => {
    flaggedAgents.add(c.agentA)
    flaggedAgents.add(c.agentB)
  })
  const ALWAYS_DEBATE: AgentRole[] = ["security", "performance"]
  const debatingAgents = new Set<AgentRole>([...ALWAYS_DEBATE, ...flaggedAgents])

  const debateContext = guardedRound1
    .map((r) => {
      const findingsText = r.findings
        .map((f) => `  - [${f.severity}] ${f.issue} — ${f.reasoning}`)
        .join("\n")
      return `${AGENT_LABELS[r.agent]}:\n${findingsText || "  (no findings)"}`
    })
    .join("\n\n")

  const debatePromises = guardedRound1.map(async (r) => {
    if (!debatingAgents.has(r.agent)) return r // not in debate scope, keep round 1 response
    return callAgent(r.agent, code, lang, debateContext)
  })
  const finalResponses = enforceLanes(await Promise.all(debatePromises))
  onEvent?.({ type: "debate_done", responses: finalResponses })

  // Re-run detection on final positions so the report reflects conflicts that
  // survived (or emerged from) the debate round, not just the pre-debate scan.
  const conflicts = detectConflicts(finalResponses)

  // 4. Moderator verdict
  onEvent?.({ type: "moderator_start" })
  const moderatorVerdict = await callModerator(code, finalResponses, conflicts, lang)
  onEvent?.({ type: "moderator_done", verdict: moderatorVerdict })

  const totalFindings = finalResponses.reduce((sum, r) => sum + r.findings.length, 0)

  return {
    agentResponses: guardedRound1,
    conflicts,
    debateRound: finalResponses,
    moderatorVerdict,
    metrics: {
      totalFindings,
      conflictCount: conflicts.length,
      durationMs: Date.now() - startTime,
    },
  }
}