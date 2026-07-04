// App.tsx
// Top-level component: owns all review state, drives the SSE stream consumption,
// and lays out the debate view (code input on the left, agent grid + verdict on the right).

import { useState, useCallback } from "react"
import type { AgentRole, AgentResponse, AgentStatus, Conflict, ModeratorVerdict as ModeratorVerdictType, OutputLanguage, StreamEvent } from "./types"
import { CodeInput } from "./components/CodeInput"
import { AgentCard } from "./components/AgentCard"
import { ConflictBanner } from "./components/ConflictBanner"
import { ModeratorVerdict } from "./components/ModeratorVerdict"
import { MetricsBar } from "./components/MetricsBar"
import { ThemeToggle } from "./components/ThemeToggle"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./components/ui/resizable"
import { useMediaQuery } from "./hooks/useMediaQuery"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"
const AGENT_ORDER: AgentRole[] = ["security", "performance", "readability", "architect"]

const initialStatuses: Record<AgentRole, AgentStatus> = {
  security: "idle",
  performance: "idle",
  readability: "idle",
  architect: "idle",
}

const initialResponses: Record<AgentRole, AgentResponse | null> = {
  security: null,
  performance: null,
  readability: null,
  architect: null,
}

export default function App() {
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState<OutputLanguage>("en")
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const [agentStatuses, setAgentStatuses] = useState(initialStatuses)
  const [agentResponses, setAgentResponses] = useState(initialResponses)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [moderatorVerdict, setModeratorVerdict] = useState<ModeratorVerdictType | null>(null)
  const [moderatorThinking, setModeratorThinking] = useState(false)
  const [metrics, setMetrics] = useState<{
    totalFindings: number
    soloBaseline: number
    conflictCount: number
    durationMs: number
  } | null>(null)

  const resetState = useCallback(() => {
    setAgentStatuses(initialStatuses)
    setAgentResponses(initialResponses)
    setConflicts([])
    setModeratorVerdict(null)
    setModeratorThinking(false)
    setMetrics(null)
    setError(null)
  }, [])

  const handleEvent = useCallback((event: StreamEvent) => {
    switch (event.type) {
      case "agent_start":
        setAgentStatuses((prev) => ({ ...prev, [event.agent]: "analyzing" }))
        break

      case "agent_done":
        setAgentStatuses((prev) => ({ ...prev, [event.agent]: "done" }))
        setAgentResponses((prev) => ({ ...prev, [event.agent]: event.response }))
        break

      case "debate_start":
        // Security and Performance are always the guaranteed debaters (see orchestrator.ts).
        // Other agents may also join, but we only find out for sure via debate_done.
        setAgentStatuses((prev) => ({
          ...prev,
          security: "debating",
          performance: "debating",
        }))
        break

      case "debate_done":
        setAgentStatuses((prev) => {
          const next = { ...prev }
          event.responses.forEach((r) => {
            next[r.agent] = "done"
          })
          return next
        })
        setAgentResponses((prev) => {
          const next = { ...prev }
          event.responses.forEach((r) => {
            next[r.agent] = r
          })
          return next
        })
        break

      case "moderator_start":
        setModeratorThinking(true)
        break

      case "moderator_done":
        setModeratorThinking(false)
        setModeratorVerdict(event.verdict)
        break

      case "result":
        // Final, post-debate conflict list and metrics — more accurate than the
        // noisy initial scan, which is only used server-side to decide who debates.
        setConflicts(event.result.conflicts)
        setMetrics(event.result.metrics)
        break

      case "error":
        setError(event.message)
        break

      // "conflicts_detected" is intentionally not handled here — it reflects the
      // noisy pre-debate scan and would flash misleading banners in the UI.
    }
  }, [])

  const runCouncil = useCallback(async () => {
    if (!code.trim() || isRunning) return

    resetState()
    setIsRunning(true)

    try {
      const response = await fetch(`${API_URL}/api/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      })

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({ error: "Request failed" }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split("\n\n")
        buffer = events.pop() || "" // last chunk may be incomplete, keep it for next read

        for (const raw of events) {
          const line = raw.trim()
          if (!line.startsWith("data:")) continue // skip heartbeat comments and blank lines
          const jsonStr = line.slice(5).trim()
          try {
            const parsed: StreamEvent = JSON.parse(jsonStr)
            handleEvent(parsed)
          } catch {
            // Ignore malformed chunks rather than crashing the whole stream
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Connection to the council failed")
    } finally {
      setIsRunning(false)
    }
  }, [code, language, isRunning, resetState, handleEvent])

  const handleClear = useCallback(() => {
    setCode("")
    resetState()
  }, [resetState])

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 px-5 py-3 border-b border-border bg-card">
        <span className="text-sm font-medium text-foreground">
          The <span className="text-indigo-600 dark:text-indigo-400">Council</span>
        </span>
        <span className="hidden sm:inline text-xs text-muted-foreground">JS/TS · Python · C</span>
        <div className="ml-auto flex items-center gap-2">
          {isRunning && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              Debating
            </span>
          )}
          {!isRunning && metrics && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Done
            </span>
          )}
          <ThemeToggle />
        </div>
      </header>

      {error && (
        <div className="px-5 py-2 bg-destructive/10 border-b border-destructive/30 text-xs text-destructive">
          {error}
        </div>
      )}

      <main className="flex-1 min-h-0">
        <ResizablePanelGroup orientation={isDesktop ? "horizontal" : "vertical"}>
          <ResizablePanel defaultSize={isDesktop ? 45 : 50} minSize={isDesktop ? 25 : 20}>
            <CodeInput
              code={code}
              onCodeChange={setCode}
              language={language}
              onLanguageChange={setLanguage}
              onRun={runCouncil}
              onClear={handleClear}
              isRunning={isRunning}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={55} minSize={30}>
            <div className="flex flex-col h-full min-h-0 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {AGENT_ORDER.map((agent) => (
                  <AgentCard
                    key={agent}
                    agent={agent}
                    status={agentStatuses[agent]}
                    response={agentResponses[agent]}
                  />
                ))}
              </div>

              <ConflictBanner conflicts={conflicts} />
              <ModeratorVerdict verdict={moderatorVerdict} isThinking={moderatorThinking} />

              {metrics && (
                <div className="mt-auto">
                  <MetricsBar
                    totalFindings={metrics.totalFindings}
                    soloBaseline={metrics.soloBaseline}
                    conflictCount={metrics.conflictCount}
                    durationMs={metrics.durationMs}
                  />
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  )
}