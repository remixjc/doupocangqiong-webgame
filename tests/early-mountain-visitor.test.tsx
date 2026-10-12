import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, type GameState } from '../src/core/model'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { mountainVisitorAt, type MountainVisitorState } from '../src/core/early-mountain-visitor-state'
import { preparationBriefAt } from '../src/core/early-preparation-brief-state'
import { mountainRingPlaces } from '../src/core/early-mountain-ring'
import { advanceEarlyPreparationBrief } from '../src/core/early-preparation-brief'
import { preparationBriefScenes } from '../src/content/early-preparation-brief'
import { advanceEarlyMountainVisitor, submitEarlyMountainVisitor, type MountainVisitorAction, type MountainVisitorView } from '../src/core/early-mountain-visitor'
import { mountainVisitorScenes } from '../src/content/early-mountain-visitor'
import { earlyMountainVisitorSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { GameStore } from '../src/core/store'
import { beginEarlyTraining, advanceEarlyTraining } from '../src/core/early-training'
import EarlyMountainVisitor from '../src/ui/EarlyMountainVisitor'
import EarlyPreparationBrief from '../src/ui/EarlyPreparationBrief'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import { preparationBriefEligible } from './helpers/mountain-discussion-replay'
function eligible(): GameState {
  let state = preparationBriefEligible()
  for (const scene of preparationBriefScenes) {
    const result = advanceEarlyPreparationBrief(state, mountainRingPlaces[scene.place], { ...state.earlyTraining.preparationBrief, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  return state
}
function input(state: GameState): MountainVisitorAction {
  const task = state.earlyTraining.mountainVisitor, scene = mountainVisitorScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'observer', operation: scene?.operation ?? 'archive' }
}
function view(state: GameState): MountainVisitorView {
  const task = state.earlyTraining.mountainVisitor, scene = mountainVisitorScenes[task.stage]
  return task.yan === 'left' ? { kind: 'observer', place: scene?.place ?? 'stone' } : { kind: 'yan', position: mountainRingPlaces[scene.place] }
}
describe('C1g-4a 当晚来访、借资提议与紫金卡归属', () => {
  it('26断点JSON/自动/手动/备份仅改新事件，提议不派款、卡不交付、离山后明确旁观', async () => {
    let state = eligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.mountainVisitor.stage < 26) {
      const previous = state, result = advanceEarlyMountainVisitor(state, view(state), input(state))
      expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state))
      await saveSlot(0, state); await saveSlot(3, state)
      const records = await listSlots()
      for (const slot of [0, 3]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.mountainVisitor = before.earlyTraining.mountainVisitor
      expect(comparison).toEqual(before)
      const task = state.earlyTraining.mountainVisitor
      if (task.stage === 8) expect(task.apology).toBe('spoken')
      if (task.stage === 9) expect(task.apology).toBe('answered')
      if (task.stage === 13) expect(task).toMatchObject({ funds: 'offered', purpleCard: 'hidden' })
      if (task.stage === 14) expect(task).toMatchObject({ purpleCard: 'displayed', cardKnowledge: 'unknown' })
      if (task.stage === 17) expect(task.repayment).toBe('promised')
      if (task.stage === 18) expect(task).toMatchObject({ repayment: 'waived', purpleCard: 'displayed' })
      if (task.stage === 19) expect(task.purpleCard).toBe('stowed')
      if (task.stage === 22) expect(task.yan).toBe('descending')
      if (task.stage === 23) expect(task).toMatchObject({ yan: 'left', xuner: 'meeting' })
      if (task.stage === 24) expect(task.xuner).toBe('after-departure')
    }
    expect(state.earlyTraining.started).toBe(false)
    expect(earlyMountainVisitorSaveSummary(state, state.settings)).toContain('次晨交卡待续')
    expect(advanceEarlyMountainVisitor(state, view(state), input(state)).state).toBe(state)
  })
  it('全快照、错人/序、错误视角/远位/五越界/重复零改变', () => {
    let state = eligible()
    while (state.earlyTraining.mountainVisitor.stage < 26) {
      const action = input(state), currentView = view(state)
      for (const operation of ['claim-money', 'take-purple', 'claim-rank', 'clear-debt', 'claim-victory'] as const) {
        const result = advanceEarlyMountainVisitor(state, currentView, { ...action, operation })
        expect(result.ok).toBe(false); expect(result.state).toBe(state)
      }
      for (const key of Object.keys(mountainVisitorAt(0)) as (keyof MountainVisitorState)[])
        expect(advanceEarlyMountainVisitor(state, currentView, { ...action, [key]: 'stale' } as MountainVisitorAction).state).toBe(state)
      expect(advanceEarlyMountainVisitor(state, currentView, { ...action, actor: action.actor === 'yan' ? 'xuner' : 'yan' }).state).toBe(state)
      if (action.operation !== 'archive') expect(advanceEarlyMountainVisitor(state, currentView, { ...action, operation: 'archive' }).state).toBe(state)
      if (currentView.kind === 'yan') {
        expect(advanceEarlyMountainVisitor(state, { kind: 'observer', place: 'stone' }, action).state).toBe(state)
        for (const far of [{ x: 20, y: 20 }, { x: 675, y: 110 }, { x: NaN, y: 330 }])
          expect(advanceEarlyMountainVisitor(state, { kind: 'yan', position: far }, action).state).toBe(state)
      } else {
        expect(advanceEarlyMountainVisitor(state, { kind: 'yan', position: mountainRingPlaces.stone }, action).state).toBe(state)
        expect(advanceEarlyMountainVisitor(state, { kind: 'observer', place: 'path' }, action).state).toBe(state)
      }
      const result = advanceEarlyMountainVisitor(state, currentView, action); expect(result.ok).toBe(true); state = result.state
      expect(advanceEarlyMountainVisitor(state, currentView, action).state).toBe(state)
    }
  })
  it('0.44只补空/新缺拒绝，全部派生值/非法阶段/正式返戒前置', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.44.0'; delete old.earlyTraining.mountainVisitor
    expect(validateState(old)).toEqual(state)
    old.contentVersion = '0.45.0'; expect(() => validateState(old)).toThrow()
    const all = Array.from({ length: 27 }, (_, stage) => mountainVisitorAt(stage))
    for (const task of all) {
      const next = structuredClone(state); next.earlyTraining.mountainVisitor = task
      expect(parseSave(serializeSave(next))).toEqual(next)
      for (const key of Object.keys(task) as (keyof MountainVisitorState)[]) {
        if (key === 'stage') continue
        for (const value of new Set(all.map(other => other[key]))) if (value !== task[key]) {
          const bad = JSON.parse(JSON.stringify(next)); bad.earlyTraining.mountainVisitor[key] = value
          expect(() => validateState(bad)).toThrow()
        }
      }
      if (task.stage) {
        const bad = structuredClone(next); bad.earlyTraining.preparationBrief = preparationBriefAt(19)
        expect(() => validateState(bad)).toThrow()
      }
    }
    for (const stage of [-1, 27, .5, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.mountainVisitor.stage = stage
      expect(() => validateState(bad)).toThrow()
    }
  })
  it('五拒绝可见、老师不出现/卡归薰儿、本人离山图消失、旧摘要跟随与剧透封存', () => {
    const state = eligible(), ui = () => renderToStaticMarkup(<EarlyMountainVisitor state={state} onBack={() => {}} />)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续薰儿来访')
    for (const [stage, text] of [[5, '尝试把薰儿评价登记为三年战已胜'], [13, '尝试按当晚提议领取采购资金'],
      [14, '尝试取得薰儿展示的紫金卡'], [15, '尝试据五纹卡授斗灵境界'], [18, '尝试按不必还的回应清空采购账']] as const) {
      state.earlyTraining.mountainVisitor = mountainVisitorAt(stage); expect(ui()).toContain(text)
    }
    state.earlyTraining.mountainVisitor = mountainVisitorAt(14)
    expect(ui()).toContain('薰儿持有展示的五纹紫金卡'); expect(ui()).not.toMatch(/已报名字的药老|老人处浮空的同一古戒/)
    state.earlyTraining.mountainVisitor = mountainVisitorAt(19)
    expect(ui()).not.toContain('薰儿持有展示的五纹紫金卡')
    state.earlyTraining.mountainVisitor = mountainVisitorAt(23)
    expect(ui()).toContain('选择薰儿留山的旁观焦点'); expect(ui()).not.toMatch(/萧炎后山行走位置|来访向右走|右手佩戴的同一古戒/)
    state.earlyTraining.mountainVisitor = mountainVisitorAt(26)
    expect(renderToStaticMarkup(<EarlyPreparationBrief state={state} onBack={() => {}} onRoute={() => {}} />)).toContain('次晨交卡待续')
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyMountainVisitor state={limited} onBack={() => {}} />)).not.toMatch(/后山|古戒|薰儿|紫金卡/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续薰儿来访')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/后山|古戒|薰儿|紫金卡/)
    expect(advanceEarlyMountainVisitor(limited, view(limited), input(limited)).state).toBe(limited)
    expect(advanceEarlyMountainVisitor(initialState(), { kind: 'yan', position: mountainRingPlaces.ridge }, input(initialState())).ok).toBe(false)
  })
  it('已借资已花款档回补不清账/重发，store拒绝零写/单次/runtime保持', async () => {
    let state = eligible()
    state = beginEarlyTraining(state).state
    state = advanceEarlyTraining(state, { type: 'borrow', expectedSpent: 0 }).state
    state = advanceEarlyTraining(state, { type: 'purchase', item: 'bluegrass', price: 30, expectedSpent: 0 }).state
    const before = structuredClone(state)
    while (state.earlyTraining.mountainVisitor.stage < 26) {
      const result = advanceEarlyMountainVisitor(state, view(state), input(state))
      expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
    }
    const comparison = structuredClone(state); comparison.earlyTraining.mountainVisitor = before.earlyTraining.mountainVisitor
    expect(comparison).toEqual(before)
    expect(advanceEarlyTraining(state, { type: 'borrow', expectedSpent: state.earlyTraining.purse.spent }).ok).toBe(false)
    const fresh = eligible(); let writes = 0
    const store = new GameStore({ load: async () => fresh, write: async () => { writes++ } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyMountainVisitor(store, view(fresh), { ...input(fresh), operation: 'claim-money' })).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyMountainVisitor(store, view(fresh), input(fresh))).toBe(true)
    expect(submitEarlyMountainVisitor(store, view(fresh), input(fresh))).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
