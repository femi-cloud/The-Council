// db/index.ts
// Lightweight SQLite persistence for review history. One file, no server to run,
// no external service — keeps the "database" honest without adding deployment risk.

import Database from "better-sqlite3"
import path from "path"
import type { CouncilResult } from "../agents/orchestrator"
import type { OutputLanguage } from "../agents/prompts"

const DB_PATH = path.join(__dirname, "..", "council.db")
const db = new Database(DB_PATH)

db.pragma("journal_mode = WAL")

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    language TEXT NOT NULL,
    result_json TEXT NOT NULL,
    total_findings INTEGER NOT NULL,
    solo_baseline INTEGER NOT NULL,
    conflict_count INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

export interface ReviewRecord {
  id: number
  code: string
  language: OutputLanguage
  result: CouncilResult
  created_at: string
}

export function saveReview(code: string, language: OutputLanguage, result: CouncilResult): number {
  const stmt = db.prepare(`
    INSERT INTO reviews (code, language, result_json, total_findings, solo_baseline, conflict_count, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const info = stmt.run(
    code,
    language,
    JSON.stringify(result),
    result.metrics.totalFindings,
    result.metrics.soloBaseline,
    result.metrics.conflictCount,
    result.metrics.durationMs
  )
  return info.lastInsertRowid as number
}

export function getRecentReviews(limit = 20): ReviewRecord[] {
  const rows = db
    .prepare(`SELECT * FROM reviews ORDER BY id DESC LIMIT ?`)
    .all(limit) as any[]

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    language: row.language,
    result: JSON.parse(row.result_json),
    created_at: row.created_at,
  }))
}

export function getReviewById(id: number): ReviewRecord | null {
  const row = db.prepare(`SELECT * FROM reviews WHERE id = ?`).get(id) as any
  if (!row) return null
  return {
    id: row.id,
    code: row.code,
    language: row.language,
    result: JSON.parse(row.result_json),
    created_at: row.created_at,
  }
}

export default db