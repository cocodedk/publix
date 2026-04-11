import axios from 'axios'
import { searchLeakCheck } from '../../../lib/sources/leakcheck'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('searchLeakCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns breaches when found > 0', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        found: 2,
        sources: [
          { name: 'BreachA', date: '2019-01-01' },
          { name: 'BreachB', date: '2020-06-15' },
        ],
      },
    })
    const result = await searchLeakCheck('victim@example.com')
    expect(result.name).toBe('LeakCheck')
    expect(result.breachCount).toBe(2)
    expect(result.breaches).toHaveLength(2)
    expect(result.breaches[0].name).toBe('BreachA')
  })

  it('returns zero breaches on empty/not-found response', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { success: false, found: 0, sources: [] },
    })
    const result = await searchLeakCheck('clean@example.com')
    expect(result.breachCount).toBe(0)
    expect(result.breaches).toHaveLength(0)
  })

  it('returns zero (non-fatal) when API errors — never throws', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))
    const result = await searchLeakCheck('test@example.com')
    expect(result.name).toBe('LeakCheck')
    expect(result.breachCount).toBe(0)
    expect(result.breaches).toHaveLength(0)
  })

  it('returns zero (non-fatal) on 500 error — never throws', async () => {
    const serverError = Object.assign(new Error('Internal Server Error'), {
      response: { status: 500 },
    })
    mockedAxios.get.mockRejectedValueOnce(serverError)
    await expect(searchLeakCheck('test@example.com')).resolves.toBeDefined()
    const result = await searchLeakCheck('test@example.com')
    expect(result.breachCount).toBe(0)
  })

  it('sets tier to free', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { success: false, found: 0, sources: [] },
    })
    const result = await searchLeakCheck('test@example.com')
    expect(result.tier).toBe('free')
  })
})
