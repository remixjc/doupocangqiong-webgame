import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyEighthTraining, earlyEighthTrainingBlock, submitEarlyEighthTraining, eighthPlaces,
  eighthTrainingBeats, eighthTrainingOperation, moveEighthWalker, nearEighthPlace, type EighthTrainingAction } from '../src/core/early-eighth-training'
import { eighthTrainingScenes } from '../src/content/early-eighth-training'
import { earlyEighthTrainingSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyEighthTraining from '../src/ui/EarlyEighthTraining'
const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true)
}
function action(state: ReturnType<typeof eligible>, operation?: EighthTrainingAction['operation'], marker?: number): EighthTrainingAction {
  const task = state.earlyTraining.eighthTraining
  return { ...task, operation: operation ?? eighthTrainingOperation(task),
    marker: marker ?? (eighthTrainingBeats(task.stage) && operation !== 'stop' ? .5 : undefined) }
}
function act(state: ReturnType<typeof eligible>, operation?: EighthTrainingAction['operation'], marker?: number) {
  const scene = eighthTrainingScenes[state.earlyTraining.eighthTraining.stage]
  return advanceEarlyEighthTraining(state, teacher, eighthPlaces[scene?.place ?? 'door'], action(state, operation, marker))
}
function next(state: ReturnType<typeof eligible>, operation?: EighthTrainingAction['operation'], marker?: number) {
  const result = act(state, operation, marker); expect(result.ok, result.message).toBe(true); return result.state
}
describe('同行/日常训练/未突破时段/夜间八段独立序列', () => {
  it('每个动作断点JSON/自动手动备份往返，同行和夜间结果各自确认，所有其他状态保留', async () => {
    let state = eligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.eighthTraining.stage < 15) {
      const previous = state, scene = eighthTrainingScenes[state.earlyTraining.eighthTraining.stage], input = action(state)
      state = parseSave(serializeSave(next(state)))
      expect(advanceEarlyEighthTraining(state, teacher, eighthPlaces[scene.place], input).state).toBe(state)
      await saveSlot(0, state); await saveSlot(2, state)
      const records = await listSlots()
      for (const record of records.filter(entry => [0, 2].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyEighthTrainingSaveSummary(state, state.settings))
      }
      expect(parseSave(records.find(entry => entry.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.eighthTraining = before.earlyTraining.eighthTraining
      expect(comparison).toEqual(before)
      if (state.earlyTraining.eighthTraining.stage === 5) expect(state.earlyTraining.eighthTraining.outing).toBe('promised')
      if (state.earlyTraining.eighthTraining.stage === 6) expect(state.earlyTraining.eighthTraining.outing).toBe('completed')
      if (state.earlyTraining.eighthTraining.stage === 13) {
        expect(state.earlyTraining.eighthTraining.result).toBe('none')
        expect(earlyEighthTrainingSaveSummary(state, state.settings)).toContain('尚待感知')
      }
    }
    expect(state.earlyTraining.eighthTraining).toEqual({ stage: 15, beats: 0, attempts: 0,
      outing: 'completed', period: 'reviewed', energy: 'little', result: 'eighth-duan' })
    expect(act(state).state).toBe(state)
  })
  it('错序/错时机/主动停练免费只重开当前轮；非法时机、过期完整快照和重试上限拒绝', () => {
    let state = eligible()
    while (state.earlyTraining.eighthTraining.stage < 7) state = next(state)
    const before = structuredClone(state)
    for (const marker of [undefined, NaN, Infinity, -1, 2]) {
      expect(advanceEarlyEighthTraining(state, teacher, eighthPlaces.mountain, { ...action(state), marker }).state).toBe(state)
    }
    expect(act(state, 'sense').state).toBe(state)
    state = next(state, 'push')
    expect(state.earlyTraining.eighthTraining).toMatchObject({ stage: 7, beats: 0, attempts: 1 })
    state = next(state, 'pull', .35); const stale = action(state)
    state = next(state, 'stop')
    expect(advanceEarlyEighthTraining(state, teacher, eighthPlaces.mountain, stale).state).toBe(state)
    state = next(state, 'pull', .65); state = next(state, 'push', 0)
    expect(state.earlyTraining.eighthTraining).toMatchObject({ stage: 7, beats: 0, attempts: 3 })
    const cap = structuredClone(state); cap.earlyTraining.eighthTraining.attempts = 1_000_000
    expect(act(cap, 'stop').state).toBe(cap); expect(act(cap, 'pull', 0).state).toBe(cap)
    state = next(state); state = next(state)
    while (state.earlyTraining.eighthTraining.stage < 12) state = next(state)
    state = next(state, 'night-breath'); state = next(state, 'night-breath', 0)
    expect(state.earlyTraining.eighthTraining).toMatchObject({ stage: 12, beats: 0, attempts: 4, energy: 'little', result: 'none' })
    const comparison = structuredClone(state); comparison.earlyTraining.eighthTraining = before.earlyTraining.eighthTraining
    expect(comparison).toEqual(before)
  })
  it('旧0.27.1仅补未参与；新版缺字段、互相矛盾结果、缺前置、错误地点与完整快照拒绝', () => {
    let state = eligible(); const old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.27.1'; delete old.earlyTraining.eighthTraining
    expect(validateState(old).earlyTraining.eighthTraining).toEqual(state.earlyTraining.eighthTraining)
    old.contentVersion = '0.28.0'; expect(() => validateState(old)).toThrow()
    while (true) {
      const task = state.earlyTraining.eighthTraining
      for (const change of [{ stage: -1 }, { stage: 16 }, { stage: .5 }, { beats: 99 }, { attempts: -1 }, { attempts: 1_000_001 },
        { outing: task.outing === 'none' ? 'completed' : 'none' }, { period: task.period === 'none' ? 'reviewed' : 'none' },
        { energy: task.energy === 'active' ? 'little' : 'active' }, { result: task.result === 'none' ? 'eighth-duan' : 'none' }]) {
        const bad = structuredClone(state); Object.assign(bad.earlyTraining.eighthTraining, change)
        expect(() => validateState(bad)).toThrow()
      }
      if (task.stage === 15) break
      const scene = eighthTrainingScenes[task.stage], input = action(state)
      expect(advanceEarlyEighthTraining(state, { x: 0, y: 0 }, eighthPlaces[scene.place], input).state).toBe(state)
      expect(advanceEarlyEighthTraining(state, teacher, { x: NaN, y: 120 }, input).state).toBe(state)
      const wrongPlace = scene.place === 'fork' ? eighthPlaces.bed : eighthPlaces.fork
      expect(advanceEarlyEighthTraining(state, teacher, wrongPlace, input).state).toBe(state)
      expect(advanceEarlyEighthTraining(state, teacher, eighthPlaces[scene.place], { ...input, energy: 'little' === input.energy ? 'active' : 'little' }).state).toBe(state)
      const bad = structuredClone(state); bad.earlyTraining.keChallenge.stage = 11
      expect(earlyEighthTrainingBlock(bad, teacher)).not.toBe('')
      if (task.stage) expect(() => validateState(bad)).toThrow()
      state = next(state)
    }
  })
  it('步长20边界/所有地点可达；范围封存、退出入口和store幂等不改runtime', async () => {
    const visited = new Set<string>(), queue: { x: number; y: number }[] = [{ ...eighthPlaces.fork }]
    while (queue.length) {
      const position = queue.shift()!, key = `${position.x},${position.y}`
      if (visited.has(key)) continue
      visited.add(key)
      for (const direction of ['up', 'left', 'down', 'right'] as const) {
        const target = moveEighthWalker(position, direction)
        if (!visited.has(`${target.x},${target.y}`)) queue.push(target)
      }
    }
    for (const place of Object.values(eighthPlaces)) expect([...visited].some(key => {
      const [x, y] = key.split(',').map(Number)
      return nearEighthPlace({ x, y }, Object.entries(eighthPlaces).find(([, value]) => value === place)![0] as keyof typeof eighthPlaces)
    })).toBe(true)
    const state = eligible(); let writes = 0
    const store = new GameStore({ load: async () => state, write: async () => { writes++ } }); await store.initialize()
    const input = action(store.getSnapshot().state), runtime = store.getSnapshot().runtime
    expect(submitEarlyEighthTraining(store, teacher, eighthPlaces.bed, input)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyEighthTraining(store, teacher, eighthPlaces.fork, input)).toBe(true)
    expect(submitEarlyEighthTraining(store, teacher, eighthPlaces.fork, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const markup = renderToStaticMarkup(<EarlyEighthTraining state={state} position={teacher} onBack={() => {}} />)
    expect(markup).toContain('礼前训练 0/15'); expect(markup).toContain('约好明日同行')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(earlyEighthTrainingSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyEighthTraining state={state} position={teacher} onBack={() => {}} />)).not.toMatch(/八段|薰儿|木盆|同行/)
  })
})
