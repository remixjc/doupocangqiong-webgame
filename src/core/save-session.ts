import type { GameState } from './model'
import { NewerSaveVersionError } from './save-errors'
import { loadSaveModule } from './save-module'

export class AutoSaveSession {
  private expectedAutoText: string | null | undefined
  private protectedVersion: NewerSaveVersionError | undefined

  async load(slot: number): Promise<GameState | null> {
    const { listSlots, parseSave } = await loadSaveModule()
    const records = await listSlots()
    const automatic = records.find(record => record.slot === 0)
    this.protectedVersion = undefined
    if (automatic) {
      try { parseSave(automatic.text) }
      catch (error) { if (error instanceof NewerSaveVersionError) this.protectedVersion = new NewerSaveVersionError(true) }
    }
    // Keep the original text token, including legacy or damaged auto slots, from this same read.
    // A newer automatic record cannot become a token authorizing an older session to overwrite it.
    this.expectedAutoText = this.protectedVersion ? undefined : automatic?.text ?? null
    if (slot === 0 && this.protectedVersion) throw this.protectedVersion
    const saved = records.find(record => record.slot === slot)
    return saved ? parseSave(saved.text) : null
  }

  async write(state: GameState): Promise<void> {
    if (this.protectedVersion) throw this.protectedVersion
    if (this.expectedAutoText === undefined) throw new Error('自动存档尚未读取，请先从存档管理载入旅途。')
    const { saveAutoSlot } = await loadSaveModule()
    this.expectedAutoText = await saveAutoSlot(state, this.expectedAutoText)
  }
}
