import type { GameState } from './model'
import { listSlots, parseSave, saveAutoSlot } from './save'

export class AutoSaveSession {
  private expectedAutoText: string | null | undefined

  async load(slot: number): Promise<GameState | null> {
    const records = await listSlots()
    // Keep the original text token, including legacy or damaged auto slots, from this same read.
    this.expectedAutoText = records.find(record => record.slot === 0)?.text ?? null
    const saved = records.find(record => record.slot === slot)
    return saved ? parseSave(saved.text) : null
  }

  async write(state: GameState): Promise<void> {
    if (this.expectedAutoText === undefined) throw new Error('自动存档尚未读取，请先从存档管理载入旅途。')
    this.expectedAutoText = await saveAutoSlot(state, this.expectedAutoText)
  }
}
