import { vi } from "vitest"

export interface RecordedCall {
  method: string
  args: unknown[]
}

/**
 * Fake Supabase PostgrestFilterBuilder: every chain method records its call
 * and returns the same builder (so any order of chaining works), and the
 * builder itself is thenable so `await` resolves no matter which method is
 * the last one called in the chain — mirroring real supabase-js behaviour.
 */
export function createMockQueryBuilder(result: { data: unknown; error: unknown }) {
  const calls: RecordedCall[] = []
  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "or",
    "is",
    "gte",
    "lte",
    "order",
    "limit",
    "single",
    "maybeSingle",
  ]

  const builder: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) => resolve(result),
  }
  for (const method of methods) {
    builder[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args })
      return builder
    })
  }
  return { builder, calls }
}

export const findCalls = (calls: RecordedCall[], method: string) =>
  calls.filter((c) => c.method === method)
