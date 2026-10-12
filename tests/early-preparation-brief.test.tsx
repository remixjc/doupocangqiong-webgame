import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, type GameState } from '../src/core/model'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { preparationBriefAt, type PreparationBriefState } from '../src/core/early-preparation-brief-state'
import { methodDiscussionAt } from '../src/core/early-method-discussion-state'
import { mountainRingPlaces } from '../src/core/early-mountain-ring'
import { advanceEarlyPreparationBrief, submitEarlyPreparationBrief, type PreparationBriefAction } from '../src/core/early-preparation-brief'
import { preparationBriefScenes } from '../src/content/early-preparation-brief'
import { earlyPreparationBriefSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { GameStore } from '../src/core/store'
import { beginEarlyTraining, advanceEarlyTraining } from '../src/core/early-training'
import EarlyPreparationBrief from '../src/ui/EarlyPreparationBrief'
import EarlyMethodDiscussion from '../src/ui/EarlyMethodDiscussion'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import { preparationBriefEligible as eligible } from './helpers/mountain-discussion-replay'
function input(state: GameState): PreparationBriefAction {
  const task = state.earlyTraining.preparationBrief, scene = preparationBriefScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'observer', operation: scene?.operation ?? 'archive' }
}
describe('C1g-3c2 准备要求、入戒/返手与借资衔接', () => {
  it('20断点JSON/自动/手动/备份只改独立历史说明，不自动接取、不发材料资金或药液', async () => {
    let state = eligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.preparationBrief.stage < 20) {
      const previous = state, scene = preparationBriefScenes[state.earlyTraining.preparationBrief.stage]
      const result = advanceEarlyPreparationBrief(state, mountainRingPlaces[scene.place], input(state))
      expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state))
      await saveSlot(0, state); await saveSlot(3, state)
      const records = await listSlots()
      for (const slot of [0, 3]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.preparationBrief = before.earlyTraining.preparationBrief
      expect(comparison).toEqual(before)
      const task = state.earlyTraining.preparationBrief
      if (task.stage === 9) expect(task).toMatchObject({ mild: 'proposed', main: 0 })
      if (task.stage === 10) expect(task).toMatchObject({ main: 3, auxiliary: 0, woodCore: 0 })
      if (task.stage === 12) expect(task).toMatchObject({ main: 3, auxiliary: 2, woodCore: 1, elder: 'outside' })
      if (task.stage === 14) expect(task).toMatchObject({ elder: 'in-ring', ring: 'floating' })
      if (task.stage === 15) expect(task).toMatchObject({ elder: 'in-ring', ring: 'worn' })
      if (task.stage === 18) expect(task).toMatchObject({ funding: 'borrowing-planned', visitor: 'unseen' })
      if (task.stage === 19) expect(task.visitor).toBe('purple-figure')
    }
    expect(state.earlyTraining.started).toBe(false)
    expect(earlyPreparationBriefSaveSummary(state, state.settings)).toContain('同戒返手')
    expect(advanceEarlyPreparationBrief(state, mountainRingPlaces.path, input(state)).state).toBe(state)
  })
  it('全快照/人物/次序/远位/四越界与重复拒绝，入戒不能代返手', () => {
    let state = eligible()
    while (state.earlyTraining.preparationBrief.stage < 20) {
      const action = input(state), scene = preparationBriefScenes[action.stage], position = mountainRingPlaces[scene.place]
      for (const operation of ['claim-materials', 'wear-early', 'claim-money', 'claim-liquid'] as const) {
        const result = advanceEarlyPreparationBrief(state, position, { ...action, operation })
        expect(result.ok).toBe(false); expect(result.state).toBe(state)
      }
      for (const key of Object.keys(preparationBriefAt(0)) as (keyof PreparationBriefState)[])
        expect(advanceEarlyPreparationBrief(state, position, { ...action, [key]: 'stale' } as PreparationBriefAction).state).toBe(state)
      expect(advanceEarlyPreparationBrief(state, position, { ...action, actor: action.actor === 'yan' ? 'elder' : 'yan' }).state).toBe(state)
      if (action.operation !== 'archive') expect(advanceEarlyPreparationBrief(state, position, { ...action, operation: 'archive' }).state).toBe(state)
      for (const far of [mountainRingPlaces.ridge, { x: 675, y: 110 }, { x: NaN, y: 330 }])
        expect(advanceEarlyPreparationBrief(state, far, action).state).toBe(state)
      const result = advanceEarlyPreparationBrief(state, position, action); expect(result.ok).toBe(true); state = result.state
      expect(advanceEarlyPreparationBrief(state, position, action).state).toBe(state)
    }
  })
  it('0.43只补空、新缺拒绝，全部派生组合/非法阶段/功法28前置', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.43.0'; delete old.earlyTraining.preparationBrief
    expect(validateState(old)).toEqual(state)
    old.contentVersion = '0.44.0'; expect(() => validateState(old)).toThrow()
    const all = Array.from({ length: 21 }, (_, stage) => preparationBriefAt(stage))
    for (const task of all) {
      const next = structuredClone(state); next.earlyTraining.preparationBrief = task
      expect(parseSave(serializeSave(next))).toEqual(next)
      for (const key of Object.keys(task) as (keyof PreparationBriefState)[]) {
        if (key === 'stage') continue
        for (const value of new Set(all.map(other => other[key]))) if (value !== task[key]) {
          const bad = JSON.parse(JSON.stringify(next)); bad.earlyTraining.preparationBrief[key] = value
          expect(() => validateState(bad)).toThrow()
        }
      }
      if (task.stage) {
        const bad = structuredClone(next); bad.earlyTraining.methodDiscussion = methodDiscussionAt(27)
        expect(() => validateState(bad)).toThrow()
      }
    }
    for (const stage of [-1, 21, .5, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.preparationBrief.stage = stage
      expect(() => validateState(bad)).toThrow()
    }
  })
  it('四错误可见、入戒/返手/紫衣不同图，旧历史摘要更新和上限1封存', () => {
    const state = eligible(), ui = () => renderToStaticMarkup(<EarlyPreparationBrief state={state} onBack={() => {}} onRoute={() => {}} />)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续准备与返戒')
    for (const [stage, text] of [[12, '尝试把准备单登记为材料已取得'], [14, '尝试把老师入戒当作古戒已返手'],
      [18, '尝试按借资打算领取资金'], [19, '尝试把温和方案登记为药液已调制']] as const) {
      state.earlyTraining.preparationBrief = preparationBriefAt(stage); expect(ui()).toContain(text)
    }
    state.earlyTraining.preparationBrief = preparationBriefAt(14)
    expect(ui()).toContain('老人处浮空的同一古戒'); expect(ui()).not.toMatch(/已报名字的药老|右手佩戴的同一古戒|山径上的紫衣身影/)
    state.earlyTraining.preparationBrief = preparationBriefAt(15)
    expect(ui()).toContain('右手佩戴的同一古戒'); expect(ui()).not.toMatch(/老人处浮空的同一古戒|已报名字的药老/)
    state.earlyTraining.preparationBrief = preparationBriefAt(20)
    expect(ui()).toContain('山径上的紫衣身影'); expect(ui()).toContain('接续既有准备路线')
    expect(renderToStaticMarkup(<EarlyMethodDiscussion state={state} onBack={() => {}} />)).toContain('历史说明归档，同戒返手')
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyPreparationBrief state={limited} onBack={() => {}} onRoute={() => {}} />)).not.toMatch(/后山|古戒|药老|返戒|紫衣/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续准备与返戒')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/后山|古戒|药老|返戒|紫衣/)
    expect(advanceEarlyPreparationBrief(limited, mountainRingPlaces.path, input(limited)).state).toBe(limited)
    expect(advanceEarlyPreparationBrief(initialState(), mountainRingPlaces.stone, input(initialState())).ok).toBe(false)
  })
  it('已有接取/借资/购买历史在回补20断点不回滚或重发，store拒绝零写/单次/runtime保持', async () => {
    let state = eligible()
    state = beginEarlyTraining(state).state
    state = advanceEarlyTraining(state, { type: 'borrow', expectedSpent: 0 }).state
    state = advanceEarlyTraining(state, { type: 'purchase', item: 'bluegrass', price: 30, expectedSpent: 0 }).state
    const before = structuredClone(state)
    while (state.earlyTraining.preparationBrief.stage < 20) {
      const scene = preparationBriefScenes[state.earlyTraining.preparationBrief.stage]
      const result = advanceEarlyPreparationBrief(state, mountainRingPlaces[scene.place], input(state))
      expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
    }
    const comparison = structuredClone(state); comparison.earlyTraining.preparationBrief = before.earlyTraining.preparationBrief
    expect(comparison).toEqual(before)
    expect(beginEarlyTraining(state).ok).toBe(false)
    expect(advanceEarlyTraining(state, { type: 'borrow', expectedSpent: state.earlyTraining.purse.spent }).ok).toBe(false)
    const fresh = eligible(); let writes = 0
    const store = new GameStore({ load: async () => fresh, write: async () => { writes++ } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyPreparationBrief(store, mountainRingPlaces.stone, { ...input(fresh), operation: 'claim-money' })).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyPreparationBrief(store, mountainRingPlaces.stone, input(fresh))).toBe(true)
    expect(submitEarlyPreparationBrief(store, mountainRingPlaces.stone, input(fresh))).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
