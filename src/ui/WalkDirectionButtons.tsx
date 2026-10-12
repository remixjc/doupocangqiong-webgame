import type { EarlyWalkDirection } from '../core/early-walk'

// Only the four button labels/rendering are shared; every scene keeps its movement guards.
export default function WalkDirectionButtons({ prefix, onMove }: { prefix: string; onMove: (direction: EarlyWalkDirection) => void }) {
  return <>{(['up', 'left', 'down', 'right'] as const).map((direction, i) => <button key={direction} className="secondary"
    aria-label={`${prefix}向${['上', '左', '下', '右'][i]}走`} onClick={() => onMove(direction)}>{['↑', '←', '↓', '→'][i]}</button>)}</>
}
