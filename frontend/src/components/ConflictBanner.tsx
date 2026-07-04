// ConflictBanner.tsx
// Shown when a genuine conflict is detected between two agents.
// If multiple conflicts exist, they're stacked (rare, but the council can find more than one).

import type { Conflict } from "../types"
import { AGENT_LABELS } from "../types"
import { AlertTriangle } from "lucide-react"

interface ConflictBannerProps {
  conflicts: Conflict[]
}

export function ConflictBanner({ conflicts }: ConflictBannerProps) {
  if (conflicts.length === 0) return null

  return (
    <div className="mx-3 mt-2 space-y-2">
      {conflicts.map((c, i) => (
        <div
          key={i}
          className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 flex gap-2 items-start"
        >
          <AlertTriangle className="size-3.5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive leading-relaxed">
            <span className="font-medium">Conflict detected</span> —{" "}
            {AGENT_LABELS[c.agentA]} vs {AGENT_LABELS[c.agentB]}: {c.description}
          </p>
        </div>
      ))}
    </div>
  )
}