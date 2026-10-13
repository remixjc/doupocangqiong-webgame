import type { ComponentProps } from 'react'

// Keep native button props (including React 19 refs), focus, and event handling.
export function SecondaryButton(props: ComponentProps<'button'>) {
  return <button className="secondary" {...props} />
}
export function PrimaryButton(props: ComponentProps<'button'>) {
  return <button className="primary" {...props} />
}

// Keep the original SecondaryButton boundary and its native keyboard behavior.
export function actorButton<A extends string>(current: A, select: (value: A) => void, value: A, label: ComponentProps<'button'>['children']) {
  return <SecondaryButton aria-pressed={current === value} onClick={() => select(value)}>{label}</SecondaryButton>
}
