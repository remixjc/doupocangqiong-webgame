import { Eyebrow } from './NativeRegions'
import { BondSummary } from './NativeRegions'
import { SecondaryButton } from './Buttons'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { gameStore } from '../core/store'
import type { GameState } from '../core/model'
import { listSlots, parseSave, saveSlot, type SaveRecord } from '../core/save'
import { savePreviewSummary, saveRecordSummary } from '../core/save-preview'
import SaveStatus from './SaveStatus'
import SaveBackup from './SaveBackup'

export default function SavesPanel({ state, onLoaded, onReset }: { state: GameState; onLoaded: () => void; onReset: () => void }) {
  const { autosave } = useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot)
  const [records, setRecords] = useState<SaveRecord[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [imported, setImported] = useState<GameState | null>(null)
  const [confirm, setConfirm] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  async function refresh() {
    try { await gameStore.waitForAutosave(); setRecords(await listSlots()) } catch (e) { setError((e as Error).message) }
  }
  useEffect(() => { void refresh() }, [autosave.phase, autosave.savedAt])
  async function save(slot: number) {
    setBusy(true); setError('')
    try { await saveSlot(slot, state); await refresh(); gameStore.notify('手动存档已保存。') } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }
  async function load(slot: number) {
    setBusy(true); setError('')
    try {
      if (!await gameStore.loadSavedSlot(slot)) throw new Error('此存档槽为空。')
      onLoaded(); gameStore.notify('存档已载入，从营地继续历练。')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function importFile(file?: File) {
    if (!file) return
    try {
      if (file.size > 1_000_000) throw new Error('存档文件超过 1 MB 限制。')
      setImported(parseSave(await file.text())); setError('')
    } catch (e) { setImported(null); setError((e as Error).message) }
    if (fileInput.current) fileInput.current.value = ''
  }
  return <><Eyebrow>存档 / 留住这一程</Eyebrow><h2>长路漫漫，记下足迹。</h2><p className="muted">自动存档保存章节与行囊，战斗重开时回到营地。清理浏览器数据会删除本地存档，请导出 JSON 备份。载入会替换当前进度。</p>
    <SaveStatus />
    <div className="save-list">{[0, 1, 2, 3].map(slot => {
      const entry = records?.find(r => r.slot === slot)
      const summary = entry ? saveRecordSummary(entry, state.settings) : records ? '空白存档' : '正在读取存档…'
      return <div className="save-item" key={slot}><div><b>{slot === 0 ? '自动存档' : `手动存档 ${slot}`}</b><small>{summary}</small>{entry && <small>{new Date(entry.savedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</small>}</div><div className="save-actions">{slot > 0 && <button className="small-btn" disabled={busy || !records} onClick={() => save(slot)}>保存</button>}<button className="secondary small-btn" disabled={busy || !entry} onClick={() => load(slot)}>载入</button></div></div>
    })}</div>
    <div className="save-tools"><SaveBackup state={state} /><SecondaryButton onClick={() => fileInput.current?.click()}>导入备份</SecondaryButton><input ref={fileInput} aria-label="导入存档文件" type="file" accept=".json,application/json" hidden onChange={e => importFile(e.target.files?.[0])} /></div>
    {imported && <div className="import-preview"><p className="muted">校验通过：{savePreviewSummary(imported, state.settings)}。载入前可先导出现有进度。</p><button className="small-btn" onClick={() => { gameStore.replace(imported); setImported(null); onLoaded() }}>确认载入导入存档</button></div>}
    {records?.filter(r => r.slot === -1).map(entry => <BondSummary aria-label="上一份自动存档摘要" key={entry.slot}>
      <b>上一份自动存档</b><p>{saveRecordSummary(entry, state.settings)}</p>
      <button className="text-button" disabled={busy} onClick={() => load(-1)}>恢复上一份自动存档</button>
    </BondSummary>)}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="thin-divider" />{confirm ? <><p className="muted">新旅程会替换自动存档，三个手动存档保留。请先保存或导出当前进度。</p><SecondaryButton onClick={() => { gameStore.newGame(); onReset() }}>确认开启新旅程</SecondaryButton><button className="text-button" onClick={() => setConfirm(false)}>取消</button></> : <button className="text-button" onClick={() => setConfirm(true)}>开启新旅程</button>}
  </>
}
