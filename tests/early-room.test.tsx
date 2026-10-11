import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress, type GameState } from '../src/core/model'
import { earlyWalkPlaces, earlyWalkStart } from '../src/core/early-walk'
import { earlyRoomBlock, earlyRoomPresentation, advanceEarlyRoom, submitEarlyRoom } from '../src/core/early-room'
import { earlyLiquidScenes } from '../src/content/early-liquid'
import { validateState, parseSave, serializeSave, saveSlot, loadSlot } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyRoom from '../src/ui/EarlyRoom'

const teacher = earlyWalkPlaces.find(place => place.id === 'teacher')!
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
describe('药老室内调制', () => {
  it('入口要求正确地点、已付款附物与可见范围，未准备/越距不展示室内', () => {
    const state = prepared()
    expect(earlyRoomBlock(state, teacher)).toBe('')
    for (const position of [earlyWalkStart, { x: NaN, y: 310 }, earlyWalkPlaces[0]]) {
      expect(earlyRoomBlock(state, position)).not.toBe('')
      expect(renderToStaticMarkup(<EarlyRoom state={state} position={position} onBack={() => {}} />)).not.toContain('静室调制场景')
    }
    state.earlyTraining.market = { stage: 3, blackIron: 0 }
    expect(earlyRoomBlock(state, teacher)).toContain('黑铁片')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 1
    expect(earlyRoomBlock(state, teacher)).toContain('剧透')
    expect(renderToStaticMarkup(<EarlyRoom state={state} position={teacher} onBack={() => {}} />)).not.toContain('主药')
  })
  it('逐步JSON/IndexedDB恢复同步材料盘、清水/药液与老师掌中状态', async () => {
    let state = prepared()
    for (let step = 0; step <= 6; step++) {
      const view = earlyRoomPresentation(state)
      expect(view.supplies).toEqual({ bluegrass: step < 3 ? 3 : 0, boneflower: step < 4 ? 2 : 0, woodCore: step < 5 ? 1 : 0 })
      expect(view.water).toBe(step < 2 ? '容器尚未盛水' : step < 6 ? '清水已备好' : '药液已加入清水')
      const html = renderToStaticMarkup(<EarlyRoom state={state} position={teacher} onBack={() => {}} />)
      expect(html).toContain(`主药${view.supplies.bluegrass}株、辅药${view.supplies.boneflower}株、魔核${view.supplies.woodCore}枚`)
      expect(html.includes('data-room-flame="teacher"')).toBe(step >= 2 && step <= 4)
      if (step === 6) { expect(html).toContain('开始初期调息练习'); break }
      expect(html).toContain(earlyLiquidScenes[step].action)
      const result = advanceEarlyRoom(state, teacher, view.station,
        { type: 'liquid', step, operation: earlyLiquidScenes[step].operation, expectedSpent: 110 })
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      await saveSlot(3, state); expect(await loadSlot(3)).toEqual(state)
    }
  })
  it('材料盘不能代操作，备水由萧炎位置完成，老师步骤不能跳步/重复/过期', () => {
    let state = prepared()
    const identify = { type: 'liquid' as const, step: 0, operation: 'identify' as const, expectedSpent: 110 }
    for (const station of ['materials', 'water'] as const) expect(advanceEarlyRoom(state, teacher, station, identify).state).toBe(state)
    state = advanceEarlyRoom(state, teacher, 'teacher', identify).state
    expect(advanceEarlyRoom(state, teacher, 'teacher', identify).state).toBe(state)
    const water = { type: 'liquid' as const, step: 1, operation: 'water' as const, expectedSpent: 110 }
    expect(advanceEarlyRoom(state, teacher, 'teacher', water).state).toBe(state)
    expect(advanceEarlyRoom(state, teacher, 'water', { ...water, step: 5, operation: 'dilute' }).state).toBe(state)
    expect(advanceEarlyRoom(state, teacher, 'water', { ...water, expectedSpent: 50 }).state).toBe(state)
    expect(advanceEarlyRoom(state, teacher, 'water', water).ok).toBe(true)
  })
  it('旧归档只查看既有药液，不复生材料或出现再次调制按钮', () => {
    const state = replayEarlyTraining(validateState({ ...prepared(), earlyTraining: initialState().earlyTraining }))
    const before = structuredClone(state)
    const html = renderToStaticMarkup(<EarlyRoom state={state} position={teacher} onBack={() => {}} />)
    expect(html).toContain('药液已加入清水')
    expect(html).toContain('主药0株、辅药0株、魔核0枚')
    expect(html).not.toContain('>请药老辨认黑铁片</button>')
    expect(html).not.toContain('>请老师将药液加入清水</button>')
    expect(state).toEqual(before)
  })
  it('提交读取最新账本，失败不写档、成功只更新任务，不重建主线运行态', async () => {
    const writes: GameState[] = []
    const store = new GameStore({ load: async () => prepared(), write: async state => { writes.push(state) } })
    await store.initialize()
    const runtime = store.getSnapshot().runtime, before = structuredClone(store.getSnapshot().state)
    const identify = { type: 'liquid' as const, step: 0, operation: 'identify' as const, expectedSpent: 110 }
    expect(submitEarlyRoom(store, teacher, 'materials', identify)).toBe(false)
    expect(submitEarlyRoom(store, earlyWalkStart, 'teacher', identify)).toBe(false)
    expect(writes).toHaveLength(0)
    expect(submitEarlyRoom(store, teacher, 'teacher', identify)).toBe(true)
    expect(submitEarlyRoom(store, teacher, 'teacher', identify)).toBe(false)
    await store.waitForAutosave()
    expect(writes).toHaveLength(1); expect(store.getSnapshot().runtime).toBe(runtime)
    before.earlyTraining.liquid.stage = 1
    expect(store.getSnapshot().state).toEqual(before)
  })
})
