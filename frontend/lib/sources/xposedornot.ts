import axios from 'axios'
import type { BreachSource, BreachEntry } from '../types'
import { logger } from '../logger'

const TIMEOUT_MS = 8000

interface XposedOrNotResponse {
  breaches?: string[]
}

export async function searchXposedOrNot(email: string): Promise<BreachSource> {
  try {
    const response = await axios.get<XposedOrNotResponse>(
      `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`,
      { timeout: TIMEOUT_MS }
    )
    const names: string[] = response.data.breaches ?? []
    const breaches: BreachEntry[] = names.map((name) => ({ name }))
    return { name: 'XposedOrNot', breachCount: breaches.length, breaches, tier: 'free' }
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      // 404 means no breaches found — clean email
      return { name: 'XposedOrNot', breachCount: 0, breaches: [], tier: 'free' }
    }
    logger.error({ err, email }, 'XposedOrNot search failed')
    throw err
  }
}
