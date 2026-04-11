import type { ReportResult, BreachEntry } from '../types'

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildBreachRow(breach: BreachEntry): string {
  const name = escapeHtml(breach.name)
  const date = breach.date ? escapeHtml(breach.date) : '—'
  // dataClasses may include category labels like "Passwords" (fine) but never actual credential values
  const dataClasses = breach.dataClasses ? escapeHtml(breach.dataClasses.join(', ')) : '—'
  return `<tr><td style="padding:8px;border:1px solid #ddd">${name}</td><td style="padding:8px;border:1px solid #ddd">${date}</td><td style="padding:8px;border:1px solid #ddd">${dataClasses}</td></tr>`
}

function buildBreachTable(report: ReportResult): string {
  const allBreaches = report.sources.flatMap((s) => s.breaches)
  const rows = allBreaches.map(buildBreachRow).join('\n')
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:#f5f5f5">
        <th style="padding:8px;border:1px solid #ddd;text-align:left">Breach</th>
        <th style="padding:8px;border:1px solid #ddd;text-align:left">Date</th>
        <th style="padding:8px;border:1px solid #ddd;text-align:left">Exposed Data</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`
}

function buildStatusBanner(report: ReportResult): string {
  if (report.totalBreaches === 0) {
    return `<div style="background:#d4edda;color:#155724;padding:16px;border-radius:4px;margin:16px 0">
      <strong>No breaches found</strong> — your email address was not detected in any known data breach.
    </div>`
  }
  return `<div style="background:#f8d7da;color:#721c24;padding:16px;border-radius:4px;margin:16px 0">
    <strong>Breach alert</strong> — your email appeared in ${report.totalBreaches} breach(es).
  </div>`
}

function buildUpgradeSection(): string {
  return `
    <div style="background:#fff3cd;color:#856404;padding:16px;border-radius:4px;margin:16px 0">
      <strong>Upgrade for full protection</strong><br>
      Get access to HaveIBeenPwned and Dehashed sources for a more complete report.<br>
      <a href="https://publix.dk/pricing" style="color:#0066cc">View pricing at publix.dk/pricing</a>
    </div>`
}

export function buildBreachReportHtml(report: ReportResult): string {
  const email = escapeHtml(report.email)
  const banner = buildStatusBanner(report)
  const table = report.totalBreaches > 0 ? buildBreachTable(report) : ''
  const upgrade = report.tier === 'free' ? buildUpgradeSection() : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Publix Breach Report</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:16px;color:#333">
  <h1 style="color:#333;border-bottom:2px solid #eee;padding-bottom:8px">Publix Breach Report</h1>
  <p>Report for: <strong>${email}</strong></p>
  <p style="color:#666;font-size:0.9em">Generated: ${escapeHtml(report.generatedAt)}</p>
  ${banner}
  ${table}
  ${upgrade}
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#888;font-size:0.8em">
    Data sources: XposedOrNot, Powered by LeakCheck, Powered by HaveIBeenPwned<br>
    Your privacy matters. We do not store your email address after sending this report.
  </p>
</body>
</html>`
}
