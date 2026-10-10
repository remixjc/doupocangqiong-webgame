import type { Chapter } from '../core/model'

export const chapters: Chapter[] = [{
  id: 1, title: '少年与戒指', location: '乌坦城 · 萧家后山', theme: 'forest',
  summary: '曾经消失的天赋，藏着另一段机缘。跟随药老，重新迈出修炼的第一步。',
  opening: [
    { speaker: '萧炎', text: '从山下走到这里，那些议论声终于远了。我需要的不是同情，是重新开始的机会。' },
    { speaker: '药老', text: '小家伙，机会就在你手中。先采些药材，再让我看看，你是否还有面对困难的勇气。' },
    { speaker: '历练指引', text: 'WASD 移动，J 普攻，空格闪避，1 释放八极崩。靠近发光药草按 E 采集。完成目标后，到右上方的试炼碑开启挑战。' },
  ],
  closing: [
    { speaker: '药老', text: '记住今天的感觉。力量会慢慢回来，但肯向前走的心，比天赋更难得。' },
    { speaker: '萧炎', text: '既然还能修炼，就从这一步开始。' },
  ],
  boss: '后山试炼守卫', pattern: 'slam', objectives: { herbs: 3, kills: 3, brews: 0 },
  realm: '斗之气 · 三段', reward: 140,
  trialNote: '试炼守卫为原创教学敌人，剧情对白为游戏改编。',
}]

export function chapterById(id: number): Chapter {
  const chapter = chapters.find(c => c.id === id)
  if (!chapter) throw new Error(`不存在的章节 ${id}`)
  return chapter
}
