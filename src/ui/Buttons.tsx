import type { ComponentProps } from 'react'

// Keep native button props (including React 19 refs), focus, and event handling.
export function SecondaryButton(props: ComponentProps<'button'>) {
  return <button className="secondary" {...props} />
}
export function PrimaryButton(props: ComponentProps<'button'>) {
  return <button className="primary" {...props} />
}
