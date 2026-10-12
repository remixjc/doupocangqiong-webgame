import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { blankProgress, initialState, type GameState } from '../src/core/model'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { methodDiscussionAt, type MethodDiscussionState } from '../src/core/early-method-discussion-state'
import { apprenticeAt } from '../src/core/early-apprentice-state'
import { advanceEarlyFamilyVisit, familyVisitPlaces } from '../src/core/early-family-visit'
import { familyVisitScenes } from '../src/content/early-family-visit'
import { advanceEarlyFamilyCompensation } from '../src/core/early-family-compensation'
import { familyCompensationScenes } from '../src/content/early-family-compensation'
import { advanceEarlyFamilyContract, familyContractPlaces, type FamilyContractView } from '../src/core/early-family-contract'
import { familyContractScenes } from '../src/content/early-family-contract'
import { advanceEarlyMountainRing, mountainRingPlaces } from '../src/core/early-mountain-ring'
import { mountainRingScenes } from '../src/content/early-mountain-ring'
import { advanceEarlyApprentice } from '../src/core/early-apprentice'
import { apprenticeScenes } from '../src/content/early-apprentice'
import { advanceEarlyMethodDiscussion, submitEarlyMethodDiscussion, type MethodDiscussionAction } from '../src/core/early-method-discussion'
import { methodDiscussionScenes } from '../src/content/early-method-discussion'
import { earlyMethodDiscussionSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { GameStore } from '../src/core/store'
import EarlyMethodDiscussion from '../src/ui/EarlyMethodDiscussion'
import EarlyApprentice from '../src/ui/EarlyApprentice'
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
  for (const scene of familyContractScenes) {
    const task = state.earlyTraining.familyContract
    const view: FamilyContractView = task.yan === 'hall' ? { kind: 'yan', position: familyContractPlaces[scene.place] } : { kind: 'observer', place: scene.place }
    const result = advanceEarlyFamilyContract(state, view, { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  for (const scene of mountainRingScenes) {
    const result = advanceEarlyMountainRing(state, mountainRingPlaces[scene.place], { ...state.earlyTraining.mountainRing, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  for (const scene of apprenticeScenes) {
    const result = advanceEarlyApprentice(state, mountainRingPlaces[scene.place], { ...state.earlyTraining.apprentice, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  return state
}
function input(state: GameState): MethodDiscussionAction {
  const task = state.earlyTraining.methodDiscussion, scene = methodDiscussionScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'observer', operation: scene?.operation ?? 'archive' }
}
describe('C1g-3c1 功法前置、进化依据与尚未授卷', () => {
  it('28断点JSON/自动/手动/备份仅改说明，前置/提议/问答/未试/未授各自保存', async () => {
    let state = eligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.methodDiscussion.stage < 28) {
      const previous = state, result = advanceEarlyMethodDiscussion(state, mountainRingPlaces.stone, input(state))
      expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state))
      await saveSlot(0, state); await saveSlot(3, state)
      const records = await listSlots()
      for (const slot of [0, 3]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.methodDiscussion = before.earlyTraining.methodDiscussion
      expect(comparison).toEqual(before)
      const task = state.earlyTraining.methodDiscussion
      if (task.stage === 4) expect(task.alchemy).toBe('prerequisites')
      if (task.stage === 8) expect(task).toMatchObject({ offer: 'future-method', grade: 'unknown' })
      if (task.stage === 10) expect(task.grade).toBe('low-huang')
      if (task.stage === 13) expect(task).toMatchObject({ evolution: 'claimed', teacherTrial: 'unasked' })
      if (task.stage === 20) expect(task.teacherTrial).toBe('asked')
      if (task.stage === 21) expect(task.teacherTrial).toBe('untried')
      if (task.stage === 23) expect(task.otherTrial).toBe('untried')
      if (task.stage === 25) expect(task.basis).toBe('method-text')
      if (task.stage === 26) expect(task.viewing).toBe('requested')
      if (task.stage === 27) expect(task.viewing).toBe('deferred')
      expect(state.earlyTraining.mountainRing.ring).toBe('floating')
    }
    expect(state.earlyTraining.started).toBe(false)
    expect(earlyMethodDiscussionSaveSummary(state, state.settings)).toContain('未授卷，准备与返戒待续')
    expect(advanceEarlyMethodDiscussion(state, mountainRingPlaces.stone, input(state)).state).toBe(state)
  })
  it('完整快照、错人/序/远位/四错误支路/重复拒绝且不改state', () => {
    let state = eligible()
    while (state.earlyTraining.methodDiscussion.stage < 28) {
      const action = input(state)
      for (const operation of ['claim-scroll', 'grant-evolution', 'claim-profession', 'claim-trial'] as const) {
        const result = advanceEarlyMethodDiscussion(state, mountainRingPlaces.stone, { ...action, operation })
        expect(result.ok).toBe(false); expect(result.state).toBe(state)
      }
      for (const key of Object.keys(methodDiscussionAt(0)) as (keyof MethodDiscussionState)[])
        expect(advanceEarlyMethodDiscussion(state, mountainRingPlaces.stone, { ...action, [key]: 'stale' } as MethodDiscussionAction).state).toBe(state)
      expect(advanceEarlyMethodDiscussion(state, mountainRingPlaces.stone, { ...action, actor: action.actor === 'yan' ? 'elder' : 'yan' }).state).toBe(state)
      if (action.operation !== 'archive') expect(advanceEarlyMethodDiscussion(state, mountainRingPlaces.stone, { ...action, operation: 'archive' }).state).toBe(state)
      for (const far of [mountainRingPlaces.ridge, { x: 675, y: 110 }, { x: NaN, y: 330 }])
        expect(advanceEarlyMethodDiscussion(state, far, action).state).toBe(state)
      const result = advanceEarlyMethodDiscussion(state, mountainRingPlaces.stone, action); expect(result.ok).toBe(true); state = result.state
      expect(advanceEarlyMethodDiscussion(state, mountainRingPlaces.stone, action).state).toBe(state)
    }
  })
  it('0.42只补空、新缺拒绝，所有派生值/非法阶段与本人归档前置', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.42.0'; delete old.earlyTraining.methodDiscussion
    expect(validateState(old)).toEqual(state)
    old.contentVersion = '0.43.0'; expect(() => validateState(old)).toThrow()
    const all = Array.from({ length: 29 }, (_, stage) => methodDiscussionAt(stage))
    for (const task of all) {
      const next = structuredClone(state); next.earlyTraining.methodDiscussion = task
      expect(parseSave(serializeSave(next))).toEqual(next)
      for (const key of Object.keys(task) as (keyof MethodDiscussionState)[]) {
        if (key === 'stage') continue
        for (const value of new Set(all.map(other => other[key]))) if (value !== task[key]) {
          const bad = JSON.parse(JSON.stringify(next)); bad.earlyTraining.methodDiscussion[key] = value
          expect(() => validateState(bad)).toThrow()
        }
      }
      if (task.stage) {
        const bad = structuredClone(next); bad.earlyTraining.apprentice = apprenticeAt(24)
        expect(() => validateState(bad)).toThrow()
      }
    }
    for (const stage of [-1, 29, .5, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.methodDiscussion.stage = stage
      expect(() => validateState(bad)).toThrow()
    }
  })
  it('四错误可见、当前姓名/古戒/未授明确、旧摘要随进度与剧透1全封存', () => {
    const state = eligible()
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续功法说明')
    for (const [stage, text] of [[4, '尝试把前置说明登记为炼药职业'], [13, '尝试把口头说明登记为功法已进化'],
      [25, '尝试把文字依据登记为试验成功'], [27, '尝试在暂缓传授后取得卷轴']] as const) {
      state.earlyTraining.methodDiscussion = methodDiscussionAt(stage)
      expect(renderToStaticMarkup(<EarlyMethodDiscussion state={state} onBack={() => {}} />)).toContain(text)
    }
    state.earlyTraining.methodDiscussion = methodDiscussionAt(28)
    const done = renderToStaticMarkup(<EarlyMethodDiscussion state={state} onBack={() => {}} />)
    expect(done).toContain('已报名字的药老'); expect(done).toContain('老人处浮空的同一古戒'); expect(done).not.toContain('右手佩戴的同一古戒')
    expect(done).toContain('本片段未授功法卷轴')
    expect(renderToStaticMarkup(<EarlyApprentice state={state} onBack={() => {}} />)).toContain('未授卷，准备与返戒待续')
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyMethodDiscussion state={limited} onBack={() => {}} />)).not.toMatch(/后山|古戒|授卷|拜师|药老/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续功法说明')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/后山|古戒|授卷|拜师|药老/)
    expect(advanceEarlyMethodDiscussion(limited, mountainRingPlaces.stone, input(limited)).state).toBe(limited)
    expect(advanceEarlyMethodDiscussion(initialState(), mountainRingPlaces.stone, input(initialState())).ok).toBe(false)
  })
  it('store拒绝零写、合法一次、runtime保持', async () => {
    const state = eligible(); let writes = 0
    const store = new GameStore({ load: async () => state, write: async () => { writes++ } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyMethodDiscussion(store, mountainRingPlaces.stone, { ...input(state), operation: 'claim-scroll' })).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyMethodDiscussion(store, mountainRingPlaces.stone, input(state))).toBe(true)
    expect(submitEarlyMethodDiscussion(store, mountainRingPlaces.stone, input(state))).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
