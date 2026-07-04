// MetricsBar.tsx
// Bottom bar showing the review's key numbers — this is the "proof" strip
// judges look at to see the council's value over a single-agent baseline.

import { Separator } from "../components/ui/separator"

interface MetricsBarProps {
  totalFindings: number
  soloBaseline: number | null
  conflictCount: number
  durationMs: number | null
}

export function MetricsBar({ totalFindings, soloBaseline, conflictCount, durationMs }: MetricsBarProps) {
  const delta = soloBaseline !== null ? totalFindings - soloBaseline : null
  const durationLabel = durationMs !== null ? `${(durationMs / 1000).toFixed(1)}s` : "—"

  return (
    <div className="flex items-stretch border-t border-border bg-card px-3 py-2.5">
      <Metric value={totalFindings} label="Findings" />
      <Separator orientation="vertical" className="h-8 self-center" />
      <Metric
        value={delta !== null ? (delta >= 0 ? `+${delta}` : `${delta}`) : "—"}
        label="vs solo"
        positive={delta !== null && delta > 0}
      />
      <Separator orientation="vertical" className="h-8 self-center" />
      <Metric value={conflictCount} label="Conflicts" />
      <Separator orientation="vertical" className="h-8 self-center" />
      <Metric value={durationLabel} label="Duration" />
    </div>
  )
}

function Metric({
  value,
  label,
  positive,
}: {
  value: string | number
  label: string
  positive?: boolean
}) {
  return (
    <div className="flex-1 text-center">
      <div className={`text-base font-semibold ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}