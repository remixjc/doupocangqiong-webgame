import { useEffect, type DependencyList, type RefObject } from 'react'

// The caller retains its original ref, readiness guard and effect dependencies.
export function useSceneFocus<T extends { focus: () => void }>(ref: RefObject<T | null>, ready: boolean, dependencies: DependencyList) {
  useEffect(() => { if (ready) ref.current?.focus() }, dependencies)
}
