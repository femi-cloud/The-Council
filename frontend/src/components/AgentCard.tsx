// AgentCard.tsx
// One quadrant of the debate grid: shows the agent's avatar, current status,
// and its findings once available. Shows a blinking cursor while "analyzing".

import type { AgentResponse, AgentRole, AgentStatus } from "../types"
import { AGENT_LABELS, AGENT_COLORS } from "../types"

interface AgentCardProps {
  agent: AgentRole
  status: AgentStatus
  response: AgentResponse | null
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-amber-100 text-amber-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-gray-100 text-gray-600",
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
    <div className="p-3 border-b border-r border-gray-200 last:border-r-0">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium ${colors.avatarBg} ${colors.text}`}
        >
          {AGENT_INITIALS[agent]}
        </div>
        <span className="text-xs font-medium text-gray-900">{AGENT_LABELS[agent]}</span>

        {status === "analyzing" && (
          <span className="ml-auto text-[10px] text-gray-400 animate-pulse">thinking…</span>
        )}
        {status === "debating" && (
          <span className="ml-auto text-[10px] text-indigo-500 animate-pulse">debating…</span>
        )}
        {topFinding && status === "done" && (
          <span
            className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
              SEVERITY_STYLES[topFinding.severity]
            }`}
          >
            {topFinding.severity}
          </span>
        )}
      </div>

      {status === "idle" && (
        <p className="text-xs text-gray-300">Waiting for review to start…</p>
      )}

      {(status === "analyzing" || status === "debating") && !response && (
        <p className="text-xs text-gray-400">
          Analyzing code
          <span className="inline-block w-0.5 h-3 bg-gray-400 ml-0.5 align-middle animate-pulse" />
        </p>
      )}

      {response && (
        <div className="space-y-1.5">
          {response.findings.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No issues in this domain.</p>
          ) : (
            response.findings.map((f, i) => (
              <p key={i} className="text-xs text-gray-600 leading-relaxed">
                <span className={`font-medium ${colors.text}`}>[{f.severity}]</span> {f.issue}
              </p>
            ))
          )}
        </div>
      )}
    </div>
  )
}