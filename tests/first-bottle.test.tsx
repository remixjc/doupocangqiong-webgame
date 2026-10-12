import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { firstTechniqueAt } from '../src/core/first-technique-state'
import { advanceFirstTechnique, firstTechniqueBed, submitFirstTechnique } from '../src/core/first-technique'
import { firstBottleEligible, firstBottleInput, firstBottleStep } from './helpers/first-bottle-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { ironPlaces } from '../src/core/early-iron'
import { GameStore } from '../src/core/store'
import { firstTechniqueSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import FirstTechnique from '../src/ui/FirstTechnique'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'

describe('C1h-1b2 有限瓷瓶试招', () => {
  it('十步/两手动标记/免费复位逐断点四槽与备份，只有首次试招历史改变', async () => {
    let state = firstBottleEligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    let failed = false
    while (state.earlyTraining.firstTechnique.stage < 19) {
      const previous = state
      const marker = state.earlyTraining.firstTechnique.stage === 11 && !failed ? 0 : .5
      if (marker === 0) failed = true
      state = firstBottleStep(state, marker)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const records = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(records.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(s => s.slot === -1)!.text)).toEqual(previous)
      const same = structuredClone(state); same.earlyTraining.firstTechnique = before.earlyTraining.firstTechnique
      expect(same).toEqual(before)
      const task = state.earlyTraining.firstTechnique
      expect(task).toEqual(firstTechniqueAt(task.stage, task.beats, task.attempts))
      const html = renderToStaticMarkup(<FirstTechnique continuation state={state} onBack={() => {}} />)
      expect(html).toContain(`当时瓷瓶：${({ unobserved: '尚未面对', intact: '完整', turning: '转动', fallen: '从桌上落下', fragments: '地面碎片' })[task.bottle]}`)
      expect(html.includes('有限吸力标记"')).toBe(task.stage === 11)
      expect(html).not.toContain('有限试瓶向左走')
      expect(renderToStaticMarkup(<FirstTechnique state={state} onBack={() => {}} />)).not.toContain('面对桌上完整瓷瓶')
    }
    expect(state.earlyTraining.firstTechnique).toEqual(firstTechniqueAt(19, 2, 1))
    expect(firstTechniqueSaveSummary(state, state.settings)).toContain('真实出门待续')
    expect(advanceFirstTechnique(state, firstTechniqueBed, firstBottleInput(state)).state).toBe(state)
  })
  it('旧0.60研究9保持并只补未参与试瓶字段；旧spent/五段/后期两瓶全保持', () => {
    const old = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true)
    for (const input of [firstBottleEligible(), firstBottleEligible(old)]) {
      const raw = structuredClone(input); raw.contentVersion = '0.60.0'
      for (const key of ['beats', 'attempts', 'bottle', 'limited', 'insufficient', 'needed', 'seekLow'])
        delete (raw.earlyTraining.firstTechnique as unknown as Record<string, unknown>)[key]
      let state = validateState(raw)
      expect(state).toEqual(input)
      while (state.earlyTraining.firstTechnique.stage < 19) state = firstBottleStep(state)
      const same = structuredClone(state); same.earlyTraining.firstTechnique = input.earlyTraining.firstTechnique
      expect(same).toEqual(input)
    }
    const bad = firstBottleStep(firstBottleEligible()); bad.contentVersion = '0.60.0'
    expect(() => validateState(bad)).toThrow('首次瓷瓶试招')
  })
  it('完整全部快照/错人物/床边冒签/非法位置/吸人与奖励/顺序重复都零写', () => {
    let state = firstBottleEligible()
    while (state.earlyTraining.firstTechnique.stage < 19) {
      const action = firstBottleInput(state)
      for (const key of Object.keys(state.earlyTraining.firstTechnique))
        expect(advanceFirstTechnique(state, firstTechniqueBed, { ...action, [key]: 'stale' }).state).toBe(state)
      for (const field of ['expectedLedger', 'expectedTraining', 'expectedIron', 'expectedPractice', 'expectedRecovery'] as const)
        for (const key of Object.keys(action[field]))
          expect(advanceFirstTechnique(state, firstTechniqueBed, { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      for (const operation of ['duplicate', 'learn', 'absorb-person', 'battle', 'loot', 'seventh-result', 'leave-room', 'finish'])
        expect(advanceFirstTechnique(state, firstTechniqueBed, { ...action, operation }).state).toBe(state)
      expect(advanceFirstTechnique(state, firstTechniqueBed, { ...action, actor: 'teacher' }).state).toBe(state)
      expect(advanceFirstTechnique(state, firstTechniqueBed, { ...action, teacherPosition: firstTechniqueBed }).state).toBe(state)
      for (const pos of [ironPlaces.table, { x: NaN, y: 370 }, { x: 260, y: Infinity }, { x: 260, y: 420 }])
        expect(advanceFirstTechnique(state, pos, action).state).toBe(state)
      state = firstBottleStep(state)
      expect(advanceFirstTechnique(state, firstTechniqueBed, action).state).toBe(state)
    }
  })
  it('吸力合法端点/非法标记/上限与完全派生校验；不会重置瓷瓶', () => {
    let state = firstBottleEligible()
    while (state.earlyTraining.firstTechnique.stage < 11) state = firstBottleStep(state)
    for (const marker of [undefined, NaN, Infinity, -1, 1.1])
      expect(advanceFirstTechnique(state, firstTechniqueBed, { ...firstBottleInput(state), marker }).state).toBe(state)
    state = firstBottleStep(state, .35)
    expect(state.earlyTraining.firstTechnique.beats).toBe(1)
    state = firstBottleStep(state, 1)
    expect(state.earlyTraining.firstTechnique.beats).toBe(0)
    expect(state.earlyTraining.firstTechnique.bottle).toBe('intact')
    const cap = structuredClone(state); cap.earlyTraining.firstTechnique.attempts = 1_000_000
    expect(advanceFirstTechnique(cap, firstTechniqueBed, firstBottleInput(cap, 0)).state).toBe(cap)
    state = firstBottleStep(state, .65)
    while (state.earlyTraining.firstTechnique.stage < 19) {
      state = firstBottleStep(state)
      for (const key of Object.keys(state.earlyTraining.firstTechnique)) {
        const bad = structuredClone(state); Object.assign(bad.earlyTraining.firstTechnique, { [key]: 'bad' })
        expect(() => validateState(bad)).toThrow()
      }
    }
    const bad = firstBottleEligible(); bad.earlyTraining.firstTechnique.needed = 7
    expect(() => validateState(bad)).toThrow()
  })
  it('原研究入口和新试瓶入口分开，前置/剧透/当前版本漏字段严格', () => {
    const before = firstBottleEligible()
    expect(renderToStaticMarkup(<FirstTechnique continuation state={before} onBack={() => {}} />)).toContain('有限试瓶 0/10')
    const early = structuredClone(before); early.earlyTraining.firstTechnique = firstTechniqueAt(8)
    expect(renderToStaticMarkup(<FirstTechnique continuation state={early} onBack={() => {}} />)).not.toContain('有限试瓶房中地图')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={early} />)).not.toContain('接续有限瓷瓶试招')
    const hidden = { ...before.settings, spoiler: 'anime' as const, animeLimit: 1 }
    const sealed = { ...before, settings: hidden }
    expect(advanceFirstTechnique(sealed, firstTechniqueBed, firstBottleInput(sealed)).state).toBe(sealed)
    expect(savePreviewSummary(sealed, hidden)).not.toContain('首次铁片研究')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续有限瓷瓶试招')
    const missing = structuredClone(before); delete (missing.earlyTraining.firstTechnique as Partial<typeof missing.earlyTraining.firstTechnique>).bottle
    expect(() => validateState(missing)).toThrow()
  })
  it('吸力一次单字段原子提交，重复与旧修炼并发拒绝', async () => {
    let state = firstBottleEligible(); while (state.earlyTraining.firstTechnique.stage < 11) state = firstBottleStep(state)
    const action = firstBottleInput(state); let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => { writes++; expect(saved.earlyTraining.firstTechnique.beats).toBe(1) } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitFirstTechnique(store, firstTechniqueBed, action)).toBe(true)
    expect(submitFirstTechnique(store, firstTechniqueBed, action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1)
    expect(store.getSnapshot().runtime).toBe(runtime)
    const changed = structuredClone(state); changed.earlyTraining.practice.phase = 1
    expect(advanceFirstTechnique(changed, firstTechniqueBed, action).state).toBe(changed)
  })
})
