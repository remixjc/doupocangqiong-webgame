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
chapters[3].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[3].boss = '洞穴归途 · 护卫投影'
chapters[3].trialNote = '三符机关、宝匣材料与归途护卫为原创历练；完成寻宝和回程后开启试炼。'
chapters[4].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[4].boss = '狮王警戒 · 安全撤离'
chapters[4].trialNote = '保护采药同伴后，在警戒区坚持并撤离；紫晶翼狮王不作为可击杀首领。'
chapters[3].opening[2].text = '先在洞口与小医仙交谈，读北侧石刻、解三符机关、领宝并返程，然后前往洞穴深处试炼碑。E 交互，错误机关可免费重试。'
chapters[4].opening[2].text = '先与采药同伴交谈，依次到两处药圃再返营。双方到达后 E 交互；同伴受伤可休整重试。随后与云韵交谈，到洞外警戒石开始24秒生存，躲避落焰后从西侧撤离。'
chapters[5].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[5].boss = '公会审核 · 控火资格'
chapters[5].trialNote = '三步控火认证与登记为原创练习，专用材料由公会提供，不额外生产丹药。'
chapters[5].opening[2].text = '先与认证执事交谈，读丹方台的35% / 60% / 50%三步火候，再到公会药炉锁定提炼、融合、凝丹。合计210分通过，失败免费重试；返回登记后到审核台完成本章。'

export function chapterById(id: number): Chapter {
  const chapter = chapters.find(c => c.id === id)
  if (!chapter) throw new Error(`不存在的章节 ${id}`)
  return chapter
}
