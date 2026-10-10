import type { ItemId } from '../core/model'

export interface Recipe {
  id: string; name: string; result: ItemId; cost: Partial<Record<ItemId, number>>; unlock: number; description: string
}
// Functional names and effects are original game design, not canonical pill claims.
export const recipes: Recipe[] = [
  { id: 'heal', name: '恢复丹', result: 'heal', cost: { herb: 2, crystal: 1 }, unlock: 1, description: '战斗中按 Q 使用，恢复 48% 生命，间隔 6 秒。' },
  { id: 'mana', name: '回气丹', result: 'mana', cost: { herb: 1, crystal: 1 }, unlock: 1, description: '战斗中按 F 使用，恢复斗气，和恢复丹共用间隔。' },
  { id: 'elixir', name: '修炼丹', result: 'elixir', cost: { herb: 4, crystal: 2 }, unlock: 6, description: '行囊中使用，增加修炼积累，不能越过剧情突破。' },
  { id: 'great-heal', name: '凝露丹', result: 'heal', cost: { herb: 4, crystal: 3 }, unlock: 15, description: '一炉炼出更多恢复丹，适合长程试炼。' },
]
export const itemNames: Record<ItemId, string> = { herb: '灵草', crystal: '魔晶', heal: '恢复丹', mana: '回气丹', elixir: '修炼丹' }
