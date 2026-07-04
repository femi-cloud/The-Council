// CodeInput.tsx
// Left panel: code textarea, output-language toggle, and the run button.
// Uses shadcn/ui Button + Textarea for consistent, polished styling.

import type { OutputLanguage } from "../types"
import { Button } from "../components/ui/button"
import { Textarea } from "../components/ui/textarea"
import { Play } from "lucide-react"

interface CodeInputProps {
  code: string
  onCodeChange: (code: string) => void
  language: OutputLanguage
  onLanguageChange: (lang: OutputLanguage) => void
  onRun: () => void
  onClear: () => void
  isRunning: boolean
}

export function CodeInput({
  code,
  onCodeChange,
  language,
  onLanguageChange,
  onRun,
  onClear,
  isRunning,
}: CodeInputProps) {
  return (
    <div className="flex flex-col h-full border-r border-border bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Code input
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Review output:</span>
          <div className="flex items-center gap-0.5 rounded-full bg-muted p-0.5">
            <Button
              size="sm"
              variant={language === "en" ? "default" : "ghost"}
              className="h-6 px-2.5 text-xs rounded-full shadow-none"
              onClick={() => onLanguageChange("en")}
            >
              EN
            </Button>
            <Button
              size="sm"
              variant={language === "fr" ? "default" : "ghost"}
              className="h-6 px-2.5 text-xs rounded-full shadow-none"
              onClick={() => onLanguageChange("fr")}
            >
              FR
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-3 bg-muted/30 min-h-0">
        <Textarea
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder="Paste your JavaScript, TypeScript, Python, or C code here..."
          spellCheck={false}
          disabled={isRunning}
          className="h-full resize-none font-mono text-[13px] leading-relaxed bg-background shadow-sm"
        />
      </div>

      <div className="flex gap-2 px-4 py-3 border-t border-border">
        <Button variant="outline" onClick={onClear} disabled={isRunning} className="flex-1">
          Clear
        </Button>
        <Button
          onClick={onRun}
          disabled={isRunning || code.trim().length === 0}
          className="flex-1 gap-1.5"
        >
          <Play className="size-3.5" />
          {isRunning ? "Council in session…" : "Run council"}
        </Button>
      </div>
    </div>
  )
}