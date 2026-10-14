import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyRecovery, earlyRecoveryBlock, submitEarlyRecovery, type EarlyRecoveryStation } from '../src/core/early-recovery'
import { earlyRecoveryScenes } from '../src/content/early-recovery'
import { earlyRecoverySaveSummary, saveRecordSummary, earlySupervisionSaveSummary } from '../src/core/save-preview'
import { earlyRoomPresentation } from '../src/core/early-room'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyRecovery from '../src/ui/EarlyRecovery'
import EarlyRoom from '../src/ui/EarlyRoom'

const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined, false, false, true, true, true)
}
function action(state: ReturnType<typeof eligible>, marker = .5) {
  const scene = earlyRecoveryScenes[state.earlyTraining.recovery.stage]
  return { step: scene.step, operation: scene.operation, energy: state.earlyTraining.recovery.energy, marker }
}
describe('训练后的药液恢复与独立结果', () => {
  it('只有督练归档/有效地点/可见范围才开放，旧主线不能代签', () => {
    const state = eligible()
    expect(earlyRecoveryBlock(state, teacher)).toBe('')
    const limitPending = structuredClone(state)
    limitPending.earlyTraining.firstExternalLimit.stage = 3
    limitPending.earlyTraining.firstExternalLimit.record = 'current'
    expect(earlyRecoveryBlock(limitPending, teacher)).toContain('限度说明与离林')
    for (const position of [{ x: NaN, y: 310 }, { x: 150, y: 310 }])
      expect(advanceEarlyRecovery(state, position, 'door', action(state)).state).toBe(state)
    const unfinished = structuredClone(state); unfinished.earlyTraining.supervision = { stage: 1, pulses: 3, attempts: 2 }
    expect(earlyRecoveryBlock(unfinished, teacher)).toContain('本轮督练')
    expect(earlyRecoveryBlock(initialState(), teacher)).toContain('第2章')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(advanceEarlyRecovery(state, teacher, 'door', action(state)).state).toBe(state)
    expect(earlyRecoverySaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyRecovery state={state} position={teacher} onBack={() => {}} />)).not.toContain('五段')
  })
  it('七步逐断点自动/手动/备份，同一容器渐淡耗尽、时段与五段分开，其他记录不变', async () => {
    let state = eligible()
    const before = structuredClone(state)
    for (const scene of earlyRecoveryScenes) {
      const input = action(state)
      expect(advanceEarlyRecovery(state, teacher, scene.station === 'door' ? 'window' : 'door', input).state).toBe(state)
      const result = advanceEarlyRecovery(state, teacher, scene.station, input)
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      expect(state.earlyTraining.recovery.stage).toBe(scene.step + 1)
      expect(advanceEarlyRecovery(state, teacher, scene.station, input).state).toBe(state)
      await saveSlot(0, state); await saveSlot(3, state)
      for (const record of (await listSlots()).filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyRecoverySaveSummary(state, state.settings))
      }
      if (scene.step === 2) expect(state.earlyTraining.recovery.energy).toBe('fading')
      if (scene.step === 3) expect(earlyRoomPresentation(state).water).toContain('只余清水')
      if (scene.step === 5) expect(state.earlyTraining.recovery).toEqual({ stage: 6, energy: 'spent', period: 'reviewed', result: 'none' })
    }
    before.earlyTraining.recovery = { stage: 7, energy: 'spent', period: 'reviewed', result: 'fifth-duan' }
    expect(state).toEqual(before)
    expect(state.earlyTraining.liquid.ready).toBe(true)
    expect(earlySupervisionSaveSummary(state, state.settings)).toContain('已回房恢复')
    expect(saveRecordSummary((await listSlots()).find(entry => entry.slot === -1)!, state.settings)).toContain('待感知结果')
    expect(renderToStaticMarkup(<EarlyRoom state={state} position={teacher} onBack={() => {}} />)).toContain('只余清水')
    expect(renderToStaticMarkup(<EarlyRecovery state={state} position={teacher} onBack={() => {}} />)).toContain('五段故事结果已记下')
    expect(advanceEarlyRecovery(state, teacher, 'window', { step: 6, operation: 'sense', energy: 'spent' }).state).toBe(state)
  })
  it('非法/错误时机免费保留药力，动作/位置/药力快照与重复不能跳步', () => {
    let state = eligible()
    for (const scene of earlyRecoveryScenes.slice(0, 2)) state = advanceEarlyRecovery(state, teacher, scene.station, action(state)).state
    for (const marker of [undefined, NaN, Infinity, -.1, 1.1, 0, 1, '0.5']) {
      const result = advanceEarlyRecovery(state, teacher, 'container', { ...action(state), marker: marker as number })
      expect(result.ok).toBe(false); expect(result.state).toBe(state)
    }
    for (const step of [-1, NaN, .5, Infinity, 3])
      expect(advanceEarlyRecovery(state, teacher, 'container', { ...action(state), step }).state).toBe(state)
    expect(advanceEarlyRecovery(state, teacher, 'bad' as EarlyRecoveryStation, action(state)).state).toBe(state)
    expect(advanceEarlyRecovery(state, teacher, 'container', { ...action(state), energy: 'spent' }).state).toBe(state)
    expect(advanceEarlyRecovery(state, teacher, 'container', { ...action(state), operation: 'sense' }).state).toBe(state)
    state = advanceEarlyRecovery(state, teacher, 'container', action(state, .35)).state
    expect(advanceEarlyRecovery(state, teacher, 'container', action(state, .65)).ok).toBe(true)
  })
  it('旧督练档只补未参与，新版缺字段/不可能药力及前置拒绝', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.18.0'; delete old.earlyTraining.recovery
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    for (const task of [{ stage: 1, energy: 'active', period: 'unreviewed', result: 'none' },
      { stage: 3, energy: 'spent', period: 'unreviewed', result: 'none' },
      { stage: 6, energy: 'spent', period: 'unreviewed', result: 'none' },
      { stage: 6, energy: 'spent', period: 'reviewed', result: 'fifth-duan' },
      { stage: 7, energy: 'spent', period: 'reviewed', result: 'none' },
      { stage: 8, energy: 'spent', period: 'reviewed', result: 'fifth-duan' }]) {
      const bad = structuredClone(state); Object.assign(bad.earlyTraining.recovery, task)
      expect(() => validateState(bad)).toThrow('重修')
    }
    for (const stage of [-1, .5, NaN, Infinity, '1']) {
      const bad = structuredClone(state); bad.earlyTraining.recovery.stage = stage as number
      expect(() => validateState(bad)).toThrow('重修')
    }
    const bad = advanceEarlyRecovery(state, teacher, 'door', action(state)).state
    bad.earlyTraining.supervision = { stage: 1, pulses: 3, attempts: 2 }
    expect(() => validateState(bad)).toThrow('重修')
  })
  it('store从最新状态提交，失败不写，成功只更新恢复记录与保留runtime', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => eligible(), write: async () => { writes++ } })
    await store.initialize()
    const before = structuredClone(store.getSnapshot().state), runtime = store.getSnapshot().runtime, input = action(before)
    expect(submitEarlyRecovery(store, teacher, 'container', input)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyRecovery(store, teacher, 'door', input)).toBe(true)
    expect(submitEarlyRecovery(store, teacher, 'door', input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    before.earlyTraining.recovery.stage = 1
    expect(store.getSnapshot().state).toEqual(before)
    expect(store.getSnapshot().runtime).toBe(runtime); expect(writes).toBe(1)
  })
})
