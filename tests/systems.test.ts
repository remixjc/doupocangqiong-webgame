import { describe, expect, it } from 'vitest'
import { initialState } from '../src/core/model'
import { buy, craft, upgrade } from '../src/core/rules'
import { parseSave, serializeSave } from '../src/core/save'

describe('炼药与经济', () => {
  it('材料不足时整笔事务失败，状态不变', () => {
    const s = initialState(); s.inventory.herb = 2
    const result = craft(s, 'heal')
    expect(result.ok).toBe(false)
    expect(result.state).toBe(s)
    expect(s.inventory.herb).toBe(2)
  })
  it('同一炉材料扣除和产物入账同时完成，品质影响数量', () => {
    const s = initialState(); s.inventory.herb = 2; s.inventory.crystal = 1
    const result = craft(s, 'heal', .9)
    expect(result.ok).toBe(true)
    expect(result.state.inventory.herb).toBe(0)
    expect(result.state.inventory.crystal).toBe(0)
    expect(result.state.inventory.heal).toBe(s.inventory.heal + 2)
    expect(result.state.progress[1].brews).toBe(1)
    expect(craft(result.state, 'heal').ok).toBe(false)
  })
  it('购买不能利用负数或非整数增加金币', () => {
    const s = initialState()
    for (const quantity of [-1, .5, NaN, Infinity, 1000]) expect(buy(s, 'herb', quantity).ok).toBe(false)
    const result = buy(s, 'herb', 2)
    expect(result.state.gold).toBe(s.gold - 24)
    expect(result.state.inventory.herb).toBe(2)
  })
  it('金币不足不能强化', () => {
    const s = initialState(); s.gold = 0
    expect(upgrade(s, 'attack').state).toBe(s)
  })
})
describe('存档导入校验', () => {
  it('导出与导入完整恢复合法状态', () => {
    const s = initialState()
    expect(parseSave(serializeSave(s))).toEqual(s)
  })
  it.each(['gold', 'xp', 'attackUpgrade'])('拒绝非法 %s', field => {
    const s = { ...initialState(), [field]: -1 }
    expect(() => parseSave(serializeSave(s))).toThrow()
  })
  it('拒绝越章、未来版本、未取得异火和超大文件', () => {
    const s = initialState()
    expect(() => parseSave(serializeSave({ ...s, chapter: 2 }))).toThrow()
    expect(() => parseSave(serializeSave({ ...s, contentVersion: '9.0.0' }))).toThrow()
    expect(() => parseSave(serializeSave({ ...s, flame: 'pure' }))).toThrow()
    expect(() => parseSave('x'.repeat(1_000_001))).toThrow()
  })
  it('不采纳未知字段与注入文本', () => {
    const s = { ...initialState(), script: '<img onerror=alert(1)>' }
    expect(parseSave(serializeSave(s))).not.toHaveProperty('script')
  })
})
