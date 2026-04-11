import axios from 'axios'
import { searchXposedOrNot } from '../../../lib/sources/xposedornot'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('searchXposedOrNot', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns breaches when API returns breach names array', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { breaches: ['AdobeBreach', 'LinkedInBreach'] },
    })
    const result = await searchXposedOrNot('victim@example.com')
    expect(result.name).toBe('XposedOrNot')
    expect(result.breachCount).toBe(2)
    expect(result.breaches).toHaveLength(2)
    expect(result.breaches[0].name).toBe('AdobeBreach')
    expect(result.breaches[1].name).toBe('LinkedInBreach')
  })

  it('returns zero breaches on 404 (clean email)', async () => {
    const notFoundError = Object.assign(new Error('Not Found'), {
      response: { status: 404 },
    })
    mockedAxios.get.mockRejectedValueOnce(notFoundError)
    const result = await searchXposedOrNot('clean@example.com')
    expect(result.name).toBe('XposedOrNot')
    expect(result.breachCount).toBe(0)
    expect(result.breaches).toHaveLength(0)
  })

  it('throws on 500 server error', async () => {
    const serverError = Object.assign(new Error('Internal Server Error'), {
      response: { status: 500 },
    })
    mockedAxios.get.mockRejectedValueOnce(serverError)
    await expect(searchXposedOrNot('victim@example.com')).rejects.toThrow()
  })

  it('sets tier to free', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { breaches: ['SomeBreach'] },
    })
    const result = await searchXposedOrNot('test@example.com')
    expect(result.tier).toBe('free')
  })
})
