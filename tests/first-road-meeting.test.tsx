import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { firstRoadMeetingAt } from '../src/core/first-road-meeting-state'
import { advanceFirstRoadMeeting, roadMeetingNear, roadMeetingPlaces, moveRoadMeetingWalker, submitFirstRoadMeeting } from '../src/core/first-road-meeting'
import { firstRoadMeetingScenes } from '../src/content/first-road-meeting'
import { firstRoadMeetingEligible, firstRoadMeetingInput, firstRoadMeetingStep } from './helpers/first-road-meeting-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { firstRoadMeetingSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import FirstRoadMeeting from '../src/ui/FirstRoadMeeting'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'

describe('C1h-2a 石路会面与分路', () => {
  it('十二断点四槽/上一备份；匿名来人辨认后可见，旧奖励全state保持', async () => {
    let state = firstRoadMeetingEligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.firstRoadMeeting.stage < 12) {
      const previous = state; state = firstRoadMeetingStep(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const records = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(records.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(s => s.slot === -1)!.text)).toEqual(previous)
      const same = structuredClone(state); same.earlyTraining.firstRoadMeeting = before.earlyTraining.firstRoadMeeting
      expect(same).toEqual(before)
      const task = state.earlyTraining.firstRoadMeeting
      expect(task).toEqual(firstRoadMeetingAt(task.stage))
      const html = renderToStaticMarkup(<FirstRoadMeeting state={state} onBack={() => {}} />)
      expect(html.includes('关注萧媚发言')).toBe(task.identified)
      if (!task.identified) expect(html).not.toContain('萧媚')
      expect(firstRoadMeetingSaveSummary(state, state.settings)).not.toContain('胜利')
    }
    expect(firstRoadMeetingSaveSummary(state, state.settings)).toContain('入堂待续')
    expect(advanceFirstRoadMeeting(state, roadMeetingPlaces.end, firstRoadMeetingInput(state)).state).toBe(state)
  })
  it('0.62仅补未参与；旧spent/五段/已借第二卷不代签或倒退', () => {
    const old = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true)
    old.earlyTraining.firstRoadMeeting = firstRoadMeetingAt(0)
    for (const input of [firstRoadMeetingEligible(), firstRoadMeetingEligible(old)]) {
      const raw = structuredClone(input); raw.contentVersion = '0.62.0'
      delete (raw.earlyTraining as Partial<typeof raw.earlyTraining>).firstRoadMeeting
      let state = validateState(raw); expect(state).toEqual(input)
      while (state.earlyTraining.firstRoadMeeting.stage < 12) state = firstRoadMeetingStep(state)
      const same = structuredClone(state); same.earlyTraining.firstRoadMeeting = input.earlyTraining.firstRoadMeeting
      expect(same).toEqual(input)
    }
    const bad = firstRoadMeetingStep(firstRoadMeetingEligible()); bad.contentVersion = '0.62.0'
    expect(() => validateState(bad)).toThrow('首次路口会面')
  })
  it('完整历史与旧账快照、错人/错位置/战斗入堂/重复均零写', () => {
    let state = firstRoadMeetingEligible()
    while (state.earlyTraining.firstRoadMeeting.stage < 12) {
      const scene = firstRoadMeetingScenes[state.earlyTraining.firstRoadMeeting.stage], p = roadMeetingPlaces[scene.place], action = firstRoadMeetingInput(state)
      for (const key of Object.keys(state.earlyTraining.firstRoadMeeting))
        expect(advanceFirstRoadMeeting(state, p, { ...action, [key]: 'stale' }).state).toBe(state)
      for (const field of ['expectedDeparture', 'expectedTechnique', 'expectedTraining', 'expectedIron', 'expectedLedger', 'expectedPractice', 'expectedRecovery', 'expectedHall'] as const) {
        expect(advanceFirstRoadMeeting(state, p, { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field]))
          expect(advanceFirstRoadMeeting(state, p, { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      expect(advanceFirstRoadMeeting(state, p, { ...action, actor: scene.actor === 'yan' ? 'mei' : 'yan' }).state).toBe(state)
      for (const operation of ['fight', 'hall', 'learn', 'gift', 'teleport'])
        expect(advanceFirstRoadMeeting(state, p, { ...action, operation }).state).toBe(state)
      for (const pos of [{ x: NaN, y: p.y }, { x: p.x, y: Infinity }, { x: p.x, y: 420 }, roadMeetingPlaces.start])
        expect(advanceFirstRoadMeeting(state, pos, action).state).toBe(state)
      state = firstRoadMeetingStep(state)
      expect(advanceFirstRoadMeeting(state, p, action).state).toBe(state)
    }
  })
  it('本人实际五右三上转路、五右走过与再五右离开；边界保持', () => {
    let p = { ...roadMeetingPlaces.start }
    for (let i = 0; i < 5; i++) p = moveRoadMeetingWalker(p, 'right')
    for (let i = 0; i < 3; i++) p = moveRoadMeetingWalker(p, 'up')
    expect(p).toEqual(roadMeetingPlaces.turn); expect(roadMeetingNear(p, 0)).toBe(true)
    for (let i = 0; i < 5; i++) p = moveRoadMeetingWalker(p, 'right')
    expect(p).toEqual(roadMeetingPlaces.pass); expect(roadMeetingNear(p, 5)).toBe(true)
    for (let i = 0; i < 5; i++) p = moveRoadMeetingWalker(p, 'right')
    expect(p).toEqual(roadMeetingPlaces.end); expect(roadMeetingNear(p, 9)).toBe(true)
    const invalid = { x: 300, y: 370 }; expect(moveRoadMeetingWalker(invalid, 'up')).toBe(invalid)
    const edge = { x: 480, y: 250 }; expect(moveRoadMeetingWalker(edge, 'right')).toBe(edge)
  })
  it('派生/前置/当前版缺字段拒绝，防剧透封存，不由旧堂卷显示入口', () => {
    let state = firstRoadMeetingEligible()
    while (state.earlyTraining.firstRoadMeeting.stage < 12) {
      state = firstRoadMeetingStep(state)
      for (const key of Object.keys(state.earlyTraining.firstRoadMeeting)) {
        const bad = structuredClone(state); Object.assign(bad.earlyTraining.firstRoadMeeting, { [key]: 'bad' })
        expect(() => validateState(bad)).toThrow()
      }
    }
    const invalid = structuredClone(state); invalid.earlyTraining.firstDeparture.stage = 8
    expect(() => validateState(invalid)).toThrow()
    expect(renderToStaticMarkup(<FirstRoadMeeting state={invalid} onBack={() => {}} />)).not.toContain('石路会面地图')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={invalid} />)).not.toContain('接续石路会面与分路')
    const hidden = { ...state.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...state, settings: hidden }
    expect(advanceFirstRoadMeeting(sealed, roadMeetingPlaces.end, firstRoadMeetingInput(sealed)).state).toBe(sealed)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续石路会面与分路')
    expect(savePreviewSummary(state, hidden)).not.toContain('路口会面')
    expect(firstRoadMeetingSaveSummary(state, hidden)).toContain('封存')
    const missing = structuredClone(state); delete (missing.earlyTraining as Partial<typeof missing.earlyTraining>).firstRoadMeeting
    expect(() => validateState(missing)).toThrow()
  })
  it('原子保存单字段，重复与旧借卷并发拒绝；不改运行态', async () => {
    const state = firstRoadMeetingEligible(), action = firstRoadMeetingInput(state); let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => { writes++; expect(saved.earlyTraining.firstRoadMeeting.stage).toBe(1) } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitFirstRoadMeeting(store, roadMeetingPlaces.turn, action)).toBe(true)
    expect(submitFirstRoadMeeting(store, roadMeetingPlaces.turn, action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1)
    expect(store.getSnapshot().runtime).toBe(runtime)
    const changed = structuredClone(state); changed.earlyTraining.hall.stage++
    expect(advanceFirstRoadMeeting(changed, roadMeetingPlaces.turn, action).state).toBe(changed)
  })
})
