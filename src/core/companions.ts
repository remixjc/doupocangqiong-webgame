import type { GameState } from './model'

export function teacherSupport(s: GameState) {
  if (s.completed.includes(16) && !s.completed.includes(22))
    return { available: false, status: 'away' as const, label: '暂时离队', message: '药老暂时离队，无法支援。' }
  if (!s.completed.includes(1) || !s.completed.includes(2))
    return { available: false, status: 'learning' as const, label: '同行指导', message: '完成前两章后解锁药老支援。' }
  return { available: true, status: s.completed.includes(22) ? 'returned' as const : 'travelling' as const,
    label: s.completed.includes(22) ? '归队同行' : '同行指导', message: '药老支援 · 斗气恢复与短暂护体' }
}
