import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { findEvent, certificationTargets } from '../src/content/events'
import { advanceEvent, eventProgress, pulseMarker } from '../src/core/events'
import StoryEventPanel from '../src/ui/StoryEventPanel'
import HeatControl from '../src/ui/HeatControl'
import { startHeatMotion, type HeatMotionClock } from '../src/ui/heat-motion'

describe('通用控火输入', () => {
  it('正常往返、不同赛速与炼药周期保持各自公式', () => {
    for (const options of [{ speed: 1 }, { speed: 1.7 }, { alchemyPeriod: 290 }]) {
      let now = 0, tick = () => {}, value = -1, canceled = 0
      const control = startHeatMotion(marker => { value = marker }, options, {
        now: () => now, hidden: () => false, schedule: run => { tick = run; return 1 },
        cancel: () => { canceled++ },
      })
      now = 300; tick()
      expect(value).toBeCloseTo('alchemyPeriod' in options
        ? (Math.sin(300 / options.alchemyPeriod!) + 1) / 2
        : pulseMarker(300 * options.speed!))
      control.stop(); control.stop(); now = 500; tick()
      expect(canceled).toBe(1)
    }
  })
  it('可见性与失焦均明确暂停，返回前台不自动恢复，继续保留时机相位', () => {
    let now = 0, hidden = false, tick = () => {}, visibility = () => {}, blur = () => {}, removed = 0, paused = 0
    const values: number[] = []
    const clock: HeatMotionClock = {
      now: () => now, hidden: () => hidden,
      schedule: run => { tick = run; return 1 }, cancel: () => {},
      watchVisibility: listener => { visibility = listener; return () => { removed++ } },
      watchBlur: listener => { blur = listener; return () => { removed++ } },
    }
    const control = startHeatMotion(value => values.push(value), { onPause: () => { paused++ } }, clock)
    now = 100; tick()
    hidden = true; visibility(); now = 900; tick()
    expect(control.resume()).toBe(false)
    now = 100000; hidden = false; visibility()
    now = 100100; tick()
    expect(values).toEqual([pulseMarker(100)])
    expect(control.isPaused()).toBe(true)
    expect(control.resume()).toBe(true)
    now = 100200; tick()
    expect(values).toEqual([pulseMarker(100), pulseMarker(200)])
    blur(); blur(); now = 150000; tick()
    expect(control.isPaused()).toBe(true); expect(paused).toBe(2)
    control.stop(); control.stop(); tick(); visibility(); blur()
    expect(control.resume()).toBe(false)
    expect(values).toHaveLength(2); expect(removed).toBe(2); expect(paused).toBe(2)
  })
  it('显式暂停保留炼药相位，旧回调与隐藏初始页不启动输入', () => {
    let now = 0, tick = () => {}, hidden = false, scheduled = 0, canceled = 0, paused = 0
    const values: number[] = []
    const clock: HeatMotionClock = {
      now: () => now, hidden: () => hidden,
      schedule: run => { tick = run; return ++scheduled }, cancel: () => { canceled++ },
    }
    const control = startHeatMotion(value => values.push(value), { alchemyPeriod: 290, onPause: () => { paused++ } }, clock)
    now = 100; tick()
    const staleTick = tick
    control.pause(); control.pause(); now = 100000; tick()
    expect(values).toHaveLength(1); expect(paused).toBe(1); expect(canceled).toBe(1)
    expect(control.resume()).toBe(true); expect(control.resume()).toBe(false)
    now = 100050; staleTick()
    expect(values).toHaveLength(1)
    now = 100100; tick()
    expect(values[1]).toBeCloseTo((Math.sin(200 / 290) + 1) / 2)
    control.stop(); tick(); expect(canceled).toBe(2)
    hidden = true
    const background = startHeatMotion(value => values.push(value), { onPause: () => { paused++ } }, clock)
    expect(background.isPaused()).toBe(true); expect(scheduled).toBe(2)
    hidden = false; expect(background.resume()).toBe(true); expect(scheduled).toBe(3)
    background.stop()
  })
  it('静态滑杆具有百分比目标与原生键盘步长，动态模式保留指针而无滑杆', () => {
    const props = { target: .35, targetWidth: 16, markerLabel: '认证指针', inputLabel: '火候位置', lockLabel: '锁定', onLock: () => {} }
    const html = renderToStaticMarkup(<HeatControl {...props} reducedMotion />)
    expect(html).toContain('type="range"')
    expect(html).toContain('step=".01"')
    expect(html).toContain('aria-label="火候位置"')
    expect(html).toContain('aria-valuetext="0%，目标35%"')
    expect(html).toContain('left:27%;width:16%')
    expect(html).not.toContain('暂停时机')
    const dynamic = renderToStaticMarkup(<HeatControl {...props} reducedMotion={false} />)
    expect(dynamic).not.toContain('type="range"')
    expect(dynamic).toContain('暂停时机')
  })
  it('认证三步静态控火只提交普通pulse，部分成绩及错误重试沿用既有事务', () => {
    // Explicit UI/rule fixture; never loaded into a browser or user save.
    let state = initialState(); state.chapter = 6; state.progress[6] = blankProgress(6)
    const id = 'black-rock-certification'
    state = advanceEvent(state, { type: 'begin', eventId: id }).state
    state = advanceEvent(state, { type: 'seal', index: 0, eventId: id }).state
    state = advanceEvent(state, { type: 'test', eventId: id }).state
    state.settings.reducedMotion = true
    const before = structuredClone(state.inventory)
    for (let index = 0; index < 3; index++) {
      const html = renderToStaticMarkup(<StoryEventPanel state={state} eventId={id} checkpoint={1} close={() => {}} shop={() => {}} />)
      expect(html).toContain('aria-label="认证火候位置"')
      expect(html).toContain(`目标${certificationTargets[index] * 100}%`)
      const action = { type: 'pulse' as const, eventId: id, marker: certificationTargets[index], stage: index + 2 }
      state = advanceEvent(state, action).state
      expect(advanceEvent(state, action).state).toBe(state)
      expect(state.inventory).toEqual(before)
    }
    expect(eventProgress(state)).toMatchObject({ stage: 5, score: 300 })
    expect(state.gold).toBe(80)
    expect(findEvent(6, id)?.kind).toBe('certification')
  })
})
