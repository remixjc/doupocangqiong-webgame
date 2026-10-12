import type { ComponentProps } from 'react'

// Retain native semantics, supplied attributes, children and React 19 refs.
export function StatusParagraph(props: ComponentProps<'p'>) {
  return <p role="status" {...props} />
}
export function BondSummary(props: ComponentProps<'section'>) {
  return <section className="bond-summary" {...props} />
}

export function WalkControls(props: ComponentProps<'div'>) {
  return <div className="early-walk-controls" {...props} />
}

export function Eyebrow(props: ComponentProps<'span'>) {
  return <span className="eyebrow" {...props} />
}

export function MutedParagraph(props: ComponentProps<'p'>) {
  return <p className="muted" {...props} />
}
