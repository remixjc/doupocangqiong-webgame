import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { earlyHallBlock, enterEarlyHall, submitEarlyHallEntry, earlyHallStart, earlyHallPlaces,
  earlyHallPositionValid, moveEarlyHall, nearbyEarlyHallPlace } from '../src/core/early-hall'
import { earlyHallSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyHall from '../src/ui/EarlyHall'

const teacher = { x: 570, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old))
}
describe('斗技堂到访与两区基础', () => {
  it('初期归档后在药老处接续，校验地点/可见范围，不由主线或成长翻阅代签', () => {
    const state = eligible()
    expect(state.earlyTraining.hall.stage).toBe(0)
    expect(state.earlyTraining.growth.stage).toBe(0)
    expect(earlyHallBlock(state)).toBe('')
    for (const position of [{ x: 150, y: 310 }, { x: 360, y: 208 }, { x: NaN, y: 310 }, { x: 1000, y: 310 }])
      expect(enterEarlyHall(state, position).state).toBe(state)
    const result = enterEarlyHall(state, teacher)
    expect(result.ok).toBe(true)
    const expected = structuredClone(state); expected.earlyTraining.hall.stage = 1
    expect(result.state).toEqual(expected)
    expect(enterEarlyHall(result.state, teacher).state).toBe(result.state)
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(enterEarlyHall(state, teacher).state).toBe(state)
    expect(renderToStaticMarkup(<EarlyHall state={state} onBack={() => {}} />)).not.toContain('藏卷书架')
    const fresh = initialState()
    expect(enterEarlyHall(fresh, teacher).state).toBe(fresh)
  })
  it('入口网格能走近三个地点，书架阻挡且非法位置复位，查看不记借卷', () => {
    const queue = [earlyHallStart], seen = new Set<string>(), found = new Set<string>()
    while (queue.length) {
      const position = queue.shift()!, id = `${position.x},${position.y}`
      if (seen.has(id)) continue
      seen.add(id)
      const place = nearbyEarlyHallPlace(position)
      if (place) found.add(place.id)
      for (const direction of ['up', 'down', 'left', 'right'] as const) {
        const next = moveEarlyHall(position, direction)
        if (!seen.has(`${next.x},${next.y}`)) queue.push(next)
      }
    }
    expect(found).toEqual(new Set(earlyHallPlaces.map(place => place.id)))
    expect(earlyHallPositionValid({ x: 550, y: 65 })).toBe(false)
    expect(moveEarlyHall({ x: 550, y: 110 }, 'up')).toEqual({ x: 550, y: 110 })
    expect(moveEarlyHall({ x: Infinity, y: 0 }, 'up')).toEqual(earlyHallStart)
    const state = enterEarlyHall(eligible(), teacher).state, before = structuredClone(state)
    const html = renderToStaticMarkup(<EarlyHall state={state} onBack={() => {}} />)
    expect(html).toContain('斗技堂东西两区原创布局')
    expect(html).toContain('尚无卷册借出')
    expect(html).toContain('查看堂内地点')
    expect(state).toEqual(before)
  })
  it('旧档补空到访而不提前完成，新版缺字段/越界/未练习却声称到访拒绝', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.16.7'; delete old.earlyTraining.hall
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    for (const stage of [-1, 10, .5, NaN, '1']) {
      const bad = structuredClone(state); bad.earlyTraining.hall.stage = stage as number
      expect(() => validateState(bad)).toThrow('重修')
    }
    const bad = initialState(); bad.earlyTraining.hall.stage = 1
    expect(() => validateState(bad)).toThrow('重修')
  })
  it('自动/手动/备份/JSON往返和查看者封存保留独立到访', async () => {
    const state = eligible(), visited = enterEarlyHall(state, teacher).state
    await saveSlot(0, state); await saveSlot(0, visited); await saveSlot(1, visited)
    expect(parseSave(serializeSave(visited))).toEqual(visited)
    const records = await listSlots()
    for (const slot of [0, 1]) {
      const record = records.find(entry => entry.slot === slot)!
      expect(saveRecordSummary(record, visited.settings)).toContain('斗技堂 · 已到访，待借卷')
      const hidden = saveRecordSummary(record, { ...visited.settings, spoiler: 'anime', animeLimit: 2 })
      expect(hidden).toContain('后续记录 · 当前范围封存')
      expect(hidden).not.toContain('斗技堂')
    }
    expect(saveRecordSummary(records.find(entry => entry.slot === -1)!, state.settings)).toContain('斗技堂 · 未到访')
    expect(earlyHallSaveSummary(state, state.settings)).toBe('斗技堂 · 未到访')
  })
  it('重复回访不再写档，失败只提示，成功只更新往事对象且保留运行态', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => eligible(), write: async () => { writes++ } })
    await store.initialize()
    const runtime = store.getSnapshot().runtime, before = structuredClone(store.getSnapshot().state)
    expect(submitEarlyHallEntry(store, earlyHallStart)).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyHallEntry(store, teacher)).toBe(true)
    expect(await store.waitForAutosave()).toBe(true)
    expect(submitEarlyHallEntry(store, teacher)).toBe(true)
    expect(writes).toBe(1)
    expect(store.getSnapshot().runtime).toBe(runtime)
    before.earlyTraining.hall.stage = 1
    expect(store.getSnapshot().state).toEqual(before)
  })
})
