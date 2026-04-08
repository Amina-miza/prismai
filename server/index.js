import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import OpenAI from 'openai'
import { getHistoricalInsight } from './historicalData.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 8787

app.use(cors())
app.use(express.json({ limit: '2mb' }))

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const systemPrompt = `
You are PRISM AI, an expert pull request reviewer.
Return ONLY valid JSON with this exact shape:
{
  "summary": "string",
  "issues": [
    {
      "type": "bug | security | performance",
      "description": "string",
      "severity": "low | medium | high"
    }
  ],
  "intent_match": {
    "status": "matched | partial | mismatch",
    "reason": "string"
  },
  "risk_score": {
    "score": number between 0 and 10,
    "reasoning": "string"
  },
  "verdict": "Approve | Needs Changes"
}
No markdown, no extra keys, no explanation outside JSON.
`

function safeParseAnalysis(text) {
  const parsed = JSON.parse(text)

  return {
    summary: parsed.summary || 'No summary generated.',
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    intent_match: {
      status: parsed.intent_match?.status || 'partial',
      reason: parsed.intent_match?.reason || 'Insufficient context.',
    },
    risk_score: {
      score: Math.max(0, Math.min(10, Number(parsed.risk_score?.score ?? 5))),
      reasoning: parsed.risk_score?.reasoning || 'No risk reasoning provided.',
    },
    verdict: parsed.verdict === 'Approve' ? 'Approve' : 'Needs Changes',
  }
}

app.post('/api/analyze-pr', async (req, res) => {
  try {
    const { title = '', description = '', diff = '' } = req.body || {}

    if (!title.trim() || !description.trim() || !diff.trim()) {
      return res.status(400).json({
        error: 'PR title, description, and code diff are required.',
      })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'OPENAI_API_KEY is missing. Add it to .env and restart server.',
      })
    }

    const userPrompt = `
PR Title:
${title}

PR Description:
${description}

Code Diff / Code Changes:
${diff}

Analyze this pull request with intent-aware reasoning:
1) Summarize the PR.
2) Detect bugs, bad practices, and security/performance risks.
3) Compare intended outcome vs actual changes.
4) Flag contradictions between stated intent and code behavior.
5) Assign risk score considering critical files, issue severity, and intent mismatch.
6) Return final verdict.
`

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      throw new Error('Model returned an empty response.')
    }

    const analysis = safeParseAnalysis(raw)
    const historicalInsight = getHistoricalInsight(
      `${title}\n${description}\n${diff}`,
    )

    return res.json({
      analysis,
      historicalInsight,
    })
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Unable to analyze PR right now.',
    })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(port, () => {
  console.log(`PRISM AI backend running on http://localhost:${port}`)
})
