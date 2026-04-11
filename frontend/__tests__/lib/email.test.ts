import type { ReportResult } from '../../lib/types'

const mockSend = jest.fn()

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

// Import after mock so the module picks up the mocked Resend
let sendBreachReport: (report: ReportResult) => Promise<{ success: boolean; messageId?: string; error?: string }>

beforeAll(async () => {
  const mod = await import('../../lib/email')
  sendBreachReport = mod.sendBreachReport
})

const baseReport: ReportResult = {
  email: 'user@example.com',
  totalBreaches: 0,
  sources: [],
  generatedAt: '2024-01-01T00:00:00.000Z',
  tier: 'free',
}

const reportWithBreaches: ReportResult = {
  ...baseReport,
  totalBreaches: 3,
}

describe('sendBreachReport', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns success:true with messageId on successful send (zero breaches)', async () => {
    mockSend.mockResolvedValueOnce({ data: { id: 'mock-id-123' }, error: null })
    const result = await sendBreachReport(baseReport)
    expect(result.success).toBe(true)
    expect(result.messageId).toBe('mock-id-123')
    expect(result.error).toBeUndefined()
  })

  it('returns success:true with subject containing breach count when breaches found', async () => {
    mockSend.mockResolvedValueOnce({ data: { id: 'mock-id-456' }, error: null })
    const result = await sendBreachReport(reportWithBreaches)
    expect(result.success).toBe(true)
    // Verify the subject was set correctly by checking the call args
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('3'),
      })
    )
  })

  it('returns success:false with error message on Resend API error', async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { name: 'validation_error', message: 'Invalid email address', statusCode: 422 },
    })
    const result = await sendBreachReport(baseReport)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(typeof result.error).toBe('string')
  })

  it('returns success:false with error message when send throws', async () => {
    mockSend.mockRejectedValueOnce(new Error('Network timeout'))
    const result = await sendBreachReport(baseReport)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Network timeout')
  })

  it('never throws — always returns a SendResult', async () => {
    mockSend.mockRejectedValueOnce(new Error('Unexpected failure'))
    await expect(sendBreachReport(baseReport)).resolves.toBeDefined()
  })
})
