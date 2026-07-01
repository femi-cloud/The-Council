// CodeInput.tsx
// Left panel: code textarea, language toggle (EN/FR output), and the run button.

import type { OutputLanguage } from "../types"

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
    <div className="flex flex-col h-full border-r border-gray-200">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Code input
        </span>
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => onLanguageChange("en")}
            className={`px-2 py-0.5 rounded-full transition-colors ${
              language === "en" ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => onLanguageChange("fr")}
            className={`px-2 py-0.5 rounded-full transition-colors ${
              language === "fr" ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            FR
          </button>
        </div>
      </div>

      <textarea
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        placeholder="Paste your JavaScript, TypeScript, Python, or C code here..."
        spellCheck={false}
        className="flex-1 p-4 font-mono text-[13px] leading-relaxed text-gray-700 resize-none outline-none placeholder:text-gray-300"
        disabled={isRunning}
      />

      <div className="flex gap-2 px-4 py-3 border-t border-gray-200">
        <button
          onClick={onClear}
          disabled={isRunning}
          className="flex-1 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          Clear
        </button>
        <button
          onClick={onRun}
          disabled={isRunning || code.trim().length === 0}
          className="flex-1 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors"
        >
          {isRunning ? "Council in session…" : "Run council"}
        </button>
      </div>
    </div>
  )
}