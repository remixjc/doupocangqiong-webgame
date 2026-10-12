export function boundedInteger(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
}

export function fieldsMatch(value: object, expected: object): boolean {
  const actual = value as Record<string, unknown>, fields = expected as Record<string, unknown>
  return Object.keys(fields).every(key => actual[key] === fields[key])
}
