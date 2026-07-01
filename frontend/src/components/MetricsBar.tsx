// MetricsBar.tsx
// Bottom bar showing the review's key numbers — this is the "proof" strip
// judges look at to see the council's value over a single-agent baseline.

interface MetricsBarProps {
  totalFindings: number
  soloBaseline: number | null // findings a single agent found on the same code, if benchmarked
  conflictCount: number
  durationMs: number | null
}

export function MetricsBar({ totalFindings, soloBaseline, conflictCount, durationMs }: MetricsBarProps) {
  const delta = soloBaseline !== null ? totalFindings - soloBaseline : null
  const durationLabel = durationMs !== null ? `${(durationMs / 1000).toFixed(1)}s` : "—"

  return (
    <div className="flex border-t border-gray-200 px-3 py-2">
      <Metric value={totalFindings} label="Findings" />
      <Metric
        value={delta !== null ? (delta >= 0 ? `+${delta}` : `${delta}`) : "—"}
        label="vs solo"
        positive={delta !== null && delta > 0}
      />
      <Metric value={conflictCount} label="Conflicts" />
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
      <div className={`text-base font-medium ${positive ? "text-emerald-600" : "text-gray-900"}`}>
        {value}
      </div>
      <div className="text-[10px] text-gray-400">{label}</div>
    </div>
  )
}