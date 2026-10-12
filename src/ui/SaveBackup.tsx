import { SecondaryButton } from './Buttons'
import { useState, useSyncExternalStore } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { downloadSaveBackup } from './backup-download'

export default function SaveBackup({ state, recovery = false }: { state: GameState; recovery?: boolean }) {
  const [message, setMessage] = useState(''), [failed, setFailed] = useState(false)
  function exportJson() {
    try {
      downloadSaveBackup(state)
      setFailed(false); setMessage('备份下载已发起，请确认文件已保存。')
    } catch {
      setFailed(true); setMessage('备份下载未能发起，当前进度仍在页面中。请重试或检查浏览器下载权限。')
    }
  }
  return <div className="backup-download">
    {recovery && <p>也可直接备份当前任务、行囊与设置。战斗位置和敌人会从营地重建。</p>}
    <SecondaryButton onClick={exportJson}>{recovery ? '直接导出当前进度 JSON' : '导出 JSON 备份'}</SecondaryButton>
    {message && <p className={failed ? 'error' : 'muted'} role={failed ? 'alert' : 'status'}>{message}</p>}
  </div>
}

export function RecoveryBackup() {
  const { state } = useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot, gameStore.getSnapshot)
  return <SaveBackup state={state} recovery />
}
