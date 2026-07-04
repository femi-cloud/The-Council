// AgentCard.tsx
// One quadrant of the debate grid: shows the agent's avatar, current status,
// and its findings once available. Shows a pulsing indicator while "analyzing".

import type { AgentResponse, AgentRole, AgentStatus } from "../types"
import { AGENT_LABELS, AGENT_COLORS } from "../types"
import { Badge } from "../components/ui/badge"

interface AgentCardProps {
  agent: AgentRole
  status: AgentStatus
  response: AgentResponse | null
}

const SEVERITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "secondary",
  medium: "outline",
  low: "outline",
}

const AGENT_INITIALS: Record<AgentRole, string> = {
  security: "SE",
  performance: "PE",
  readability: "RE",
  architect: "AR",
}

export function AgentCard({ agent, status, response }: AgentCardProps) {
  const colors = AGENT_COLORS[agent]
  const topFinding = response?.findings[0]

  return (
    <div className="p-3 border-b border-r border-border last:border-r-0 bg-card">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium ${colors.avatarBg} ${colors.text}`}
        >
          {AGENT_INITIALS[agent]}
        </div>
        <span className="text-xs font-medium text-foreground">{AGENT_LABELS[agent]}</span>

        {status === "analyzing" && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" />
            thinking…
          </span>
        )}
        {status === "debating" && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-indigo-500">
            <span className="size-1.5 rounded-full bg-indigo-500 animate-pulse" />
            debating…
          </span>
        )}
        {topFinding && status === "done" && (
          <Badge variant={SEVERITY_VARIANT[topFinding.severity]} className="ml-auto text-[9px] px-1.5 py-0">
            {topFinding.severity}
          </Badge>
        )}
      </div>

      {status === "idle" && (
        <p className="text-xs text-muted-foreground/60">Waiting for review to start…</p>
      )}

      {(status === "analyzing" || status === "debating") && !response && (
        <p className="text-xs text-muted-foreground flex items-center gap-0.5">
          Analyzing code
          <span className="inline-block w-[2px] h-3 bg-muted-foreground ml-0.5 animate-pulse" />
        </p>
      )}

      {response && (
        <div className="space-y-1.5">
          {response.findings.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No issues in this domain.</p>
          ) : (
            response.findings.map((f, i) => (
              <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                <span className={`font-medium ${colors.text}`}>[{f.severity}]</span> {f.issue}
              </p>
            ))
          )}
        </div>
      )}
    </div>
  )
}