import type { ComponentProps } from 'react'

// Native SVG elements retain every supplied attribute, child and React 19 ref.
export function MapText(props: ComponentProps<'text'>) {
  return <text textAnchor="middle" fill="#f3dfb7" fontSize="12" {...props} />
}
export function HallText(props: ComponentProps<'text'>) {
  return <text textAnchor="middle" fill="#eed7ad" fontSize="10" {...props} />
}
export function MapBackground(props: ComponentProps<'rect'>) {
  return <rect width="720" height="420" fill="#293e36" {...props} />
}
