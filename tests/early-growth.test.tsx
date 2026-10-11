import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { advanceEarlyGrowth, earlyGrowthBlock, submitEarlyGrowth } from '../src/core/early-growth'
import { earlyGrowthScenes } from '../src/content/early-growth'
import { earlyGrowthSaveSummary, savePreviewSummary, saveRecordSummary } from '../src/core/save-preview'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyGrowth from '../src/ui/EarlyGrowth'

function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return validateState(old)
}
describe('持续修炼与后续考核过渡', () => {
  it('初期归档与第3章可见范围才开放，未准备/未归档与范围封存不提前展示', () => {
    const fresh = eligible()
    expect(earlyGrowthBlock(fresh)).toContain('初期')
    expect(advanceEarlyGrowth(fresh, 0).state).toBe(fresh)
    expect(renderToStaticMarkup(<EarlyGrowth state={fresh} />)).toBe('')
    const done = replayEarlyTraining(fresh)
    expect(earlyGrowthBlock(done)).toBe('')
    done.settings.spoiler = 'anime'; done.settings.animeLimit = 2
    expect(advanceEarlyGrowth(done, 0).state).toBe(done)
    expect(renderToStaticMarkup(<EarlyGrowth state={done} />)).toBe('')
  })
  it('夜灯/晨光/日间逐页保存，过期/跳页/非法/完成重复拒绝，主线与资源不变', async () => {
    let state = replayEarlyTraining(eligible())
    const before = structuredClone(state)
    for (let step = 0; step < 3; step++) {
      const html = renderToStaticMarkup(<EarlyGrowth state={state} onContinue={() => {}} />)
      expect(html).toContain(earlyGrowthScenes[step].title)
      expect(html).toContain(`修炼过渡插画：${earlyGrowthScenes[step].time}`)
      for (const invalid of [-1, step + 1, NaN, Infinity, .5]) expect(advanceEarlyGrowth(state, invalid).state).toBe(state)
      const result = advanceEarlyGrowth(state, step)
      expect(result.ok).toBe(true)
      state = parseSave(serializeSave(result.state))
      expect(advanceEarlyGrowth(state, step).state).toBe(state)
      await saveSlot(0, state); await saveSlot(1, state)
      for (const record of (await listSlots()).filter(record => [0, 1].includes(record.slot)))
        expect(saveRecordSummary(record, state.settings)).toContain(earlyGrowthSaveSummary(state, state.settings))
    }
    const expected = structuredClone(before); expected.earlyTraining.growth.stage = 3
    expect(state).toEqual(expected)
    expect(advanceEarlyGrowth(state, 3).state).toBe(state)
    const html = renderToStaticMarkup(<EarlyGrowth state={state} onContinue={() => {}} />)
    expect(html).toContain('在舆图查看第3章考核')
    expect(html).toContain('此次过渡不会代替考核结算')
    const records = await listSlots()
    expect(saveRecordSummary(records.find(record => record.slot === -1)!, state.settings)).toContain('成长过渡 · 翻阅中 2/3')
  })
  it('旧归档只补未翻阅；新版缺字段、越界或未归档却声称已读拒绝', () => {
    const done = replayEarlyTraining(eligible()), old = JSON.parse(JSON.stringify(done))
    old.contentVersion = '0.16.6'; delete old.earlyTraining.growth
    const migrated = validateState(old)
    expect(migrated.earlyTraining.growth).toEqual({ stage: 0 })
    expect(migrated.earlyTraining.practice.phase).toBe(4)
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    for (const stage of [-1, 4, .5, NaN, '1']) {
      const copy = structuredClone(done); copy.earlyTraining.growth.stage = stage as number
      expect(() => validateState(copy)).toThrow('重修')
    }
    const unready = eligible(); unready.earlyTraining.growth.stage = 1
    expect(() => validateState(unready)).toThrow('重修')
  })
  it('按查看者上限封存翻阅结果，旧已通关仍接回原旅程，查看不改记录', () => {
    const state = replayEarlyTraining(eligible(), false, undefined, false, true)
    const before = structuredClone(state)
    for (const animeLimit of [1, 2]) {
      const viewing = { ...state.settings, spoiler: 'anime' as const, animeLimit }
      expect(earlyGrowthSaveSummary(state, viewing)).toBe('成长过渡 · 当前范围封存')
      expect(savePreviewSummary(state, viewing)).toContain('成长过渡 · 当前范围封存')
      expect(savePreviewSummary(state, viewing)).not.toContain('成长过渡 · 已翻阅')
    }
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(validateState(state).earlyTraining.growth.stage).toBe(3)
    state.settings = before.settings
    expect(state).toEqual(before)
    state.completed.push(3)
    const html = renderToStaticMarkup(<EarlyGrowth state={state} onContinue={() => {}} />)
    expect(html).toContain('返回大陆舆图 · 继续原旅程')
    expect(html).not.toContain('在舆图查看第3章考核')
  })
  it('store每页读取最新状态，重复输入只提示且不写档，保留主线运行态', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => replayEarlyTraining(eligible()), write: async () => { writes++ } })
    await store.initialize()
    const runtime = store.getSnapshot().runtime, before = structuredClone(store.getSnapshot().state)
    expect(submitEarlyGrowth(store, 1)).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyGrowth(store, 0)).toBe(true)
    expect(submitEarlyGrowth(store, 0)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    before.earlyTraining.growth.stage = 1
    expect(store.getSnapshot().state).toEqual(before)
  })
})
