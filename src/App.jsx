import { useMemo, useState } from 'react'

const defaultForm = {
  title: '',
  description: '',
  diff: '',
}

const demoPresets = [
  {
    id: 'auth-hardening',
    label: 'Auth Hardening',
    title: 'Improve authentication middleware token validation',
    description:
      'Tighten auth checks to prevent unauthorized access and reduce session abuse. Adds stricter JWT checks and role validation.',
    diff: `diff --git a/src/middleware/auth.js b/src/middleware/auth.js
@@
-const decoded = jwt.verify(token, process.env.JWT_SECRET);
-req.user = decoded;
+const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
+if (!decoded?.sub || !decoded?.role) {
+  return res.status(401).json({ error: "Invalid token payload" });
+}
+if (!["admin", "maintainer", "user"].includes(decoded.role)) {
+  return res.status(403).json({ error: "Role not allowed" });
+}
+req.user = { id: decoded.sub, role: decoded.role };
 next();`,
  },
  {
    id: 'db-pagination',
    label: 'DB Pagination',
    title: 'Optimize users endpoint with pagination and sorting',
    description:
      'Prevents loading all users into memory by using SQL pagination. Adds index-friendly sorting.',
    diff: `diff --git a/src/routes/users.js b/src/routes/users.js
@@
-const users = await db.query("SELECT * FROM users");
-res.json(users.rows);
+const limit = Math.min(Number(req.query.limit || 25), 100);
+const offset = Number(req.query.offset || 0);
+const users = await db.query(
+  "SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
+  [limit, offset]
+);
+res.json({ count: users.rowCount, items: users.rows });`,
  },
  {
    id: 'payment-refactor',
    label: 'Payment Refactor',
    title: 'Refactor payment confirmation flow',
    description:
      'Simplifies payment confirmation logic and retries webhooks when transient failures happen.',
    diff: `diff --git a/src/services/payment.js b/src/services/payment.js
@@
-if (status === "success") markPaid(orderId);
+if (status === "success" || status === "pending") {
+  markPaid(orderId);
+}
+
+for (let retry = 0; retry < 3; retry++) {
+  await sendWebhook(orderId);
+}`,
  },
]

const severityColors = {
  high: 'border-red-500/40 bg-red-500/10 text-red-200',
  medium: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200',
  low: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
}

const intentColors = {
  matched: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  partial: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  mismatch: 'bg-red-500/20 text-red-300 border-red-500/40',
}

function App() {
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const riskProgress = useMemo(() => {
    const score = result?.analysis?.risk_score?.score ?? 0
    return Math.max(0, Math.min(100, (score / 10) * 100))
  }, [result])

  const onChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
  }

  const applyPreset = (presetId) => {
    const selectedPreset = demoPresets.find((preset) => preset.id === presetId)
    if (!selectedPreset) {
      return
    }

    setForm({
      title: selectedPreset.title,
      description: selectedPreset.description,
      diff: selectedPreset.diff,
    })
    setError('')
    setResult(null)
  }

  const analyzePr = async () => {
    setError('')
    setResult(null)
    setLoading(true)

    try {
      const response = await fetch('/api/analyze-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload.error || 'Failed to analyze PR.')
      }

      const payload = await response.json()
      setResult(payload)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 md:px-8">
      <header className="mb-8 text-center">
        <p className="mb-3 inline-flex rounded-full border border-indigo-400/40 bg-indigo-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
          PR Analysis Dashboard
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
          PRISM AI
        </h1>
        <p className="mt-3 text-sm text-slate-300 md:text-base">
          Decision-Oriented Code Review Co-Pilot
        </p>
      </header>

      <section className="glass-card mb-8 p-6 md:p-8">
        <h2 className="mb-5 text-xl font-semibold text-white">Analyze Pull Request</h2>
        <div className="grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-200">Demo Presets (One-Click)</span>
            <select
              defaultValue=""
              onChange={(event) => applyPreset(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="" disabled>
                Choose a preset to auto-fill inputs
              </option>
              {demoPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-200">PR Title</span>
            <input
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Example: Refactor auth middleware for token validation"
              value={form.title}
              onChange={onChange('title')}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-200">PR Description</span>
            <textarea
              rows={4}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Describe goals, context, and expected behavior."
              value={form.description}
              onChange={onChange('description')}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-200">Code Diff / Changes</span>
            <textarea
              rows={12}
              className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 font-mono text-xs text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="+ if (user) {&#10;+   login(user);&#10;+ }"
              value={form.diff}
              onChange={onChange('diff')}
            />
          </label>

          <button
            onClick={analyzePr}
            disabled={loading}
            className="mt-1 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-900/40 transition hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Analyzing PR with AI...' : 'Analyze PR'}
          </button>
        </div>
      </section>

      {loading && (
        <section className="glass-card mb-8 flex items-center justify-center gap-3 p-8 text-slate-200 fade-up">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-500 border-t-indigo-400" />
          <p className="text-sm md:text-base">Analyzing PR with AI...</p>
        </section>
      )}

      {error && (
        <section className="mb-8 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200 fade-up">
          {error}
        </section>
      )}

      {result?.analysis && (
        <section className="grid gap-5 pb-10 md:grid-cols-2">
          <article className="glass-card p-6 fade-up md:col-span-2">
            <h3 className="mb-2 text-lg font-semibold text-white">📄 Summary</h3>
            <p className="text-sm leading-6 text-slate-200">{result.analysis.summary}</p>
          </article>

          <article className="glass-card p-6 fade-up">
            <h3 className="mb-3 text-lg font-semibold text-white">⚠️ Issues</h3>
            <div className="space-y-3">
              {result.analysis.issues.map((issue, index) => (
                <div
                  key={`${issue.type}-${index}`}
                  className={`rounded-xl border p-3 ${severityColors[issue.severity]}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    {issue.type} · {issue.severity}
                  </p>
                  <p className="mt-1 text-sm">{issue.description}</p>
                </div>
              ))}
              {result.analysis.issues.length === 0 && (
                <p className="text-sm text-slate-300">No high-confidence issues detected.</p>
              )}
            </div>
          </article>

          <article className="glass-card p-6 fade-up">
            <h3 className="mb-3 text-lg font-semibold text-white">🎯 Intent Match</h3>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${intentColors[result.analysis.intent_match.status]}`}
            >
              {result.analysis.intent_match.status}
            </span>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              {result.analysis.intent_match.reason}
            </p>
          </article>

          <article className="glass-card p-6 fade-up">
            <h3 className="mb-3 text-lg font-semibold text-white">📊 Risk Score</h3>
            <p className="text-4xl font-bold text-white">
              {result.analysis.risk_score.score}
              <span className="text-lg text-slate-300">/10</span>
            </p>
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 transition-all duration-700"
                style={{ width: `${riskProgress}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-slate-200">{result.analysis.risk_score.reasoning}</p>
          </article>

          <article className="glass-card p-6 fade-up">
            <h3 className="mb-3 text-lg font-semibold text-white">✅ Verdict</h3>
            <p
              className={`text-3xl font-extrabold ${
                result.analysis.verdict === 'Approve'
                  ? 'text-emerald-300'
                  : 'text-red-300'
              }`}
            >
              {result.analysis.verdict}
            </p>
          </article>

          <article className="glass-card p-6 fade-up md:col-span-2">
            <h3 className="mb-3 text-lg font-semibold text-white">🧠 Historical Insight</h3>
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              {result.historicalInsight?.related
                ? `⚠️ Similar past changes in this area caused issues: ${result.historicalInsight.message}`
                : 'No high-risk historical patterns matched for this PR.'}
            </div>
          </article>
        </section>
      )}
    </main>
  )
}

export default App
