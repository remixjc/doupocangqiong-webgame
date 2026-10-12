// Draw only the figure. Position, actor label, held objects and interaction remain in each scene.
export default function MarketWalker({ xuner = false }: { xuner?: boolean }) {
  return <><path d="M-11 14 L-6-5 H6 L11 14Z" fill={xuner ? '#9dbca4' : '#d3a567'} />
    <circle cy="-13" r="8" fill={xuner ? '#edcfbd' : '#edc79f'} /></>
}
