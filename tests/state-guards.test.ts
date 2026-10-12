import { describe, expect, it } from 'vitest'
import { boundedInteger, fieldsMatch } from '../src/core/state-guards'
describe('shared save primitive guards retain strict validation', () => {
  it('accepts only safe integers within inclusive stage/attempt bounds without coercion', () => {
    for (const value of [0, 1, 24, Number.MAX_SAFE_INTEGER]) expect(boundedInteger(value, Number.MAX_SAFE_INTEGER)).toBe(true)
    for (const value of [-1, .5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, '1', true, null, undefined, {}, []])
      expect(boundedInteger(value, Number.MAX_SAFE_INTEGER)).toBe(false)
    expect(boundedInteger(25, 24)).toBe(false); expect(boundedInteger(24, 24)).toBe(true)
  })
  it('compares all expected primitive fields strictly without altering legacy unknown-field handling', () => {
    const expected = { stage: 16, following: 3, patrol: false, captain: 'introduced' }
    expect(fieldsMatch({ ...expected }, expected)).toBe(true)
    expect(fieldsMatch({ ...expected, futureMetadata: 1 }, expected)).toBe(true)
    for (const field of Object.keys(expected)) {
      const missing: Record<string, unknown> = { ...expected }; delete missing[field]
      expect(fieldsMatch(missing, expected)).toBe(false)
      expect(fieldsMatch({ ...expected, [field]: String(expected[field as keyof typeof expected]) }, expected))
        .toBe(typeof expected[field as keyof typeof expected] === 'string')
    }
    expect(fieldsMatch({ ...expected, patrol: 0 }, expected)).toBe(false)
    expect(fieldsMatch({ ...expected, following: '3' }, expected)).toBe(false)
  })
})
