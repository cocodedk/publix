import type { BreachSource } from '../types'

// Stub — implemented in Plan 2
export async function searchHIBP(_email: string): Promise<BreachSource> {
  return { name: 'HaveIBeenPwned', breachCount: 0, breaches: [], tier: 'paid' }
}
