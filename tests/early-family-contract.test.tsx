import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { blankProgress, initialState, type GameState } from '../src/core/model'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { parseEarlyTraining } from '../src/core/early-training-state'
import { familyContractAt, type FamilyContractState } from '../src/core/early-family-contract-state'
import { familyCompensationAt } from '../src/core/early-family-compensation-state'
import { advanceEarlyFamilyVisit, familyVisitPlaces, moveFamilyVisitWalker } from '../src/core/early-family-visit'
import { familyVisitScenes } from '../src/content/early-family-visit'
import { advanceEarlyFamilyCompensation } from '../src/core/early-family-compensation'
import { familyCompensationScenes } from '../src/content/early-family-compensation'
import { advanceEarlyFamilyContract, familyContractPlaces, familyContractNear, submitEarlyFamilyContract,
  type FamilyContractView, type FamilyContractAction } from '../src/core/early-family-contract'
import { familyContractScenes } from '../src/content/early-family-contract'
import { earlyFamilyContractSaveSummary, earlyFamilyVisitSaveSummary, earlyFamilyCompensationSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { GameStore } from '../src/core/store'
import EarlyFamilyContract from '../src/ui/EarlyFamilyContract'
import EarlyFamilyVisit from '../src/ui/EarlyFamilyVisit'
import EarlyFamilyCompensation from '../src/ui/EarlyFamilyCompensation'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'

function eligible(): GameState {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  let state = validateState(old)
  for (const scene of familyVisitScenes) {
    const result = advanceEarlyFamilyVisit(state, familyVisitPlaces[scene.place], { ...state.earlyTraining.familyVisit, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  for (const scene of familyCompensationScenes) {
    const result = advanceEarlyFamilyCompensation(state, familyVisitPlaces[scene.place], { ...state.earlyTraining.familyCompensation, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  return state
}
function input(state: GameState): FamilyContractAction {
  const task = state.earlyTraining.familyContract, scene = familyContractScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'observer', operation: scene?.operation ?? 'archive' }
}
function view(state: GameState): FamilyContractView {
  const task = state.earlyTraining.familyContract, place = familyContractScenes[task.stage]?.place ?? 'outside'
  return task.yan === 'left' ? { kind: 'observer', place } : { kind: 'yan', position: familyContractPlaces[place] }
}
describe('C1g-2b 文书、本人承诺、双方离厅与同一玉匣', () => {
  it('33合法断点JSON/自动/手动/备份只改新记录，提出不代承诺、写成不代置桌、离厅不代退匣', async () => {
    let state = eligible()
    const before = structuredClone(state); await saveSlot(0, state)
    while (state.earlyTraining.familyContract.stage < 33) {
      const previous = state, result = advanceEarlyFamilyContract(state, view(state), input(state))
      expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state))
      await saveSlot(0, state); await saveSlot(1, state)
      const records = await listSlots()
      for (const slot of [0, 1]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.familyContract = before.earlyTraining.familyContract
      expect(comparison).toEqual(before)
      const task = state.earlyTraining.familyContract
      if (task.stage === 7) expect(task).toMatchObject({ challenge: 'proposed', paper: 'none' })
      if (task.stage === 15) expect(task).toMatchObject({ paper: 'written', declaration: 'unspoken', yan: 'hall' })
      if (task.stage === 17) expect(task).toMatchObject({ paper: 'table', declaration: 'unspoken', challenge: 'renewed' })
      if (task.stage === 22) expect(task).toMatchObject({ challenge: 'pledged', yan: 'hall', paper: 'table' })
      if (task.stage === 24) expect(task).toMatchObject({ yan: 'left', paper: 'table', box: 'presented', guests: 'visiting' })
      if (task.stage === 25) expect(task).toMatchObject({ paper: 'nalan', box: 'presented' })
      if (task.stage === 28) expect(task).toMatchObject({ box: 'returned', warning: 'none' })
      if (task.stage === 29) expect(task).toMatchObject({ box: 'ring', guests: 'departing' })
      if (task.stage === 31) expect(task).toMatchObject({ warning: 'glimpse', guests: 'departing' })
      if (task.stage === 32) expect(task).toMatchObject({ guests: 'left', sword: 'departed' })
    }
    expect(advanceEarlyFamilyContract(state, view(state), input(state)).state).toBe(state)
    expect(state.earlyTraining.started).toBe(false)
    expect(earlyFamilyContractSaveSummary(state, state.settings)).toContain('双方离厅已归档')
  })
  it('全快照、错人/顺序/地点/旁观焦点、提前决斗/领奖/交父文书/收匣与重复均拒绝', () => {
    let state = eligible()
    while (state.earlyTraining.familyContract.stage < 33) {
      const action = input(state), currentView = view(state)
      for (const operation of ['start-duel', 'claim-victory', 'take-box', 'give-paper-father'] as const) {
        const result = advanceEarlyFamilyContract(state, currentView, { ...action, operation })
        expect(result.ok).toBe(false); expect(result.state).toBe(state)
      }
      for (const key of Object.keys(familyContractAt(0)) as (keyof FamilyContractState)[]) {
        const changed = { ...action, [key]: 'stale' } as FamilyContractAction
        expect(advanceEarlyFamilyContract(state, currentView, changed).state).toBe(state)
      }
      expect(advanceEarlyFamilyContract(state, currentView, { ...action, actor: action.actor === 'yan' ? 'nalan' : 'yan' }).state).toBe(state)
      if (action.operation !== 'archive') expect(advanceEarlyFamilyContract(state, currentView, { ...action, operation: 'archive' }).state).toBe(state)
      if (currentView.kind === 'yan') {
        expect(advanceEarlyFamilyContract(state, { kind: 'observer', place: familyContractScenes[action.stage].place }, action).state).toBe(state)
        for (const position of [{ x: 20, y: 20 }, { x: 240, y: 170 }, { x: NaN, y: 1 }])
          expect(advanceEarlyFamilyContract(state, { kind: 'yan', position }, action).state).toBe(state)
      } else {
        expect(advanceEarlyFamilyContract(state, { kind: 'yan', position: familyContractPlaces[currentView.place] }, action).state).toBe(state)
        expect(advanceEarlyFamilyContract(state, { kind: 'observer', place: 'room' }, action).state).toBe(state)
      }
      const result = advanceEarlyFamilyContract(state, currentView, action); expect(result.ok).toBe(true); state = result.state
      expect(advanceEarlyFamilyContract(state, currentView, action).state).toBe(state)
    }
  })
  it('0.39旧档只补空，新版缺字段拒绝，所有派生字段互换/阶段非法/缺前段均强校', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.39.0'; delete old.earlyTraining.familyContract
    expect(validateState(old)).toEqual(state)
    old.contentVersion = '0.40.0'; expect(() => validateState(old)).toThrow()
    const all = Array.from({ length: 34 }, (_, stage) => familyContractAt(stage))
    for (const task of all) {
      const next = structuredClone(state); next.earlyTraining.familyContract = task
      expect(parseSave(serializeSave(next))).toEqual(next)
      for (const key of Object.keys(task) as (keyof FamilyContractState)[]) {
        if (key === 'stage') continue
        for (const value of new Set(all.map(other => other[key]))) if (value !== task[key]) {
          const bad = JSON.parse(JSON.stringify(next)); bad.earlyTraining.familyContract[key] = value
          expect(() => validateState(bad)).toThrow()
        }
      }
      if (task.stage) {
        const bad = structuredClone(next); bad.earlyTraining.familyCompensation = familyCompensationAt(14)
        expect(() => parseEarlyTraining(bad.earlyTraining, [1, 2])).toThrow()
      }
    }
    for (const stage of [-1, 34, .2, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.familyContract.stage = stage
      expect(() => validateState(bad)).toThrow()
    }
  })
  it('文书桌与厅外经真实20步网格可达，厅门内不代实际离厅，墙和陈设继续阻挡', () => {
    const queue = [{ x: 270, y: 270 }], reached = new Set(['270,270'])
    for (let i = 0; i < queue.length; i++) for (const direction of ['up', 'left', 'down', 'right'] as const) {
      const next = moveFamilyVisitWalker(queue[i], direction), key = `${next.x},${next.y}`
      if (!reached.has(key)) { reached.add(key); queue.push(next) }
    }
    for (const scene of familyContractScenes) expect(queue.some(p => familyContractNear(p, scene.place))).toBe(true)
    expect(familyContractNear(familyVisitPlaces.entrance, 'outside')).toBe(false)
    for (const wall of [{ x: 220, y: 170 }, { x: 420, y: 230 }])
      expect(moveFamilyVisitWalker(wall, 'right')).toBe(wall)
    const state = eligible(); state.earlyTraining.familyContract = familyContractAt(23)
    expect(advanceEarlyFamilyContract(state, { kind: 'yan', position: familyVisitPlaces.entrance }, input(state)).state).toBe(state)
  })
  it('离厅后UI无本人/行走按钮、同一文书独立持有、错误选项可见、历史摘要跟随且剧透1完整封存', () => {
    const state = eligible()
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续文书与离厅')
    for (const [stage, text] of [[7, '尝试今日直接决斗'], [19, '尝试把文书交给父亲'], [27, '尝试先把玉匣收入行囊']] as const) {
      state.earlyTraining.familyContract = familyContractAt(stage)
      expect(renderToStaticMarkup(<EarlyFamilyContract state={state} onBack={() => {}} />)).toContain(text)
    }
    state.earlyTraining.familyContract = familyContractAt(24)
    const left = renderToStaticMarkup(<EarlyFamilyContract state={state} onBack={() => {}} />)
    expect(left).toContain('旁观焦点选择'); expect(left).toContain('已置桌的同一文书')
    expect(left).not.toMatch(/萧炎行走位置|文书向上走/)
    state.earlyTraining.familyContract = familyContractAt(33)
    const done = renderToStaticMarkup(<EarlyFamilyContract state={state} onBack={() => {}} />)
    expect(done).toContain('纳兰持有的同一文书'); expect(done).not.toContain('仍未接取的来客玉匣')
    expect(done).toContain('translate(145 245)'); expect(done).toContain('双方已离厅，纳兰携原文书')
    for (const summary of [earlyFamilyVisitSaveSummary, earlyFamilyCompensationSaveSummary])
      expect(summary(state, state.settings)).toContain('双方离厅已归档')
    for (const Component of [EarlyFamilyVisit, EarlyFamilyCompensation]) {
      const history = renderToStaticMarkup(<Component state={state} onBack={() => {}} />)
      expect(history).toContain('双方离厅已归档'); expect(history).not.toMatch(/仍在来客席的玉匣|文书与三年约定待续|萧炎仍在厅内/)
    }
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyFamilyContract state={limited} onBack={() => {}} />)).not.toMatch(/文书|纳兰|来客|三年/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续文书与离厅')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/文书|离厅|纳兰|三年/)
    expect(earlyFamilyContractSaveSummary(state, limited.settings)).toBe('前期记录 · 当前范围封存')
    expect(advanceEarlyFamilyContract(limited, view(limited), input(limited)).state).toBe(limited)
    const fresh = initialState()
    expect(advanceEarlyFamilyContract(fresh, view(fresh), input(fresh)).state).toBe(fresh)
  })
  it('store拒绝零写、合法单写及runtime保持', async () => {
    const state = eligible(); let writes = 0
    const store = new GameStore({ load: async () => state, write: async () => { writes++ } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyFamilyContract(store, view(state), { ...input(state), operation: 'claim-victory' })).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyFamilyContract(store, view(state), input(state))).toBe(true)
    expect(submitEarlyFamilyContract(store, view(state), input(state))).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
