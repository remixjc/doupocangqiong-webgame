import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyLongSupplies, earlyLongSuppliesBlock, submitEarlyLongSupplies, type LongSupplyAction } from '../src/core/early-long-supplies'
import { longSupplyScenes } from '../src/content/early-long-supplies'
import { earlyLongSuppliesSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { longSupplyPlaceAt, type LongSupplyPlace } from '../src/core/early-training-state'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyLongSupplies from '../src/ui/EarlyLongSupplies'

const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined, false, false, false, false, false, false, false, false, false, false, false, true)
}
function actionFor(state: ReturnType<typeof eligible>, scene: typeof longSupplyScenes[number]): LongSupplyAction {
  return { step: scene.step, herbs: state.earlyTraining.longSupplies.herbs, cores: state.earlyTraining.longSupplies.cores, operation: scene.operation,
    item: scene.step === 1 ? 'herbs' : scene.step === 2 ? 'cores' : undefined }
}
describe('另购长期物资回溯，原包分拣与藏柜', () => {
  it('入口/前置/地点/封存保护，不把赠回或家族资金代签长期物资', () => {
    const state = eligible(), scene = longSupplyScenes[0], action = actionFor(state, scene)
    expect(earlyLongSuppliesBlock(state, teacher)).toBe('')
    for (const position of [{ x: NaN, y: 310 }, { x: 150, y: 310 }])
      expect(advanceEarlyLongSupplies(state, position, 'receipt', action).state).toBe(state)
    const waiting = structuredClone(state); waiting.earlyTraining.xunerVisit.stage = 6
    expect(earlyLongSuppliesBlock(waiting, teacher)).toContain('归档')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(advanceEarlyLongSupplies(state, teacher, 'receipt', action).state).toBe(state)
    expect(earlyLongSuppliesSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyLongSupplies state={state} position={teacher} onBack={() => {}} />)).not.toMatch(/八个月|39200|魔核包|房柜/)
  })
  it('六步断点/自动手动备份，同一批两类物资从原包到分格再入柜，其余所有记录保留', async () => {
    let state = eligible()
    const before = structuredClone(state)
    for (const scene of longSupplyScenes) {
      const action = actionFor(state, scene)
      expect(advanceEarlyLongSupplies(state, teacher, scene.station === 'receipt' ? 'cabinet' : 'receipt', action).state).toBe(state)
      const result = advanceEarlyLongSupplies(state, teacher, scene.station, action)
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      for (const item of ['herbs', 'cores'] as const) expect(state.earlyTraining.longSupplies[item]).toBe(longSupplyPlaceAt(scene.step + 1, item))
      expect(advanceEarlyLongSupplies(state, teacher, scene.station, action).state).toBe(state)
      await saveSlot(0, state); await saveSlot(3, state)
      for (const record of (await listSlots()).filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyLongSuppliesSaveSummary(state, state.settings))
      }
      const comparison = structuredClone(state); comparison.earlyTraining.longSupplies = { stage: 0, herbs: 'none', cores: 'none' }
      expect(comparison).toEqual(before)
    }
    expect(state.earlyTraining.consignment.owner).toBe('xiaoyan')
    expect(state.earlyTraining.recovery.energy).toBe('spent')
    expect(state.earlyTraining.xunerVisit.card).toBe('elders')
    expect(state.earlyTraining.settlement.net).toBe(39200)
    expect(earlyLongSuppliesSaveSummary(state, state.settings)).toContain('藏柜归档')
    expect(saveRecordSummary((await listSlots()).find(entry => entry.slot === -1)!, state.settings)).toContain('待合柜')
    const html = renderToStaticMarkup(<EarlyLongSupplies state={state} position={teacher} onBack={() => {}} />)
    expect(html).toContain('父亲来访之前'); expect(html).toContain('没有新增付款')
  })
  it('错包、缺包、过期保管快照和重复不能分拣或复制原包', () => {
    let state = eligible()
    const scene = longSupplyScenes[0], action = actionFor(state, scene)
    for (const change of [{ step: -1 }, { step: 6 }, { step: NaN }, { herbs: 'cabinet' as const }, { operation: 'store' as const }, { item: 'herbs' as const }])
      expect(advanceEarlyLongSupplies(state, teacher, 'receipt', { ...action, ...change }).state).toBe(state)
    state = advanceEarlyLongSupplies(state, teacher, 'receipt', action).state
    const sort = actionFor(state, longSupplyScenes[1])
    for (const item of [undefined, 'cores'] as const)
      expect(advanceEarlyLongSupplies(state, teacher, 'herbs', { ...sort, item }).state).toBe(state)
    state = advanceEarlyLongSupplies(state, teacher, 'herbs', sort).state
    expect(advanceEarlyLongSupplies(state, teacher, 'cores', { ...actionFor(state, longSupplyScenes[2]), item: 'herbs' }).state).toBe(state)
    for (const current of longSupplyScenes.slice(2)) state = advanceEarlyLongSupplies(state, teacher, current.station, actionFor(state, current)).state
    expect(advanceEarlyLongSupplies(state, teacher, 'cabinet', { step: 6, herbs: 'cabinet', cores: 'cabinet', operation: 'close' }).state).toBe(state)
  })
  it('旧档只补未参与，新版缺字段/阶段/位置组合/前置都严格校验', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.21.1'; delete old.earlyTraining.longSupplies
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion; expect(() => validateState(old)).toThrow('重修')
    for (const stage of [-1, .5, 7, NaN, Infinity, '1']) {
      const bad = structuredClone(state); bad.earlyTraining.longSupplies.stage = stage as number
      expect(() => validateState(bad)).toThrow('重修')
    }
    let advanced = state
    for (let stage = 0; stage <= 6; stage++) {
      for (const item of ['herbs', 'cores'] as const) for (const place of ['none', 'parcel', 'shelf', 'cabinet', 'copied'] as const) {
        if (place === advanced.earlyTraining.longSupplies[item]) continue
        const bad = structuredClone(advanced); bad.earlyTraining.longSupplies[item] = place as LongSupplyPlace
        expect(() => validateState(bad)).toThrow('重修')
      }
      if (stage > 0) {
        const bad = structuredClone(advanced); bad.earlyTraining.xunerVisit.stage = 6
        expect(() => validateState(bad)).toThrow('重修')
      }
      const scene = longSupplyScenes[stage]
      if (scene) advanced = advanceEarlyLongSupplies(advanced, teacher, scene.station, actionFor(advanced, scene)).state
    }
  })
  it('store失败不保存，正确分拣仅更新目标并保留runtime', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => eligible(), write: async () => { writes++ } })
    await store.initialize()
    const before = structuredClone(store.getSnapshot().state), runtime = store.getSnapshot().runtime
    const action = actionFor(before, longSupplyScenes[0])
    expect(submitEarlyLongSupplies(store, teacher, 'herbs', action)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyLongSupplies(store, teacher, 'receipt', action)).toBe(true)
    expect(submitEarlyLongSupplies(store, teacher, 'receipt', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    before.earlyTraining.longSupplies = { stage: 1, herbs: 'parcel', cores: 'parcel' }
    expect(store.getSnapshot().state).toEqual(before); expect(store.getSnapshot().runtime).toBe(runtime); expect(writes).toBe(1)
  })
})
