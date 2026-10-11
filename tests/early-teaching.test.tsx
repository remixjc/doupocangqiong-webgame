import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyTeaching, earlyTeachingRoomBlock, submitEarlyTeaching } from '../src/core/early-teaching'
import { earlyTeachingScenes } from '../src/content/early-teaching'
import { earlyTeachingSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyTeaching from '../src/ui/EarlyTeaching'

const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined, false, false, true)
}
describe('回房正式传技与身体基础要求', () => {
  it('合法借卷离堂与老师位置才开放，不以旧主线/成长归档代签', () => {
    const state = eligible()
    expect(earlyTeachingRoomBlock(state, teacher)).toBe('')
    for (const position of [{ x: NaN, y: 310 }, { x: 150, y: 310 }, { x: 360, y: 208 }])
      expect(advanceEarlyTeaching(state, position, 'table', { step: 0, operation: 'review' }).state).toBe(state)
    const unfinished = structuredClone(state); unfinished.earlyTraining.hall = { stage: 8, scroll: 'borrowed-second' }
    expect(earlyTeachingRoomBlock(unfinished, teacher)).toContain('离堂')
    unfinished.earlyTraining.hall = { stage: 0, scroll: 'none' }; unfinished.earlyTraining.growth.stage = 3
    expect(earlyTeachingRoomBlock(unfinished, teacher)).toContain('离堂')
    expect(earlyTeachingRoomBlock(initialState(), teacher)).toContain('第2章')
    expect(state.earlyTraining.teaching.stage).toBe(0)
  })
  it('五步逐断点保存，站位/阶段/动作/重复拒绝，只新增独立知识记录', async () => {
    let state = eligible()
    const before = structuredClone(state)
    for (const scene of earlyTeachingScenes) {
      expect(advanceEarlyTeaching(state, teacher, scene.station === 'table' ? 'teacher' : 'table',
        { step: scene.step, operation: scene.operation }).state).toBe(state)
      for (const step of [-1, NaN, .5, Infinity, scene.step + 1])
        expect(advanceEarlyTeaching(state, teacher, scene.station, { step, operation: scene.operation }).state).toBe(state)
      expect(advanceEarlyTeaching(state, teacher, scene.station, { step: scene.step, operation: 'bad' as 'review' }).state).toBe(state)
      const result = advanceEarlyTeaching(state, teacher, scene.station, { step: scene.step, operation: scene.operation })
      expect(result.ok).toBe(true)
      state = parseSave(serializeSave(result.state))
      expect(state.earlyTraining.teaching.stage).toBe(scene.step + 1)
      expect(advanceEarlyTeaching(state, teacher, scene.station, { step: scene.step, operation: scene.operation }).state).toBe(state)
      await saveSlot(0, state); await saveSlot(3, state)
      for (const record of (await listSlots()).filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyTeachingSaveSummary(state, state.settings))
      }
    }
    const expected = structuredClone(before); expected.earlyTraining.teaching.stage = 5
    expect(state).toEqual(expected)
    expect(earlyTeachingSaveSummary(state, state.settings)).toBe('老师传技 · 已归档，尚待监督训练')
    expect(saveRecordSummary((await listSlots()).find(entry => entry.slot === -1)!, state.settings)).toContain('老师传技 · 进行中 4/5')
  })
  it('传授图形在知识确认后才出现，仍区分身体要求与实战掌握', () => {
    let state = eligible()
    const initial = renderToStaticMarkup(<EarlyTeaching state={state} position={teacher} onBack={() => {}} />)
    expect(initial).toContain('第一卷此前已归回')
    expect(initial).toContain('尚未接受技法知识')
    for (const scene of earlyTeachingScenes.slice(0, 3))
      state = advanceEarlyTeaching(state, teacher, scene.station, { step: scene.step, operation: scene.operation }).state
    const html = renderToStaticMarkup(<EarlyTeaching state={state} position={teacher} onBack={() => {}} />)
    expect(html).toContain('知识传授 · 尚待练习')
    expect(html).toContain('技法知识已记下'); expect(html).toContain('身体要求待确认')
    expect(html).toContain('不重复发放技能或提高攻击')
  })
  it('旧已借卷档仅补未参与，新版缺字段/越界/未离堂却传授拒绝，范围封存', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.17.1'; delete old.earlyTraining.teaching
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    for (const stage of [-1, 6, .5, NaN, '1']) {
      const bad = structuredClone(state); bad.earlyTraining.teaching.stage = stage as number
      expect(() => validateState(bad)).toThrow('重修')
    }
    const bad = structuredClone(state); bad.earlyTraining.hall = { stage: 8, scroll: 'borrowed-second' }; bad.earlyTraining.teaching.stage = 1
    expect(() => validateState(bad)).toThrow('重修')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(renderToStaticMarkup(<EarlyTeaching state={state} position={teacher} onBack={() => {}} />)).not.toContain('八极崩')
    expect(earlyTeachingSaveSummary(state, state.settings)).toBe('老师传技 · 当前范围封存')
    expect(advanceEarlyTeaching(state, teacher, 'table', { step: 0, operation: 'review' }).state).toBe(state)
  })
  it('store读取最新记录，失败不写且一次成功只改目标，保留主线运行态', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => eligible(), write: async () => { writes++ } })
    await store.initialize()
    const runtime = store.getSnapshot().runtime, before = structuredClone(store.getSnapshot().state)
    expect(submitEarlyTeaching(store, teacher, 'teacher', { step: 0, operation: 'review' })).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyTeaching(store, teacher, 'table', { step: 0, operation: 'review' })).toBe(true)
    expect(submitEarlyTeaching(store, teacher, 'table', { step: 0, operation: 'review' })).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    before.earlyTraining.teaching.stage = 1
    expect(store.getSnapshot().state).toEqual(before)
    expect(store.getSnapshot().runtime).toBe(runtime); expect(writes).toBe(1)
  })
})
