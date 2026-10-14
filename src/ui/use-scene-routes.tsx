import { createRef, useEffect, useRef, useState, type ReactNode } from 'react'
import { SecondaryButton } from './Buttons'

// Keep independent flags and entry refs, including priority when several flags
// change together. Only a route's own back action requests its entry focus.
export function useSceneRoutes(count: number) {
  const [active, setActive] = useState<boolean[]>([])
  const refs = useRef<ReturnType<typeof createRef<HTMLButtonElement>>[]>(null)
  const returning = useRef<boolean[]>([])
  if (!refs.current) refs.current = Array.from({ length: count }, () => createRef<HTMLButtonElement>())
  useEffect(() => {
    for (let name = 0; name < count; name++) if (!active[name] && returning.current[name]) {
      returning.current[name] = false
      refs.current![name].current?.focus()
    }
  }, [active, count])
  const set = (name: number, value: boolean) => setActive(previous => {
    if (!!previous[name] === value) return previous
    const next = previous.slice()
    next[name] = value
    return next
  })
  return {
    active, set,
    back: (name: number) => () => { returning.current[name] = true; set(name, false) },
    button: (name: number, children: ReactNode) => <SecondaryButton ref={refs.current![name]} onClick={() => set(name, true)}>{children}</SecondaryButton>,
  }
}
