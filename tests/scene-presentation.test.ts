import { describe, expect, it, vi } from 'vitest'
import { PauseDrawGate, presentFloat } from '../src/game/presentation'
import { bindFocusLifecycle } from '../src/game/focus'
import { FixedClock } from '../src/game/clock'

describe('C11b-2 暂停绘制与漂浮文字', () => {
  it('600次暂停更新只重画一次，事件变化另重画一次，恢复正常绘制', () => {
    const gate = new PauseDrawGate(), state = {}
    expect(Array.from({ length: 600 }, () => gate.shouldDraw(true, state)).filter(Boolean)).toHaveLength(1)
    const changed = {}
    expect(gate.shouldDraw(true, changed)).toBe(true)
    expect(gate.shouldDraw(true, changed)).toBe(false)
    expect(gate.shouldDraw(false, changed)).toBe(true)
    expect(gate.shouldDraw(false, changed)).toBe(true)
    expect(gate.shouldDraw(true, changed)).toBe(true)
  })
  it('固定文字池仅改变化字段，隐藏后复用相同纹理，新池不沿用旧缓存', () => {
    const node = () => ({ setVisible: vi.fn(), setText: vi.fn(), setPosition: vi.fn(), setColor: vi.fn(), setAlpha: vi.fn() })
    const a = node(), label = { text: '42', color: '#fff', x: 10, y: 20, time: .6 }
    for (let i = 0; i < 100; i++) presentFloat(a)
    expect(a.setVisible).not.toHaveBeenCalled()
    presentFloat(a, label); presentFloat(a, label)
    expect(a.setText).toHaveBeenCalledTimes(1); expect(a.setColor).toHaveBeenCalledTimes(1)
    presentFloat(a, { ...label, y: 19, time: .2 })
    expect(a.setPosition).toHaveBeenCalledTimes(2); expect(a.setAlpha).toHaveBeenLastCalledWith(.4)
    presentFloat(a); presentFloat(a)
    expect(a.setVisible.mock.calls).toEqual([[true], [false]])
    presentFloat(a, { ...label, text: '43', color: '#faa' })
    expect(a.setText).toHaveBeenLastCalledWith('43'); expect(a.setColor).toHaveBeenLastCalledWith('#faa')
    const b = node(); presentFloat(b, label)
    expect(b.setText).toHaveBeenCalledTimes(1); expect(b.setVisible).toHaveBeenCalledWith(true)
  })
})

describe('C11b-2 隐藏与焦点生命周期', () => {
  it('无blur的后台切换立即释放输入/时钟，隐藏focus不恢复，返回不补走旧半帧', () => {
    const windowTarget = new EventTarget(), doc = Object.assign(new EventTarget(), { hidden: false })
    const clock = new FixedClock(), tick = vi.fn()
    const input = { held: true, queued: 2, touch: 1 }
    clock.advance(8, tick)
    const release = vi.fn(() => { input.held = false; input.queued = 0; input.touch = 0; clock.reset() })
    const resume = vi.fn(), dispose = bindFocusLifecycle(windowTarget, doc, release, resume)
    doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'))
    expect(input).toEqual({ held: false, queued: 0, touch: 0 })
    windowTarget.dispatchEvent(new Event('focus')); expect(resume).not.toHaveBeenCalled()
    doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange'))
    expect(resume).toHaveBeenCalledTimes(1)
    clock.advance(9, tick); expect(tick).not.toHaveBeenCalled()
    clock.advance(8, tick); expect(tick).toHaveBeenCalledTimes(1)
    dispose()
  })
  it('20次装卸无旧监听器积累，blur与销毁释放，销毁二次不重复', () => {
    const windowTarget = new EventTarget(), doc = Object.assign(new EventTarget(), { hidden: false })
    const release = vi.fn(), resume = vi.fn()
    for (let i = 0; i < 20; i++) {
      const dispose = bindFocusLifecycle(windowTarget, doc, release, resume)
      dispose(); dispose()
    }
    expect(release).toHaveBeenCalledTimes(20)
    windowTarget.dispatchEvent(new Event('blur'))
    windowTarget.dispatchEvent(new Event('focus'))
    doc.dispatchEvent(new Event('visibilitychange'))
    expect(release).toHaveBeenCalledTimes(20); expect(resume).not.toHaveBeenCalled()
    const live = bindFocusLifecycle(windowTarget, doc, release, resume)
    windowTarget.dispatchEvent(new Event('blur')); expect(release).toHaveBeenCalledTimes(21)
    windowTarget.dispatchEvent(new Event('focus')); expect(resume).toHaveBeenCalledTimes(1)
    live()
  })
})
