import { searchXposedOrNot } from './xposedornot'
import { searchLeakCheck } from './leakcheck'
import { searchHIBP } from './hibp'
import { searchDehashed } from './dehashed'
import type { BreachSource, ReportResult } from '../types'
import { logger } from '../logger'

function sumBreaches(sources: BreachSource[]): number {
  return sources.reduce((total, s) => total + s.breachCount, 0)
}

async function safeRun(
  fn: () => Promise<BreachSource>,
  label: string
): Promise<BreachSource | null> {
  try {
    return await fn()
  } catch (err) {
    logger.warn({ err, label }, 'Source failed — skipping')
    return null
  }
}

export async function runFreeTierSearch(email: string): Promise<ReportResult> {
  const results = await Promise.allSettled([
    safeRun(() => searchXposedOrNot(email), 'XposedOrNot'),
    safeRun(() => searchLeakCheck(email), 'LeakCheck'),
  ])

  const sources: BreachSource[] = results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((s): s is BreachSource => s !== null)

  return {
    email,
    totalBreaches: sumBreaches(sources),
    sources,
    generatedAt: new Date().toISOString(),
    tier: 'free',
  }
}

export async function runPaidTierSearch(email: string): Promise<ReportResult> {
  const results = await Promise.allSettled([
    safeRun(() => searchXposedOrNot(email), 'XposedOrNot'),
    safeRun(() => searchLeakCheck(email), 'LeakCheck'),
    safeRun(() => searchHIBP(email), 'HIBP'),
    safeRun(() => searchDehashed(email), 'Dehashed'),
  ])

  const sources: BreachSource[] = results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((s): s is BreachSource => s !== null)

  return {
    email,
    totalBreaches: sumBreaches(sources),
    sources,
    generatedAt: new Date().toISOString(),
    tier: 'paid',
  }
}
