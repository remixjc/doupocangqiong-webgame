import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { gameStore } from '../core/store'
import type { Action } from '../core/model'
import { bindFocusLifecycle } from '../game/focus'

export default function TouchControls({ onMenu }: { onMenu: () => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const origin = useRef({ x: 0, y: 0 })
  const active = useRef<number | null>(null)
  const repeat = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  function reset() { active.current = null; gameStore.move = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }) }
  function stop() { clearInterval(repeat.current); repeat.current = undefined }
  useEffect(() => {
    const release = () => { reset(); stop() }
    return bindFocusLifecycle(window, document, release, () => {})
  }, [])
  function move(e: PointerEvent<HTMLDivElement>) {
    if (gameStore.paused) { reset(); return }
    if (active.current !== e.pointerId) return
    const x = e.clientX - origin.current.x, y = e.clientY - origin.current.y
    const length = Math.hypot(x, y), scale = Math.min(1, 32 / Math.max(1, length))
    setKnob({ x: x * scale, y: y * scale })
    gameStore.move = { x: x * scale / 32, y: y * scale / 32 }
  }
  function actionButton(action: Action, label: string, cls = '') {
    return <button className={`touch-button ${cls}`} aria-label={label} onPointerDown={e => {
      if (gameStore.paused || document.hidden) return
      e.currentTarget.setPointerCapture(e.pointerId)
      gameStore.action(action)
      if (action === 'attack') { stop(); repeat.current = setInterval(() => gameStore.action(action), 400) }
    }} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
      onClick={e => { if (e.detail === 0) gameStore.action(action) }}>{label}</button>
  }
  return <div className="touch-controls">
    <div className="joystick" role="group" aria-label="移动摇杆" onPointerDown={e => {
      if (gameStore.paused || document.hidden) return
      gameStore.stopTravel()
      const box = e.currentTarget.getBoundingClientRect()
      origin.current = { x: box.left + box.width / 2, y: box.top + box.height / 2 }
      active.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e)
    }} onPointerMove={move} onPointerUp={reset} onPointerCancel={reset} onLostPointerCapture={reset}>
      <span className="joystick-ring" /><i style={{ transform: `translate(${knob.x}px,${knob.y}px)` }} />
    </div>
    <div className="touch-actions">{actionButton('interact', '交互')}{actionButton('dodge', '闪避')}{actionButton('attack', '普攻', 'touch-attack')}</div>
    <button className="touch-menu" onClick={onMenu} aria-label="暂停与营地菜单">Ⅱ</button>
    <div className="rotate-hint"><span>↻</span><b>横屏，展开完整山川。</b><small>旋转手机后使用左侧摇杆与右侧战斗按钮。</small></div>
  </div>
}
