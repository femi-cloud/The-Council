// extension.ts
// Entry point for The Council VS Code extension. Registers a command that sends
// the active selection (or whole file) to the existing backend, then renders
// the council's findings in a webview panel.

import * as vscode from "vscode"

interface Finding {
  severity: "critical" | "high" | "medium" | "low"
  issue: string
  reasoning: string
}

interface AgentResponse {
  agent: string
  findings: Finding[]
  overall_take: string
}

interface CouncilResult {
  debateRound: AgentResponse[]
  conflicts: { agentA: string; agentB: string; description: string }[]
  moderatorVerdict: {
    verdict: string
    priority_order: string[]
    resolved_conflicts: { conflict: string; resolution: string }[]
  }
  metrics: {
    totalFindings: number
    soloBaseline: number
    conflictCount: number
    durationMs: number
  }
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("council.reviewSelection", async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showErrorMessage("The Council: open a file first.")
      return
    }

    const selection = editor.selection
    const code = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection)

    if (code.trim().length === 0) {
      vscode.window.showErrorMessage("The Council: nothing to review — the file is empty.")
      return
    }

    const config = vscode.workspace.getConfiguration("council")
    const apiUrl = config.get<string>("apiUrl", "http://localhost:3001")
    const language = config.get<string>("outputLanguage", "en")

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "The Council is reviewing your code…",
        cancellable: false,
      },
      async () => {
        try {
          const result = await runReview(apiUrl, code, language)
          showResultsPanel(context, result)
        } catch (err: any) {
          vscode.window.showErrorMessage(`The Council: ${err.message || "review failed"}`)
        }
      }
    )
  })

  context.subscriptions.push(disposable)
}

// Consumes the backend's SSE stream and returns only the final "result" payload —
// the extension doesn't need live agent-by-agent streaming like the web app does.
async function runReview(apiUrl: string, code: string, language: string): Promise<CouncilResult> {
  const response = await fetch(`${apiUrl}/api/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, language }),
  })

  if (!response.ok || !response.body) {
    throw new Error(`Backend returned HTTP ${response.status}. Is it running at ${apiUrl}?`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split("\n\n")
    buffer = events.pop() || ""

    for (const raw of events) {
      const line = raw.trim()
      if (!line.startsWith("data:")) continue
      const jsonStr = line.slice(5).trim()
      try {
        const parsed = JSON.parse(jsonStr)
        if (parsed.type === "result") return parsed.result as CouncilResult
        if (parsed.type === "error") throw new Error(parsed.message)
      } catch {
        // ignore malformed chunks
      }
    }
  }

  throw new Error("Stream ended without a final result.")
}

function showResultsPanel(context: vscode.ExtensionContext, result: CouncilResult) {
  const panel = vscode.window.createWebviewPanel(
    "councilResults",
    "The Council — review",
    vscode.ViewColumn.Beside,
    { enableScripts: false }
  )
  panel.webview.html = renderHtml(result)
}

function renderHtml(result: CouncilResult): string {
  const agentSection = result.debateRound
    .map((agent) => {
      const findings = agent.findings.length
        ? agent.findings
            .map((f) => `<p><span class="sev sev-${f.severity}">[${f.severity}]</span> ${escapeHtml(f.issue)}</p>`)
            .join("")
        : `<p class="muted">No issues in this domain.</p>`
      return `
        <div class="agent-card">
          <h3>${escapeHtml(agent.agent)}</h3>
          ${findings}
        </div>
      `
    })
    .join("")

  const conflicts = result.conflicts.length
    ? result.conflicts
        .map((c) => `<p class="conflict">⚠ ${escapeHtml(c.agentA)} vs ${escapeHtml(c.agentB)} — ${escapeHtml(c.description)}</p>`)
        .join("")
    : ""

  const priorityList = result.moderatorVerdict.priority_order
    .map((p) => `<li>${escapeHtml(p)}</li>`)
    .join("")

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: -apple-system, sans-serif; padding: 20px; color: var(--vscode-foreground); }
  h2, h3 { font-weight: 600; }
  .agent-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .agent-card { border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 12px; }
  .sev { font-weight: 600; margin-right: 4px; }
  .sev-critical { color: #e24b4a; }
  .sev-high { color: #ef9f27; }
  .sev-medium, .sev-low { color: #888; }
  .muted { opacity: 0.6; font-style: italic; }
  .conflict { background: rgba(226,75,74,0.1); border-radius: 6px; padding: 8px; margin: 4px 0; }
  .moderator { background: rgba(127,119,221,0.1); border-radius: 8px; padding: 16px; margin-top: 16px; }
  .metrics { display: flex; gap: 24px; margin-top: 16px; font-size: 13px; opacity: 0.8; }
</style>
</head>
<body>
  <h2>Council review</h2>
  <div class="agent-grid">${agentSection}</div>
  ${conflicts}
  <div class="moderator">
    <h3>Moderator verdict</h3>
    <p>${escapeHtml(result.moderatorVerdict.verdict)}</p>
    <ol>${priorityList}</ol>
  </div>
  <div class="metrics">
    <span>${result.metrics.totalFindings} findings</span>
    <span>+${result.metrics.totalFindings - result.metrics.soloBaseline} vs solo</span>
    <span>${result.metrics.conflictCount} conflicts</span>
    <span>${(result.metrics.durationMs / 1000).toFixed(1)}s</span>
  </div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

export function deactivate() {}