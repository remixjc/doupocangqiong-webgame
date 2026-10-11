import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress, type GameState } from '../src/core/model'
import { advanceEarlyWalk, type EarlyWalkAction } from '../src/core/early-walk-actions'
import { earlyWalkPlaces } from '../src/core/early-walk'
import { earlyLiquidScenes } from '../src/content/early-liquid'
import { validateState, serializeSave, parseSave, saveSlot, loadSlot } from '../src/core/save'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyWalkInteraction from '../src/ui/EarlyWalkInteraction'

function prepared() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  let checkpoint: GameState | undefined
  replayEarlyTraining(validateState(old), false, state => {
    if (!checkpoint && state.earlyTraining.market.stage === 4) checkpoint = state
  })
  return checkpoint!
}
const teacher = earlyWalkPlaces.find(place => place.id === 'teacher')!
const pharmacy = earlyWalkPlaces.find(place => place.id === 'pharmacy')!

describe('往事老师调制与练习', () => {
  it('同账材料在老师处依次使用，失败重试至归档，每步存档且主线不改', async () => {
    let state = prepared()
    const before = structuredClone(state)
    async function act(action: EarlyWalkAction) {
      expect(advanceEarlyWalk(state, pharmacy, action).state).toBe(state)
      const result = advanceEarlyWalk(state, teacher, action)
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      await saveSlot(2, state); expect(await loadSlot(2)).toEqual(state)
      expect(advanceEarlyWalk(state, teacher, action).state).toBe(state)
    }
    for (let step = 0; step < 6; step++) await act({ type: 'liquid', step, operation: earlyLiquidScenes[step].operation, expectedSpent: 110 })
    await act({ type: 'practice', operation: 'begin', phase: 0, pulse: 0, expectedSpent: 110 })
    for (let pulse = 0; pulse < 3; pulse++) await act({ type: 'practice', operation: 'pulse', phase: 1, pulse, attempts: 0, marker: 0, expectedSpent: 110 })
    for (let pulse = 0; pulse < 3; pulse++) await act({ type: 'practice', operation: 'pulse', phase: 1, pulse, attempts: 1, marker: .5, expectedSpent: 110 })
    await act({ type: 'practice', operation: 'attempt', phase: 2, pulse: 3, attempts: 1, expectedSpent: 110 })
    await act({ type: 'practice', operation: 'finish', phase: 3, pulse: 3, attempts: 1, expectedSpent: 110 })
    expect(state.earlyTraining.practice.phase).toBe(4)
    expect(state.earlyTraining.supplies).toEqual({ bluegrass: 0, boneflower: 0, woodCore: 0 })
    expect(state.earlyTraining.receipts).toEqual(before.earlyTraining.receipts)
    expect(state.earlyTraining.purse).toEqual(before.earlyTraining.purse)
    for (const key of ['gold', 'xp', 'chapter', 'completed', 'progress', 'inventory', 'flame'] as const) expect(state[key]).toEqual(before[key])
  })
  it('老师地点按阶段显示操作，范围隐藏且未准备不跳练习', () => {
    let state = prepared()
    const html = renderToStaticMarkup(<EarlyWalkInteraction state={state} position={teacher} />)
    expect(html).toContain(earlyLiquidScenes[0].action)
    expect(html).not.toContain('开始初期调息练习')
    for (let step = 0; step < 6; step++) state = advanceEarlyWalk(state, teacher,
      { type: 'liquid', step, operation: earlyLiquidScenes[step].operation, expectedSpent: 110 }).state
    expect(renderToStaticMarkup(<EarlyWalkInteraction state={state} position={teacher} />)).toContain('开始初期调息练习')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyWalkInteraction state={state} position={teacher} />)).toBe('')
  })
})
