// ModeratorVerdict.tsx
// Displays the Moderator's final synthesis: verdict text, priority-ordered
// action list, and any conflict resolutions reached during debate.

import type { ModeratorVerdict as ModeratorVerdictType } from "../types"

interface ModeratorVerdictProps {
  verdict: ModeratorVerdictType | null
  isThinking: boolean
}

export function ModeratorVerdict({ verdict, isThinking }: ModeratorVerdictProps) {
  if (!verdict && !isThinking) return null

  return (
    <div className="mx-3 mt-2 mb-2 p-3 rounded-lg bg-violet-50 border border-violet-200">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-4.5 h-4.5 rounded-full bg-violet-500 text-white text-[8px] flex items-center justify-center">
          M
        </div>
        <span className="text-xs font-medium text-violet-900">
          {isThinking ? "Moderator deliberating…" : "Moderator — verdict"}
        </span>
      </div>

      {isThinking && !verdict && (
        <p className="text-xs text-violet-500 italic">Synthesizing council findings…</p>
      )}

      {verdict && (
        <div className="space-y-2.5">
          <p className="text-xs text-violet-800 leading-relaxed">{verdict.verdict}</p>

          {verdict.priority_order.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-violet-400 mb-1">
                Priority order
              </p>
              <ol className="space-y-0.5">
                {verdict.priority_order.map((item, i) => (
                  <li key={i} className="text-xs text-violet-700 flex gap-1.5">
                    <span className="font-medium">{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {verdict.resolved_conflicts.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-violet-400 mb-1">
                Resolved conflicts
              </p>
              <div className="space-y-1.5">
                {verdict.resolved_conflicts.map((rc, i) => (
                  <div key={i} className="text-xs text-violet-700 leading-relaxed">
                    <span className="font-medium">{rc.conflict}</span>
                    <p className="text-violet-600 mt-0.5">{rc.resolution}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}