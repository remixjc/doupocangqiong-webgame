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
chapters[6].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[6].boss = '沙城出发 · 护卫投影'
chapters[6].trialNote = '失散团员与守卫为原创救援，解救和回报后再完成出发试炼；青鳞完整支线后续扩充。'
chapters[6].opening[2].text = '先与萧鼎接取救援，读青鳞线索，清除后巷守卫并按E解救团员。巷门打开后寻找水井旁的第二人；已解救节点保存，回报萧鼎后开启城外试炼。'
chapters[7].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[7].boss = '青莲地心火 · 收服确认'
chapters[7].trialNote = '三段控火、热量与冷却点为原创收服机制；第八章首通正式结算后取得青莲地心火。'
chapters[7].opening[2].text = '先与药老交谈，穿过巡逻区确认地底入口，再到控火坛开始三段挑战。各段坚持12秒，离开火域不计时；躲避预警并利用青色冷却点降温，失控可休整重试。回报后到收服台确认，再结算取得异火。'
chapters[8].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[8].boss = '大会领奖 · 成绩审核'
chapters[8].trialNote = '三轮赛制与火候为原创大会机制，各轮独立210分通过；免费重试，不重复产丹。'
chapters[8].opening[2].text = '先与法犸报名，查看赛程牌，再依序前往初赛、复赛、决赛炉。每轮三步210分通过，后两轮指针加快；失败只重试当前轮。返回法犸登记，再到领奖台审核后营地结算。'
chapters[9].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[9].trialNote = '独立演武台、三阶段风系招式和反击窗口为原创决斗机制；正式首通结算约定之战。'
chapters[9].opening[2].text = '与药老交谈，依序确认山门约碑和演武台入口，再到决斗碑开始约定之战。注意锁定突进路线、三叠风刃和旋风，闪避后趁收招反击。失败可休整，赴约准备保留。'
chapters[10].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[10].boss = '云岚山路 · 安全脱离'
chapters[10].trialNote = '追击预警与两处掩体为原创撤离机制；不击杀原著高阶追兵，保留完成的安全节点。'
chapters[10].opening[2].text = '与药老接取退路，到前哨开始撤离，再到北侧岩间和南侧竹林两个掩体，各累计稳住6秒并闪避追击预警。两点通过才允许北侧出口撤离；失败从最近安全点重建，之后营地结算前往黑角域。'
chapters[11].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[11].trialNote = '旅行补给与竞拍为原创交易玩法；旁观可免费取得情报，出发挑战为原创拦截投影。'
chapters[11].opening[2].text = '向交易执事接取情报目标，查看公告，再到竞拍台。40 / 60 / 80金币出价托管，被超价全额退款；80竞得补给，不想花钱可旁观推进。回报后再到出发碑通过拦截试炼，前往学院。'
chapters[12].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[12].boss = '外院资格 · 协作审核'
chapters[12].trialNote = '双阵协作与试炼同伴为原创资格玩法，完整伙伴支线后续扩充。'
chapters[12].opening[2].text = '若琳提供双阵协作试炼。先带同伴到集合点，再到西阵按E守阵；同伴保持西阵，你到东阵连续3秒共鸣。投影守卫能威胁同伴，失败可免费休整。登记后入院审核完成本章。'

export function chapterById(id: number): Chapter {
  const chapter = chapters.find(c => c.id === id)
  if (!chapter) throw new Error(`不存在的章节 ${id}`)
  return chapter
}
