import type { BreachSource } from '../types'

// Stub — implemented in Plan 2
export async function searchDehashed(_email: string): Promise<BreachSource> {
  return { name: 'Dehashed', breachCount: 0, breaches: [], tier: 'paid' }
}
