import { useSyncExternalStore } from 'react'
import { gameStore } from '../core/store'
import './autosave.css'

export default function SaveStatus({ compact = false }: { compact?: boolean }) {
  const { autosave } = useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot, gameStore.getSnapshot)
  const labels = { idle: '尚未保存新进度', loaded: '当前旅途已读取', saving: '正在保存…', saved: '已保存', error: '保存未完成' }
  return <div className={`autosave-status ${compact ? 'compact' : ''} ${autosave.phase}`}>
    <span role="status" aria-live="polite">自动存档 · {labels[autosave.phase]}</span>
    {!compact && <>
      {autosave.savedAt && <small>上次写入：{new Date(autosave.savedAt).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai' })}</small>}
      {autosave.phase === 'saving' && <small>正在写入 {autosave.pending} 次进度变更。显示“已保存”后再刷新或关闭页面。</small>}
      {autosave.phase === 'error' && <><p className="error" role="alert">{autosave.error} 当前旅途仍在内存中，可重试或导出备份。</p><button className="secondary small-btn" onClick={() => gameStore.retryAutosave()}>重试自动保存</button></>}
    </>}
  </div>
}
