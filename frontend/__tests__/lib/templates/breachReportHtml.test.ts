import { buildBreachReportHtml } from '../../../lib/templates/breachReportHtml'
import type { ReportResult } from '../../../lib/types'

const baseReport: ReportResult = {
  email: 'test@example.com',
  totalBreaches: 0,
  sources: [],
  generatedAt: '2024-01-01T00:00:00.000Z',
  tier: 'free',
}

const reportWithBreaches: ReportResult = {
  email: 'victim@example.com',
  totalBreaches: 2,
  sources: [
    {
      name: 'XposedOrNot',
      breachCount: 2,
      tier: 'free',
      breaches: [
        { name: 'AdobeBreach', date: '2013-10-04', dataClasses: ['Email', 'Passwords'] },
        { name: 'LinkedInBreach', date: '2016-05-05', dataClasses: ['Email', 'Passwords'] },
      ],
    },
  ],
  generatedAt: '2024-01-01T00:00:00.000Z',
  tier: 'free',
}

describe('buildBreachReportHtml', () => {
  it('includes the queried email address', () => {
    const html = buildBreachReportHtml(baseReport)
    expect(html).toContain('test@example.com')
  })

  it('includes breach names when breaches found', () => {
    const html = buildBreachReportHtml(reportWithBreaches)
    expect(html).toContain('AdobeBreach')
    expect(html).toContain('LinkedInBreach')
  })

  it('includes "no breaches" text when totalBreaches === 0', () => {
    const html = buildBreachReportHtml(baseReport)
    expect(html.toLowerCase()).toContain('no breaches')
  })

  it('does NOT include raw passwords — dataClass label "Passwords" is allowed but literal credential values must not appear', () => {
    const reportWithPassword: ReportResult = {
      ...reportWithBreaches,
      sources: [
        {
          name: 'XposedOrNot',
          breachCount: 1,
          tier: 'free',
          breaches: [
            {
              name: 'TestBreach',
              date: '2020-01-01',
              dataClasses: ['Email'],
              description: 'leaked password: hunter2',
            },
          ],
        },
      ],
    }
    const html = buildBreachReportHtml(reportWithPassword)
    expect(html).not.toContain('hunter2')
  })

  it('includes upgrade link for free tier', () => {
    const html = buildBreachReportHtml({ ...baseReport, tier: 'free' })
    expect(html).toContain('publix.dk')
    expect(html).toContain('/pricing')
  })

  it('does NOT include upgrade link for paid tier', () => {
    const html = buildBreachReportHtml({ ...baseReport, tier: 'paid' })
    expect(html).not.toContain('/pricing')
  })

  it('returns a valid HTML document structure', () => {
    const html = buildBreachReportHtml(baseReport)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('</html>')
  })
})
