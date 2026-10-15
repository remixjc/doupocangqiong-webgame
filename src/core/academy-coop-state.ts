export interface AcademyCoop {
  revision: number
  completed: number
  merit: number
  supplies: number
  assignments: number[]
  phase: 'plan' | 'field' | 'review' | 'failed'
  step: number
  mistakes: number
}

// Opt-in history: absent in both fresh and migrated saves until the player begins.
export function parseAcademyCoop(value: unknown): AcademyCoop {
  const fail = () => { throw new Error('内院协作演练记录无效。') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  const p = value as AcademyCoop
  const integer = (v: unknown, max: number) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max
  if (Object.keys(p).sort().join() !== 'assignments,completed,merit,mistakes,phase,revision,step,supplies' ||
    !integer(p.revision, 10_000_000) || p.revision < 1 || !integer(p.completed, 1_000_000) ||
    p.revision < 1 + p.completed * 5 || p.merit !== Math.min(3, p.completed) * 3 ||
    !integer(p.supplies, p.phase === 'plan' ? 6 : 4 - 2 * p.mistakes) || !integer(p.step, 3) || !integer(p.mistakes, 2) ||
    !Array.isArray(p.assignments) || p.assignments.length !== 3 ||
    !p.assignments.every(v => integer(v, 3)) ||
    !['plan', 'field', 'review', 'failed'].includes(p.phase)) return fail()
  if (p.phase === 'plan' ? p.supplies < 1 || p.step !== 0 || p.mistakes !== 0
    : new Set(p.assignments).size !== 3 || p.assignments.includes(3) ||
      (p.phase === 'review' ? p.step !== 3 || p.supplies < 1
        : p.step > 2 || (p.phase === 'failed' ? p.supplies !== 0 : p.supplies < 1))) return fail()
  return { ...p, assignments: [...p.assignments] }
}
