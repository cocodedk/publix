import type { ReportResult, BreachEntry } from '../types'

function formatBreach(breach: BreachEntry): string {
  const date = breach.date ? ` (${breach.date})` : ''
  return `  - ${breach.name}${date}`
}

export function buildBreachReportText(report: ReportResult): string {
  const lines: string[] = [
    'PUBLIX BREACH REPORT',
    '====================',
    `Report for: ${report.email}`,
    `Generated: ${report.generatedAt}`,
    '',
  ]

  if (report.totalBreaches === 0) {
    lines.push('No breaches found — your email was not detected in any known data breach.')
  } else {
    lines.push(`Breach alert — your email appeared in ${report.totalBreaches} breach(es):`, '')
    for (const source of report.sources) {
      if (source.breaches.length > 0) {
        lines.push(`Source: ${source.name}`)
        source.breaches.forEach((b) => lines.push(formatBreach(b)))
        lines.push('')
      }
    }
  }

  if (report.tier === 'free') {
    lines.push(
      '--- Upgrade for full protection ---',
      'Get access to more breach sources at: https://publix.dk/pricing',
      ''
    )
  }

  lines.push(
    '---',
    'Data sources: XposedOrNot, Powered by LeakCheck, Powered by HaveIBeenPwned',
    'Your privacy matters. We do not store your email address after sending this report.'
  )

  return lines.join('\n')
}
