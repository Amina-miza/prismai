# PRISM AI - Pull Request Intelligent Scoring & Monitoring

PRISM AI is a hackathon-ready AI code review co-pilot that transforms pull request details into structured, decision-oriented insights.

## Features

- AI-powered PR analysis from title, description, and code diff
- Strict structured output:
  - summary
  - issues (bug/security/performance with severity)
  - intent match
  - risk score (0-10)
  - final verdict
- Historical Insight section from a simulated learnings dataset
- Polished SaaS-style dashboard with loading states, animations, and visual cards

## Tech Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- AI: OpenAI API

## Local Run (VS Code)

1. Open the folder in VS Code:
   - `C:\Users\LENOVO\prism-ai`
2. Install dependencies:
   - `npm install`
3. Create `.env` from `.env.example` and add your API key:
   - `OPENAI_API_KEY=...`
4. Run frontend + backend together:
   - `npm run dev:full`
5. Open:
   - `http://localhost:5173`

## API Contract

`POST /api/analyze-pr`

Request body:

```json
{
  "title": "string",
  "description": "string",
  "diff": "string"
}
```

Response body:

```json
{
  "analysis": {
    "summary": "...",
    "issues": [
      { "type": "bug", "description": "...", "severity": "high" }
    ],
    "intent_match": {
      "status": "partial",
      "reason": "..."
    },
    "risk_score": {
      "score": 7.8,
      "reasoning": "..."
    },
    "verdict": "Needs Changes"
  },
  "historicalInsight": {
    "related": true,
    "message": "authentication: login failures (high risk)",
    "matches": [
      { "area": "authentication", "issue": "login failures", "risk": "high" }
    ]
  }
}
```
