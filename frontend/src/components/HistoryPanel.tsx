// HistoryPanel.tsx
// Slide-over panel listing past reviews from the SQLite-backed /api/history endpoint.
// Clicking an entry loads that review's code and results back into the main view.

import { useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { History } from "lucide-react"
import type { ReviewRecord } from "../types"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

interface HistoryPanelProps {
  onSelect: (review: ReviewRecord) => void
  refreshKey: number // bump this after each new review to trigger a refetch
}

export function HistoryPanel({ onSelect, refreshKey }: HistoryPanelProps) {
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`${API_URL}/api/history`)
      .then((res) => res.json())
      .then((data) => setReviews(data))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false))
  }, [open, refreshKey])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="size-8" aria-label="Review history" />
        }
      >
        <History className="size-4" />
      </SheetTrigger>
      <SheetContent side="right" className="w-[380px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle>Review history</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-2 overflow-y-auto px-4 pb-4">
          {loading && <p className="text-xs text-muted-foreground">Loading…</p>}

          {!loading && reviews.length === 0 && (
            <p className="text-xs text-muted-foreground">No reviews yet — run the council once.</p>
          )}

          {reviews.map((r) => {
            const preview = r.code.trim().split("\n")[0].slice(0, 60)
            const date = new Date(r.created_at).toLocaleString()

            return (
              <button
                key={r.id}
                onClick={() => {
                  onSelect(r)
                  setOpen(false)
                }}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <p className="text-xs font-mono text-foreground truncate">{preview}…</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">
                    {r.result.metrics.totalFindings} findings
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {r.result.metrics.conflictCount} conflicts
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {r.language.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">{date}</p>
              </button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}