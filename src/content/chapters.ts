import type { Chapter } from '../core/model'
import { storyChapters } from './story'

export const chapters: Chapter[] = [{
  id: 1, title: '少年与戒指', location: '乌坦城 · 萧家后山', theme: 'forest',
  summary: '曾经消失的天赋，藏着另一段机缘。跟随药老，重新迈出修炼的第一步。',
  opening: [
    { speaker: '萧炎', text: '从山下走到这里，那些议论声终于远了。我需要的不是同情，是重新开始的机会。' },
    { speaker: '药老', text: '小家伙，机会就在你手中。先采些药材，再让我看看，你是否还有面对困难的勇气。' },
    { speaker: '历练指引', text: '先在营地附近找药老接下指导：用八极崩命中木桩，再在木桩附近闪避。随后采集药草、击败投影，前往右上试炼碑。WASD 移动，1 斗技，空格闪避，E 交互。' },
  ],
  closing: [
    { speaker: '药老', text: '记住今天的感觉。力量会慢慢回来，但肯向前走的心，比天赋更难得。' },
    { speaker: '萧炎', text: '既然还能修炼，就从这一步开始。' },
  ],
  boss: '后山试炼守卫', pattern: 'slam', objectives: { herbs: 3, kills: 3, brews: 0 },
  realm: '斗之气 · 三段', reward: 140,
  trialNote: '试炼守卫为原创教学敌人，剧情对白为游戏改编。',
}]

chapters.push(...storyChapters)
// Dedicated story interactions replace the repetitive resource checklist here.
chapters[1].location = '乌坦城 · 萧家议事院'
chapters[1].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[2].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[2].boss = '成人礼武技考核 · 历练投影'
chapters[2].trialNote = '供货订单和武技考核为游戏原创历练，不直接复现原著商业细节。'

export function chapterById(id: number): Chapter {
  const chapter = chapters.find(c => c.id === id)
  if (!chapter) throw new Error(`不存在的章节 ${id}`)
  return chapter
}
