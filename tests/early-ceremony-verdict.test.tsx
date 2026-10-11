import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyCeremonyVerdict, earlyCeremonyVerdictBlock, submitEarlyCeremonyVerdict, verdictPlaces, nearVerdictPlace, type CeremonyVerdictAction } from '../src/core/early-ceremony-verdict'
import { moveNingWalker } from '../src/core/early-ning-first'
import { ceremonyVerdictScenes } from '../src/content/early-ceremony-verdict'
import { earlyCeremonyVerdictSaveSummary, earlyNingFirstSaveSummary, earlyNingSecondSaveSummary, earlyCeremonialTestSaveSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyCeremonyVerdict from '../src/ui/EarlyCeremonyVerdict'
const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true)
}
function input(state: ReturnType<typeof eligible>): CeremonyVerdictAction {
  const task = state.earlyTraining.ceremonyVerdict, scene = ceremonyVerdictScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'xiaoyan', operation: scene?.operation ?? 'archive' }
}
function advance(state: ReturnType<typeof eligible>) {
  const scene = ceremonyVerdictScenes[state.earlyTraining.ceremonyVerdict.stage]
  const result = advanceEarlyCeremonyVerdict(state, teacher, verdictPlaces[scene?.place ?? 'exit'], input(state))
  expect(result.ok, result.message).toBe(true); return result.state
}
describe('双请求被拦、处分与正式胜负分开，礼终离场两次婉拒不发物品', () => {
  it('16断点JSON自动手动备份与其他全状态不变量，处分阶段仍pending，宣布才胜、整体礼程仍未结束', async () => {
    let state = eligible(); const before = structuredClone(state); await saveSlot(0, state)
    while (state.earlyTraining.ceremonyVerdict.stage < 16) {
      const previous = state, scene = ceremonyVerdictScenes[state.earlyTraining.ceremonyVerdict.stage], stale = input(state)
      state = parseSave(serializeSave(advance(state)))
      expect(advanceEarlyCeremonyVerdict(state, teacher, verdictPlaces[scene.place], stale).state).toBe(state)
      await saveSlot(0, state); await saveSlot(1, state)
      const records = await listSlots()
      for (const slot of [0, 1]) expect(parseSave(records.find(record => record.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(record => record.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.ceremonyVerdict = before.earlyTraining.ceremonyVerdict
      expect(comparison).toEqual(before)
      const task = state.earlyTraining.ceremonyVerdict
      if (task.stage === 6) {
        expect(task).toMatchObject({ yu: 'blocked', xuner: 'blocked', penalty: 3, verdict: 'pending' })
        expect(earlyCeremonyVerdictSaveSummary(state, state.settings)).toContain('胜负尚待宣布')
      }
      if (task.stage === 7) {
        expect(task).toMatchObject({ verdict: 'xiaoyan', rite: 'none' })
        for (const summary of [earlyNingFirstSaveSummary, earlyNingSecondSaveSummary, earlyCeremonialTestSaveSummary])
          expect(summary(state, state.settings)).toContain('胜负已宣布')
      }
      if (task.stage === 14) expect(task).toMatchObject({ technique: 'declined', method: 'offered', nextHall: 'none' })
      if (task.stage === 15) expect(task).toMatchObject({ method: 'declined', nextHall: 'five-days' })
    }
    expect(state.earlyTraining.ceremonyVerdict).toMatchObject({ stage: 16, verdict: 'xiaoyan', rite: 'ended', technique: 'declined', method: 'declined' })
    expect(advanceEarlyCeremonyVerdict(state, teacher, verdictPlaces.exit, input(state)).state).toBe(state)
  })
  it('第三场/领取未传授物品/错身份/远地点/旧快照拒绝；首轮与再攻完成前不能开启', () => {
    let state = eligible()
    while (state.earlyTraining.ceremonyVerdict.stage < 16) {
      const scene = ceremonyVerdictScenes[state.earlyTraining.ceremonyVerdict.stage], action = input(state)
      for (const operation of ['fight', 'take-method', 'take-technique'] as const)
        expect(advanceEarlyCeremonyVerdict(state, teacher, verdictPlaces[scene.place], { ...action, operation }).state).toBe(state)
      expect(advanceEarlyCeremonyVerdict(state, teacher, verdictPlaces[scene.place], { ...action, actor: action.actor === 'observe' ? 'xiaoyan' : 'observe' }).state).toBe(state)
      expect(advanceEarlyCeremonyVerdict(state, teacher, { x: 300, y: 160 }, action).state).toBe(state)
      expect(advanceEarlyCeremonyVerdict(state, teacher, { x: NaN, y: 280 }, action).state).toBe(state)
      expect(advanceEarlyCeremonyVerdict(state, { x: 0, y: 0 }, verdictPlaces[scene.place], action).state).toBe(state)
      const bad = structuredClone(state); bad.earlyTraining.ningSecond.stage = 7
      expect(earlyCeremonyVerdictBlock(bad, teacher)).not.toBe('')
      if (state.earlyTraining.ceremonyVerdict.stage) expect(() => validateState(bad)).toThrow()
      state = advance(state)
    }
  })
  it('旧0.32仅补未参与，新缺字段和所有阶段的矛盾请求/处分/胜负/礼程/支持/五天安排拒绝', () => {
    let state = eligible(); const old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.32.0'; delete old.earlyTraining.ceremonyVerdict
    expect(validateState(old).earlyTraining.ceremonyVerdict).toEqual(state.earlyTraining.ceremonyVerdict)
    old.contentVersion = '0.33.0'; expect(() => validateState(old)).toThrow()
    while (true) {
      const task = state.earlyTraining.ceremonyVerdict
      for (const stage of [-1, 17, .5, NaN]) {
        const bad = structuredClone(state); bad.earlyTraining.ceremonyVerdict.stage = stage
        expect(() => validateState(bad)).toThrow()
      }
      for (const key of ['yu', 'xuner', 'penalty', 'verdict', 'rite', 'technique', 'method', 'nextHall'] as const) {
        const bad = JSON.parse(JSON.stringify(state))
        bad.earlyTraining.ceremonyVerdict[key] = key === 'penalty' ? task.penalty === 0 ? 3 : 0
          : task[key] === 'none' ? 'blocked' : 'none'
        expect(() => validateState(bad)).toThrow()
      }
      if (task.stage === 16) break
      state = advance(state)
    }
  })
  it('行走网格全部地点可达、栏边不穿，store只成功写/runtime不变；画面没有第三场且封存', async () => {
    const queue: { x: number; y: number }[] = [{ ...verdictPlaces.stairs }], reached = new Set<string>(['440,240'])
    for (let i = 0; i < queue.length; i++) for (const direction of ['up', 'left', 'down', 'right'] as const) {
      const p = moveNingWalker(queue[i], direction), key = `${p.x},${p.y}`
      if (!reached.has(key)) { reached.add(key); queue.push(p) }
    }
    for (const place of Object.keys(verdictPlaces) as (keyof typeof verdictPlaces)[])
      expect(queue.some(p => nearVerdictPlace(p, place))).toBe(true)
    const edge = { x: 540, y: 240 }; expect(moveNingWalker(edge, 'up')).toBe(edge)
    let state = eligible(); while (state.earlyTraining.ceremonyVerdict.stage < 6) state = advance(state)
    const action = input(state); let writes = 0
    const store = new GameStore({ load: async () => state, write: async () => { writes++ } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyCeremonyVerdict(store, teacher, verdictPlaces.stairs, { ...action, operation: 'fight' })).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyCeremonyVerdict(store, teacher, verdictPlaces.stairs, action)).toBe(true)
    expect(submitEarlyCeremonyVerdict(store, teacher, verdictPlaces.stairs, action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    expect(renderToStaticMarkup(<EarlyCeremonyVerdict state={store.getSnapshot().state} position={teacher} onBack={() => {}} />)).toContain('二长老已经正式宣布萧炎获胜')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(earlyCeremonyVerdictSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyCeremonyVerdict state={state} position={teacher} onBack={() => {}} />)).not.toMatch(/萧宁|功法|薰儿|处分/)
  })
})
