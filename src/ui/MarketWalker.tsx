// Draw only the figure. Position, actor label, held objects and interaction remain in each scene.
export default function MarketWalker({ xuner = false }: { xuner?: boolean }) {
  return <><path d="M-11 14 L-6-5 H6 L11 14Z" fill={xuner ? '#9dbca4' : '#d3a567'} />
    <circle cy="-13" r="8" fill={xuner ? '#edcfbd' : '#edc79f'} /></>
}
import type { ComponentProps, ReactNode } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'

export function marketWalkerGroup(props: ComponentProps<'g'>, figureProps: ComponentProps<typeof MarketWalker>, ...children: ReactNode[]) {
  const figure = <MarketWalker {...figureProps} />
  return children.length ? jsxs('g', { ...props, children: [figure, ...children] })
    : jsx('g', { ...props, children: figure })
}
