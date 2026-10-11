import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyHall, submitEarlyHall, enterEarlyHall, earlyHallPlaces } from '../src/core/early-hall'
import { earlyHallScenes } from '../src/content/early-hall'
import { earlyHallSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyHall from '../src/ui/EarlyHall'

function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return enterEarlyHall(replayEarlyTraining(validateState(old)), { x: 575, y: 310 }).state
}
describe('堂内切磋观察与两卷保管链', () => {
  it('东侧藏卷/西侧练习，八步严格位置与顺序，第一卷归回后另一卷登记才借出', async () => {
    let state = eligible()
    const before = structuredClone(state)
    const scrolls = ['reading-first', 'reading-first', 'reading-first', 'reading-first', 'none', 'selected-second', 'borrowed-second', 'borrowed-second']
    for (const [index, scene] of earlyHallScenes.entries()) {
      const position = earlyHallPlaces.find(place => place.id === scene.place)!
      expect(advanceEarlyHall(state, { x: 0, y: 0 }, { step: scene.stage, operation: scene.operation }).state).toBe(state)
      for (const step of [-1, NaN, Infinity, .5, scene.stage + 1])
        expect(advanceEarlyHall(state, position, { step, operation: scene.operation }).state).toBe(state)
      const wrongPlace = earlyHallPlaces.find(place => place.id !== scene.place)!
      expect(advanceEarlyHall(state, wrongPlace, { step: scene.stage, operation: scene.operation }).state).toBe(state)
      expect(advanceEarlyHall(state, position, { step: scene.stage, operation: 'bad' as 'read' }).state).toBe(state)
      const html = renderToStaticMarkup(<EarlyHall state={state} onBack={() => {}} />)
      expect(html).toContain('东侧藏卷，西侧习武')
      if (scene.stage === 4) expect(html).toContain('薰儿胜出，萧宁退至练习区外')
      const result = advanceEarlyHall(state, position, { step: scene.stage, operation: scene.operation })
      expect(result.ok).toBe(true)
      state = parseSave(serializeSave(result.state))
      expect(state.earlyTraining.hall).toEqual({ stage: scene.stage + 1, scroll: scrolls[index] })
      expect(advanceEarlyHall(state, position, { step: scene.stage, operation: scene.operation }).state).toBe(state)
      await saveSlot(0, state); await saveSlot(2, state)
      const records = (await listSlots()).filter(entry => [0, 2].includes(entry.slot))
      expect(records).toHaveLength(2)
      for (const record of records) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyHallSaveSummary(state, state.settings))
      }
    }
    const expected = structuredClone(before); expected.earlyTraining.hall = { stage: 9, scroll: 'borrowed-second' }
    expect(state).toEqual(expected)
    expect(renderToStaticMarkup(<EarlyHall state={state} onBack={() => {}} />)).toContain('离堂与回房已记录')
    expect(earlyHallSaveSummary(state, state.settings)).toBe('斗技堂 · 已离堂，借卷由萧炎保管')
  })
  it('0.17.0仅补无卷册，所有新阶段/保管组合和新版缺字段校验', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.17.0'; delete old.earlyTraining.hall.scroll
    expect(validateState(old)).toEqual(state)
    old.earlyTraining.hall.stage = 2
    expect(() => validateState(old)).toThrow('重修')
    old.earlyTraining.hall.stage = 1; old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    for (let stage = 0; stage <= 9; stage++) for (const scroll of ['none', 'reading-first', 'selected-second', 'borrowed-second', '<script>']) {
      const copy = structuredClone(state)
      copy.earlyTraining.hall = { stage, scroll: scroll as 'none' }
      const expected = stage >= 8 ? 'borrowed-second' : stage === 7 ? 'selected-second' : stage >= 2 && stage <= 5 ? 'reading-first' : 'none'
      if (scroll === expected) expect(validateState(copy)).toEqual(copy)
      else expect(() => validateState(copy)).toThrow('重修')
    }
  })
  it('范围封存不暴露人物和借卷状态，store失败不写且只改独立任务', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => eligible(), write: async () => { writes++ } })
    await store.initialize()
    const runtime = store.getSnapshot().runtime, before = structuredClone(store.getSnapshot().state)
    const shelves = earlyHallPlaces.find(place => place.id === 'shelves')!
    expect(submitEarlyHall(store, shelves, { step: 2, operation: 'read' })).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyHall(store, shelves, { step: 1, operation: 'read' })).toBe(true)
    expect(submitEarlyHall(store, shelves, { step: 1, operation: 'read' })).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    before.earlyTraining.hall = { stage: 2, scroll: 'reading-first' }
    expect(store.getSnapshot().state).toEqual(before)
    expect(store.getSnapshot().runtime).toBe(runtime); expect(writes).toBe(1)
    const blocked = structuredClone(before); blocked.settings.spoiler = 'anime'; blocked.settings.animeLimit = 2
    expect(advanceEarlyHall(blocked, shelves, { step: 2, operation: 'observe' }).state).toBe(blocked)
    const html = renderToStaticMarkup(<EarlyHall state={blocked} onBack={() => {}} />)
    expect(html).not.toContain('薰儿'); expect(html).not.toContain('第一卷')
    expect(earlyHallSaveSummary(before, blocked.settings)).toBe('斗技堂 · 当前范围封存')
  })
})
