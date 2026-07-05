// server.ts
// Express server exposing the council review endpoint via SSE streaming.
// Uses POST + manual SSE (not native EventSource) because EventSource only
// supports GET, and we need to send the code payload in the request body.

import express from "express"
import cors from "cors"
import "dotenv/config"
import { runCouncil, StreamEvent } from "./agents/orchestrator"
import { OutputLanguage } from "./agents/prompts"
import { saveReview, getRecentReviews } from "./db"

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: "1mb" }))

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", model: process.env.QWEN_MODEL })
})

app.post("/api/review", async (req, res) => {
  const { code, language } = req.body as { code?: string; language?: OutputLanguage }

  if (!code || typeof code !== "string" || code.trim().length === 0) {
    res.status(400).json({ error: "Missing 'code' in request body" })
    return
  }
  if (code.length > 20000) {
    res.status(400).json({ error: "Code too long (max 20000 characters)" })
    return
  }

  // SSE headers — keep the connection open and flush each event immediately
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })

  const sendEvent = (event: StreamEvent | { type: "result"; result: unknown }) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }

  // Heartbeat comment every 15s so proxies/load balancers don't kill an idle connection
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15000)

  try {
    const result = await runCouncil(code, language || "en", sendEvent)
    saveReview(code, language || "en", result)
    sendEvent({ type: "result", result })
  } catch (err: any) {
    sendEvent({ type: "error", message: err.message || "Unknown error during council review" })
  } finally {
    clearInterval(heartbeat)
    res.end()
  }
})

app.get("/api/history", (_req, res) => {
  const reviews = getRecentReviews(20)
  res.json(reviews)
})

app.listen(PORT, () => {
  console.log(`🏛️  The Council backend running on http://localhost:${PORT}`)
  console.log(`   Model: ${process.env.QWEN_MODEL}`)
})