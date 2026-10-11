import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { beginEarlyTraining, earlyTrainingBlock } from '../src/core/early-training'
import { blankEarlyTraining } from '../src/core/early-training-state'
import { validateState, parseSave, serializeSave, saveSlot, loadSlot } from '../src/core/save'
import { GameStore } from '../src/core/store'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'

function clearedTwo() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'
  old.completed = [1, 2]; old.chapter = 2
  old.progress = Object.fromEntries([1, 2].map(id => [id,
    { ...blankProgress(id), herbs: 3, kills: 3, brews: 0, intro: true, boss: true }]))
  delete old.earlyTraining
  return validateState(old)
}
describe('早期重修独立任务记录', () => {
  it('未首通/动画范围拒绝接取，不显示隐藏准备细节', () => {
    const fresh = initialState()
    expect(beginEarlyTraining(fresh).state).toBe(fresh)
    const state = clearedTwo(); state.settings.spoiler = 'anime'; state.settings.animeLimit = 1
    expect(earlyTrainingBlock(state)).toContain('剧透')
    expect(beginEarlyTraining(state).state).toBe(state)
    const html = renderToStaticMarkup(<EarlyTrainingPanel state={state} />)
    expect(html).not.toContain('两种指定草药')
    expect(html).not.toContain('记下重修准备')
  })
  it('接取只改独立准备标记，拒绝重复，不发资金/材料/技能或章节奖励', () => {
    const state = clearedTwo(), result = beginEarlyTraining(state)
    expect(result.ok).toBe(true)
    const expected = structuredClone(state); expected.earlyTraining.started = true
    expect(result.state).toEqual(expected)
    expect(state.earlyTraining).toEqual(blankEarlyTraining())
    expect(beginEarlyTraining(result.state).state).toBe(result.state)
  })
  it('旧0.14.10缺记录只补空任务，新版缺记录与越过材料资金组合拒绝', () => {
    const old = JSON.parse(JSON.stringify(clearedTwo())); old.contentVersion = '0.14.10'; delete old.earlyTraining
    expect(validateState(old).earlyTraining).toEqual(blankEarlyTraining())
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    const invalid = beginEarlyTraining(clearedTwo()).state
    for (const change of [
      (state: typeof invalid) => { state.earlyTraining.purse.own = 400 },
      (state: typeof invalid) => { state.earlyTraining.supplies.woodCore = 1 },
      (state: typeof invalid) => { state.earlyTraining.supplies.bluegrass = -1 },
      (state: typeof invalid) => { state.earlyTraining.supplies.boneflower = NaN },
    ]) { const copy = structuredClone(invalid); change(copy); expect(() => validateState(copy)).toThrow('重修') }
    const beforeClear = initialState(); beforeClear.earlyTraining.started = true
    expect(() => validateState(beforeClear)).toThrow('重修')
  })
  it('接取状态JSON/IndexedDB往返，隐藏后保留，再恢复范围可见', async () => {
    const state = beginEarlyTraining(clearedTwo()).state
    expect(parseSave(serializeSave(state))).toEqual(state)
    await saveSlot(3, state)
    expect(await loadSlot(3)).toEqual(state)
    const hidden = structuredClone(state); hidden.settings.spoiler = 'anime'; hidden.settings.animeLimit = 1
    const restored = parseSave(serializeSave(hidden))
    expect(restored.earlyTraining.started).toBe(true)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={restored} />)).not.toContain('准备单已记下')
    restored.settings.spoiler = 'novel'
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={restored} />)).toContain('准备单已记下')
  })
  it('store接取保留运行态、章号和输入队列，仅成功写一次', () => {
    const store = new GameStore({ load: async () => null, write: async () => {} })
    store.replace(clearedTwo())
    const before = store.getSnapshot().runtime, persisted = vi.fn()
    store.onChange = persisted
    store.actions.push('attack')
    expect(store.beginEarlyTraining()).toBe(true)
    expect(store.beginEarlyTraining()).toBe(false)
    expect(persisted).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot().runtime).toBe(before)
    expect(store.getSnapshot().state.chapter).toBe(2)
    expect(store.actions).toEqual(['attack'])
  })
})
