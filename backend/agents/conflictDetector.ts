import { AgentResponse, AgentRole, Finding } from "./prompts"

export interface Conflict {
  agentA: AgentRole
  agentB: AgentRole
  description: string
  findingA: Finding
  findingB: Finding
}

const TENSION_PATTERNS: { a: RegExp; b: RegExp; label: string }[] = [
  {
    a: /valid|sanitiz|encrypt|hash|check|verify/i,
    b: /slow|latency|cost|overhead|performance|expensive|ms\b/i,
    label: "security vs performance tradeoff",
  },
  {
    a: /abstract|pattern|repository|separat|refactor/i,
    b: /simple|overengineer|unnecessary|premature|too complex/i,
    label: "architecture vs simplicity tradeoff",
  },
  {
    a: /rename|naming|unclear|confusing/i,
    b: /works fine|not a priority|minor|cosmetic/i,
    label: "readability priority disagreement",
  },
  {
    a: /parameteriz|escape|validate input/i,
    b: /batch|cache|precomput|avoid recomputation/i,
    label: "security fix vs optimization approach",
  },
]

export function detectConflicts(responses: AgentResponse[]): Conflict[] {
  const conflicts: Conflict[] = []

  for (let i = 0; i < responses.length; i++) {
    for (let j = i + 1; j < responses.length; j++) {
      const agentA = responses[i]
      const agentB = responses[j]

      for (const findingA of agentA.findings) {
        for (const findingB of agentB.findings) {
          const conflict = checkTension(agentA.agent, findingA, agentB.agent, findingB)
          if (conflict) conflicts.push(conflict)
        }
      }
    }
  }

  return dedupeConflicts(conflicts)
}

// Mots techniques ignorés car trop génériques pour établir un vrai chevauchement de sujet
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is", "are",
  "this", "that", "via", "due", "not", "no", "should", "must", "when", "where", "which",
  "code", "function", "issue", "vulnerability", "concern", "problem",
])

function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w))
  )
}

function shareTopic(findingA: Finding, findingB: Finding): boolean {
  const keywordsA = extractKeywords(findingA.issue)
  const keywordsB = extractKeywords(findingB.issue)
  for (const word of keywordsA) {
    if (keywordsB.has(word)) return true
  }
  return false
}

function checkTension(
  roleA: AgentRole,
  findingA: Finding,
  roleB: AgentRole,
  findingB: Finding
): Conflict | null {
  // On matche uniquement sur "issue" (court, focalisé) — "reasoning" est trop bruyant
  // et déclenche des faux positifs sur des mentions incidentes ("this may impact performance").
  const textA = findingA.issue
  const textB = findingB.issue

  for (const pattern of TENSION_PATTERNS) {
    const aMatchesA = pattern.a.test(textA)
    const bMatchesB = pattern.b.test(textB)
    const aMatchesB = pattern.a.test(textB)
    const bMatchesA = pattern.b.test(textA)

    if ((aMatchesA && bMatchesB) || (aMatchesB && bMatchesA)) {
      // Exige un vrai chevauchement de sujet (même terme technique dans les deux issues)
      // pour confirmer qu'il s'agit du même point de code, pas juste du même thème général.
      if (!shareTopic(findingA, findingB)) continue

      return {
        agentA: roleA,
        agentB: roleB,
        description: pattern.label,
        findingA,
        findingB,
      }
    }
  }

  return null
}

// Évite les doublons si plusieurs paires de findings déclenchent le même conflit agent/agent
function dedupeConflicts(conflicts: Conflict[]): Conflict[] {
  const seen = new Set<string>()
  const result: Conflict[] = []

  for (const c of conflicts) {
    const key = [c.agentA, c.agentB, c.description].sort().join("|")
    if (!seen.has(key)) {
      seen.add(key)
      result.push(c)
    }
  }

  return result
}