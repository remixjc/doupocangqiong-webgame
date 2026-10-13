import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallTeacher, submitFirstHallTeacher } from '../src/core/first-hall-teacher'
import { firstHallTeacherAt } from '../src/core/first-hall-teacher-state'
import { hallTeacherSnapshotKeys } from '../src/core/early-snapshots'
import { firstHallTeacherEligible, firstHallTeacherInput, firstHallTeacherStep } from './helpers/first-hall-teacher-replay'
import { firstHallEveningEligible } from './helpers/first-hall-evening-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { savePreviewSummary } from '../src/core/save-preview'
import FirstHallTeacher from '../src/ui/FirstHallTeacher'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import type { GameState } from '../src/core/model'
describe('房中现身与有限背景问答', () => {
  let base: GameState, states: GameState[]
  beforeAll(() => { base = firstHallTeacherEligible(); states = [base]; while (states.at(-1)!.earlyTraining.firstHallTeacher.stage < 7) states.push(firstHallTeacherStep(states.at(-1)!)) })
  it('七动作独立保存、人物身份分辨与同卷桌面；四槽和上一自动档可还原整档', async () => {
    expect(states).toHaveLength(8); await saveSlot(0, base)
    for (let i = 1; i < states.length; i++) {
      const state = states[i], t = state.earlyTraining.firstHallTeacher, same = structuredClone(state)
      same.earlyTraining.firstHallTeacher = base.earlyTraining.firstHallTeacher
      expect(same).toEqual(base); expect(t).toEqual(firstHallTeacherAt(i))
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(states[i - 1])
      const html = renderToStaticMarkup(<FirstHallTeacher state={state} onBack={() => {}} />)
      expect(html).toContain('translate(300 270)'); expect(html).toContain('x="320" y="255"')
      expect(html).not.toContain('aria-label="夜间薰儿位置"'); expect(html).toContain('本人房门closed')
      expect(html.includes('aria-label="老师房中独立位置"')).toBe(i >= 2)
      if (i >= 2) expect(html).toContain('translate(260 190)')
      expect(t.recognized).toBe(i >= 3); expect(t.asked).toBe(i >= 4)
      expect(t.background === 'limited').toBe(i >= 5); expect(t.stopped).toBe(i >= 6)
      expect(advanceFirstHallTeacher(state, t, 'room', firstHallTeacherInput(states[i - 1])).state).toBe(state)
    }
  })
  it('旧0.78只补空；当前每字段缺失或错派生、伪造来源、未归档回房与旧版本历史均拒绝', () => {
    for (const version of ['0.78.0', '0.78.1']) {
      const old = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: Record<string, unknown> }
      old.contentVersion = version; delete old.earlyTraining.firstHallTeacher
      expect(validateState(old)).toEqual(base)
      for (const state of states.slice(1)) expect(() => validateState({ ...state, contentVersion: version })).toThrow('房中老师')
    }
    for (const state of states) {
      expect(validateState(state)).toEqual(state)
      for (const field of Object.keys(state.earlyTraining.firstHallTeacher)) {
        const bad = structuredClone(state) as unknown as { earlyTraining: { firstHallTeacher: Record<string, unknown> } }
        delete bad.earlyTraining.firstHallTeacher[field]; expect(() => validateState(bad)).toThrow()
        bad.earlyTraining.firstHallTeacher[field] = 'wrong'; expect(() => validateState(bad)).toThrow()
      }
    }
    const bad = structuredClone(states[1]); bad.earlyTraining.firstHallTeacher.record = 'recalled'
    expect(() => validateState(bad)).toThrow()
    expect(advanceFirstHallTeacher(bad, bad.earlyTraining.firstHallTeacher, 'room', firstHallTeacherInput(bad)).state).toBe(bad)
    bad.earlyTraining.firstHallTeacher.record = 'current'; bad.earlyTraining.firstHallEvening = firstHallEveningEligible().earlyTraining.firstHallEvening
    expect(() => validateState(bad)).toThrow()
    const noSource = structuredClone(base); noSource.earlyTraining.firstHallEvening.record = 'none'
    expect(advanceFirstHallTeacher(noSource, noSource.earlyTraining.firstHallTeacher, 'room', firstHallTeacherInput(noSource)).state).toBe(noSource)
  })
  it('16整旧快照、全部任务字段、空间坐标、人物与顺序核对，拒绝移动/翻卷/授技/追问未来', () => {
    expect(hallTeacherSnapshotKeys).toHaveLength(16)
    for (const state of states) {
      const t = state.earlyTraining.firstHallTeacher, action = firstHallTeacherInput(state)
      for (const label of hallTeacherSnapshotKeys) {
        const field = `expected${label}` as keyof typeof action, snapshot = action[field] as Record<string, unknown>
        expect(advanceFirstHallTeacher(state, t, 'room', { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(snapshot)) expect(advanceFirstHallTeacher(state, t, 'room', { ...action, [field]: { ...snapshot, [key]: 'stale' } }).state).toBe(state)
      }
      for (const key of Object.keys(t)) expect(advanceFirstHallTeacher(state, t, 'room', { ...action, [key]: 'stale' }).state).toBe(state)
      for (const flag of ['leaving', 'checkout', 'exitResponse', 'threat', 'conflict', 'continuation', 'aftermath'] as const)
        expect(advanceFirstHallTeacher(state, t, 'room', { ...action, [flag]: true }).state).toBe(state)
      for (const operation of ['voice', 'look', 'recognize', 'ask', 'reply', 'stop', 'archive', 'move-right', 'flip', 'learn', 'clan', 'repay', 'take-scroll']) if (operation !== action.operation)
        expect(advanceFirstHallTeacher(state, t, 'room', { ...action, operation }).state).toBe(state)
      expect(advanceFirstHallTeacher(state, t, 'room', { ...action, actor: action.actor === 'yan' ? 'teacher' : 'yan' }).state).toBe(state)
      expect(advanceFirstHallTeacher(state, { x: 260, y: 190 }, 'room', action).state).toBe(state)
      expect(advanceFirstHallTeacher(state, { x: 301, y: 270 }, 'room', action).state).toBe(state)
      expect(advanceFirstHallTeacher(state, t, 'courtyard', action).state).toBe(state)
    }
    const incomplete = firstHallEveningEligible()
    expect(advanceFirstHallTeacher(incomplete, incomplete.earlyTraining.firstHallTeacher, 'room', firstHallTeacherInput(incomplete)).state).toBe(incomplete)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={incomplete} />)).not.toContain('接续房中老师现身与有限背景')
  })
  it('更高教学仅添明确回顾，保留原奖励/卷保管/身体限制与旧五段；界面不揭后续身份', () => {
    const legacy = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true, true)
    let state = firstHallTeacherEligible(legacy); const original = structuredClone(state)
    while (state.earlyTraining.firstHallTeacher.stage < 7) { state = firstHallTeacherStep(state); expect(state.earlyTraining.firstHallTeacher.record).toBe('recalled') }
    const html = renderToStaticMarkup(<FirstHallTeacher state={state} onBack={() => {}} />)
    expect(html).toContain('详细历史回顾')
    for (const name of ['古族', '古元', '族长', '陀舍', '八极崩已学']) expect(html).not.toContain(name)
    state.earlyTraining.firstHallTeacher = original.earlyTraining.firstHallTeacher; expect(state).toEqual(original)
  })
  it('单字段单事务、并发重放只一次写入；动画chapter1摘要入口均封存', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => base, write: async saved => { writes++; expect(validateState(saved)).toEqual(saved) } })
    await store.initialize(); const runtime = store.getSnapshot().runtime, t = base.earlyTraining.firstHallTeacher, action = firstHallTeacherInput(base)
    expect(submitFirstHallTeacher(store, t, 'room', action)).toBe(true)
    expect(submitFirstHallTeacher(store, t, 'room', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const hidden = { ...base.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...base, settings: hidden }
    expect(advanceFirstHallTeacher(sealed, t, 'room', action).state).toBe(sealed)
    expect(savePreviewSummary(states.at(-1)!, hidden)).not.toContain('房中问答')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续房中老师现身与有限背景')
  })
})
