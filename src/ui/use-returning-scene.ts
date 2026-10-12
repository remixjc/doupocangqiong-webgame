import { useEffect, useRef, useState } from 'react'

// Each route keeps its own open state and restores only its own entry focus.
export function useReturningScene() {
  const [active, setActive] = useState(false)
  const entry = useRef<HTMLButtonElement>(null), returning = useRef(false)
  useEffect(() => {
    if (!active && returning.current) { returning.current = false; entry.current?.focus() }
  }, [active])
  const back = () => { returning.current = true; setActive(false) }
  return [active, setActive, entry, back] as const
}
