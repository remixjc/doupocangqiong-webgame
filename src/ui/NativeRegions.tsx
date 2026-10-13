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

export function TimingMeter({ label, marker }: { label: string; marker: number }) {
  return <div className="heat-meter" aria-label={label}><div className="heat-target" style={{ left: '35%', width: '30%' }} /><i style={{ left: `${marker * 100}%` }} /></div>
}

export function MountainStatus(props: ComponentProps<'div'>) { return <div className="mountain-status" {...props} /> }

export function CampOptions(props: ComponentProps<'div'>) { return <div className="camp-options" {...props} /> }

export function HallWalker() {
  return <><ellipse cy="17" rx="14" ry="5" fill="#0005" /><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" /></>
}
export function hallWalkerAt(position: { x: number; y: number }) {
  return <g transform={`translate(${position.x} ${position.y})`} aria-hidden="true"><HallWalker /></g>
}
export function TimingRange({ label, value, onChange, children }: { label: string; value: number; onChange: ComponentProps<'input'>['onChange']; children: ComponentProps<'small'>['children'] }) {
  return <label className="setting-row"><span>{label}{children}</span><input aria-label={label} type="range" min="0" max="1" step=".05" value={value} onChange={onChange} /></label>
}

export function RobeFigure({ skin = '#e1bba0', robe = '#73a98a', cut = 'M-13 17 L-7-5 H7 L13 17Z', cy = '-13', r = '8', bodyFirst = false }: {
  skin?: string; robe?: string; cut?: string; cy?: string; r?: string; bodyFirst?: boolean
}) {
  const head = <circle cy={cy} r={r} fill={skin} />, body = <path d={cut} fill={robe} />
  return bodyFirst ? <>{body}{head}</> : <>{head}{body}</>
}
