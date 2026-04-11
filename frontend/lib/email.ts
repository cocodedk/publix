import { Resend } from 'resend'
import type { ReportResult } from './types'
import { buildBreachReportHtml } from './templates/breachReportHtml'
import { buildBreachReportText } from './templates/breachReportText'
import { logger } from './logger'

export interface SendResult {
  success: boolean
  messageId?: string
  error?: string
}

function buildSubject(report: ReportResult): string {
  if (report.totalBreaches === 0) {
    return 'Publix \u2014 No breaches found'
  }
  return `Publix \u2014 Your email appeared in ${report.totalBreaches} breach${report.totalBreaches === 1 ? '' : 'es'}`
}

export async function sendBreachReport(report: ReportResult): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY ?? ''
  const from = process.env.RESEND_FROM_EMAIL ?? 'noreply@publix.dk'
  const resend = new Resend(apiKey)

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: report.email,
      subject: buildSubject(report),
      html: buildBreachReportHtml(report),
      text: buildBreachReportText(report),
    })

    if (error) {
      logger.warn({ error, email: report.email }, 'Resend returned error')
      return { success: false, error: error.message }
    }

    logger.info({ messageId: data?.id, email: report.email }, 'Breach report sent')
    return { success: true, messageId: data?.id }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error({ err, email: report.email }, 'Failed to send breach report')
    return { success: false, error: message }
  }
}
