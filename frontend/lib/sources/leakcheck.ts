import axios from 'axios'
import type { BreachSource, BreachEntry } from '../types'
import { logger } from '../logger'

const TIMEOUT_MS = 8000

interface LeakCheckSource {
  name: string
  date?: string
}

interface LeakCheckResponse {
  success: boolean
  found: number
  sources?: LeakCheckSource[]
}

export async function searchLeakCheck(email: string): Promise<BreachSource> {
  try {
    const response = await axios.get<LeakCheckResponse>(
      `https://leakcheck.io/api/public?check=${encodeURIComponent(email)}`,
      { timeout: TIMEOUT_MS }
    )
    const data = response.data
    const sources = data.sources ?? []
    const breaches: BreachEntry[] = sources.map((s) => ({ name: s.name, date: s.date }))
    return { name: 'LeakCheck', breachCount: breaches.length, breaches, tier: 'free' }
  } catch (err: unknown) {
    // Non-fatal: log warning and return empty — never crash the report
    logger.warn({ err, email }, 'LeakCheck search failed (non-fatal)')
    return { name: 'LeakCheck', breachCount: 0, breaches: [], tier: 'free' }
  }
}
