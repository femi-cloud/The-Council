// types.ts
// Shared types mirroring the backend's orchestrator output shapes.
// Keeping these in sync manually is fine for a hackathon scope — no shared package needed.

export type AgentRole = "security" | "performance" | "readability" | "architect"
export type OutputLanguage = "en" | "fr"

export interface Finding {
  severity: "critical" | "high" | "medium" | "low"
  issue: string
  line: number | null
  reasoning: string
}

export interface AgentResponse {
  agent: AgentRole
  findings: Finding[]
  overall_take: string
}

export interface Conflict {
  agentA: AgentRole
  agentB: AgentRole
  description: string
  findingA: Finding
  findingB: Finding
}

export interface ModeratorVerdict {
  verdict: string
  priority_order: string[]
  resolved_conflicts: { conflict: string; resolution: string }[]
}

export interface CouncilResult {
  agentResponses: AgentResponse[]
  conflicts: Conflict[]
  debateRound: AgentResponse[]
  moderatorVerdict: ModeratorVerdict
  metrics: {
    totalFindings: number
    conflictCount: number
    durationMs: number
  }
}

// Mirrors backend's StreamEvent union, plus the final "result" wrapper event.
export type StreamEvent =
  | { type: "agent_start"; agent: AgentRole }
  | { type: "agent_done"; agent: AgentRole; response: AgentResponse }
  | { type: "conflicts_detected"; conflicts: Conflict[] }
  | { type: "debate_start" }
  | { type: "debate_done"; responses: AgentResponse[] }
  | { type: "moderator_start" }
  | { type: "moderator_done"; verdict: ModeratorVerdict }
  | { type: "result"; result: CouncilResult }
  | { type: "error"; message: string }

// UI-facing status per agent, derived from the stream of events above.
export type AgentStatus = "idle" | "analyzing" | "done" | "debating"

export const AGENT_LABELS: Record<AgentRole, string> = {
  security: "Security",
  performance: "Performance",
  readability: "Readability",
  architect: "Architect",
}

export const AGENT_COLORS: Record<AgentRole, { bg: string; text: string; avatarBg: string }> = {
  security: { bg: "bg-red-50", text: "text-red-700", avatarBg: "bg-red-100" },
  performance: { bg: "bg-amber-50", text: "text-amber-700", avatarBg: "bg-amber-100" },
  readability: { bg: "bg-emerald-50", text: "text-emerald-700", avatarBg: "bg-emerald-100" },
  architect: { bg: "bg-violet-50", text: "text-violet-700", avatarBg: "bg-violet-100" },
}