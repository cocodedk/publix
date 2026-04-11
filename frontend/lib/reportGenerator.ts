import type { ReportResult } from './types'
import { buildBreachReportHtml } from './templates/breachReportHtml'
import { buildBreachReportText } from './templates/breachReportText'

export { buildBreachReportHtml } from './templates/breachReportHtml'
export { buildBreachReportText } from './templates/breachReportText'

export function buildReport(report: ReportResult): { html: string; text: string } {
  return {
    html: buildBreachReportHtml(report),
    text: buildBreachReportText(report),
  }
}
