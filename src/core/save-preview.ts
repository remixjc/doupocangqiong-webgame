import { chapterById } from '../content/chapters'
import type { GameState, Settings } from './model'
import { bondSaveSummary } from './bonds'
import { parseSave, type SaveRecord } from './save'

export function earlyTrainingSaveSummary(saved: GameState, viewing: Settings): string {
  if (viewing.spoiler === 'anime' && viewing.animeLimit < 2) return '重修记录 · 当前范围封存'
  if (!saved.completed.includes(2)) return '重修记录 · 第2章首通后开放'
  const task = saved.earlyTraining
  if (!task.started) return '重修记录 · 尚未接取'
  const prefix = '重修记录 · '
  if (task.practice.phase === 4) return prefix + '初期尝试已归档'
  if (task.practice.phase === 3) return prefix + '斗技结果待记下'
  if (task.practice.phase === 2) return prefix + '调息通过，待试斗技'
  if (task.practice.phase === 1) return prefix + `调息 ${task.practice.pulse}/3 · ${task.practice.score}/300 · 重试${task.practice.attempts}次`
  if (task.liquid.ready) return prefix + '药液已备好，待调息'
  if (task.market.stage === 4) return prefix + `老师调制 ${task.liquid.stage}/6`
  const bought = Object.values(task.receipts).filter(Boolean).length
  if (bought === 3) return prefix + `采购齐备 · 坊市 ${task.market.stage}/4`
  if (bought > 0) return prefix + `采购 ${bought}/3 · 余额${task.purse.borrowed - task.purse.spent}`
  return prefix + (task.purse.borrowed ? '借资已记账，待采购' : '准备单已记下，待借资')
}

export function savePreviewSummary(saved: GameState, viewing: Settings): string {
  const visible = viewing.spoiler === 'novel' || saved.chapter <= viewing.animeLimit
  return `第 ${saved.chapter} 章 · ${visible ? chapterById(saved.chapter).title : '封存篇章'} · 已完成 ${saved.completed.length} 章 · ${bondSaveSummary(saved, viewing)} · ${earlyTrainingSaveSummary(saved, viewing)}`
}

export function saveRecordSummary(entry: SaveRecord, viewing: Settings): string {
  try { return savePreviewSummary(parseSave(entry.text), viewing) }
  catch { return '存档异常，可尝试恢复上一份自动备份' }
}
