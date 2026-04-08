export const historicalLearnings = [
  { area: 'authentication', issue: 'login failures', risk: 'high' },
  { area: 'database', issue: 'slow queries', risk: 'medium' },
  { area: 'payments', issue: 'double charge edge cases', risk: 'high' },
  { area: 'caching', issue: 'stale reads after deployment', risk: 'medium' },
]

export function getHistoricalInsight(text) {
  const normalized = text.toLowerCase()
  const matched = historicalLearnings.filter((entry) =>
    normalized.includes(entry.area.toLowerCase()),
  )

  if (!matched.length) {
    return {
      related: false,
      message: '',
      matches: [],
    }
  }

  const message = matched
    .map((entry) => `${entry.area}: ${entry.issue} (${entry.risk} risk)`)
    .join('; ')

  return {
    related: true,
    message,
    matches: matched,
  }
}
