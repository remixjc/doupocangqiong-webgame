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
chapters[13].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[13].boss = '强榜守关者 · 演武投影'
chapters[13].trialNote = '双路火能猎捕、临时队友和强榜招式为原创改编，火能数量不对应原著数值。'
chapters[13].opening[2].text = '向胡嘉接取队伍猎捕，集合后按西路、东路清理投影并共同领取火能。返回支付2火能登记，再挑战强榜投影；蓄势护盾时伤害降低，收招后反击更有效。首次获胜得3火能，结算后可用火能修炼或重返复练。'
chapters[14].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[14].trialNote = '三层镇炎、镇心石和韩枫投影为压缩主线的原创玩法；陨落心炎仅在第十五章首次正式结算时取得。'
chapters[14].opening[2].text = '向苏千接取火塔镇炎，确认塔门退路后依次到三层阵眼，累计8 / 10 / 12秒并闪避落焰。镇心石降热但不计时，满100热量失控。失败保留已完成层数，回报后再挑战韩枫投影；营地首次结算才取得陨落心炎。'

chapters[15].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[15].trialNote = '三阵攻防、守阵投影和云山三阶段招式为原创宗门关卡；首通收尾后药老离队，营救仍需后续主线。'
chapters[15].opening[2].text = '与药老确认路线，到战前约碑后依次清理三处守卫，在山阶/中庭/前殿阵眼连续破阵3/4/5秒。离阵或受击清空当前计时，已破阵节点保留。回报药老后到决战碑挑战云山，注意护盾蓄势和收招窗口。'

chapters[16].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[16].trialNote = '免费巡防与出资补给为原创炎盟筹备，两路线均能推进；完成边境投影才可首通启程中州，药老仍离队。'
chapters[16].opening[2].text = '向海波东接取筹备，先看议事牌，再回人物处选择免费巡防或60金币补给。巡防需要清理两处驻点守卫，补给可直接登记物资；回报一次领取相应丹药和40积累，再到边境防线完成试炼。'

chapters[17].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[17].boss = '雷云山径 · 安全撤离'
chapters[17].trialNote = '两段避雷石与三点/交叉雷阵为原创避战撤离；不击杀原作强者，不表示此处首次获得三千雷动。'
chapters[17].opening[2].text = '向山路向导询问退路，到前哨按E开始撤离；在西侧避雷石附近累计8秒，再穿过山口到东侧累计10秒。落雷会锁定脚下，及时闪避；两段通过后到北侧出口撤离。失败免费重建最近安全点，当前段计时重新开始。'

chapters[18].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[18].boss = '星陨师门 · 联络审核'
chapters[18].trialNote = '两份师门记录、守卫与方向校对为原创联络关卡；第19章不提前营救药老，完整四阁赛事后续扩展。'
chapters[18].opening[2].text = '与风尊者接取师门联络，看师门牌后清理西林和东侧驻点守卫，带回两份记录，先后不限。到中庭校对台比对下一程，错误免费重试；返回风尊者登记，再到联络审核台确认。'

chapters[19].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[19].boss = '丹会成绩 · 大会审核'
chapters[19].trialNote = '限时药材、三步控火与18秒丹雷生存为原创丹会关卡，不判定原著丹药品级；练习不额外生成玩家丹药。'
chapters[19].opening[2].text = '先向丹塔执事完成45秒指定药材目标，再到南侧找玄空子。大会丹炉按30/70/50%三步控火，合计210分通过，失败免费重试。到丹雷台累计18秒并躲避三阶段雷击，回玄空子登记，再到审核台通过本章。'

chapters[20].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[20].boss = '三千焱炎火 · 收服确认'
chapters[20].opening[2].text = '与丹塔引路人接取稳固，确认星域退路，再在核心开启三段10 / 12 / 14秒挑战。核心内且压力不超过65才能累计，镇心石降压但不计时；受击加压，100失控免费重试当前阶段。返回报告、收服台确认后营地首通取得三千焱炎火。'
chapters[20].trialNote = '星火压力、镇心石与三段稳固为原创收服改编；不能击杀异火投影代替稳固，正式首通后才取得异火，药老仍离队。'

chapters[21].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[21].boss = '救师退路 · 撤离确认'
chapters[21].opening[2].text = '向风尊者接取，确认退路，清除外廊、内封与囚牢投影守卫并逐点E破禁。解锁囚牢后保护药老原路撤离，清理追击者；双方存活且到达风尊者处才能报告。失败免费重建当前安全段，出口确认后营地首通恢复药老支援。'
chapters[21].trialNote = '破禁、护送与追击为原创营救机制；囚牢解锁或报告均不提前恢复支援，第22章正式首通才归队。'

chapters[22].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[22].boss = '萧族传承 · 离墓审核'
chapters[22].opening[2].text = '向薰儿接取天墓探索，到入口牌启动。三层分别45 / 40 / 35秒，清理对应守卫后E读取路标；超时免费重试当前层。探索报告后向萧玄接取传承，到族史祭台锁定25 / 55 / 75%心念，合计210分通过、失败免费重试。返回报告，离墓审核后营地结算。'
chapters[22].trialNote = '限时探索与传承心念评分为原创机制，不判定原著血脉品级或修炼岁月；离墓审核不生成可击杀的传承投影。'

chapters[23].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[23].boss = '菩提观心 · 树前审核'
chapters[23].opening[2].text = '向药老接取，读取树前碑记，再依序前往欲念、旧影与岁月三境。根据卷轴、回忆和树影线索选择观察、放下与面对，错误有原因提示、可免费重选，已识破片段保存。回来确认，再到树前审核后营地结算。'
chapters[23].trialNote = '三境线索与选择为原创菩提观心，不模拟原著全部轮回；幻境奖励不进普通行囊，击杀不能代替识破。'

chapters[24].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[24].boss = '净莲妖火 · 收服确认'
chapters[24].opening[2].text = '向药老接取三镜辨识，读引路牌，依序根据丹瓶光影、旧影回应和莲纹变化选择观察、放下与面对。报告后向南侧净化引路人接取，确认退路，再到三处区域净化8/10/12秒。受击倒退2秒并增加侵蚀，满格失败免费重建当前段。回报、收服台确认后营地正式首通才取得净莲妖火。'
chapters[24].trialNote = '三镜选择与三段净化为原创压缩玩法，不复现原著全部古图或净莲传承；没有可杀的异火投影，正式首通才发异火。'

chapters[25].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[25].boss = '联盟防线 · 出征确认'
chapters[25].opening[2].text = '向药老接取守线，读联盟战报牌，再依序靠近西哨、东侧联络、后方撤离点开始各两波防守。驻点280生命，敌人会攻击驻点；击退两波且双方存活才能记录该段。失败免费重建当前段，已守住段保留，回报与出征确认后营地首通。'
chapters[25].trialNote = '三处驻点、独立生命与两波袭击为灾难后联盟筹备的原创玩法，不改变已失去族群的结局；本章不提前战胜魂天帝。'

chapters[26].objectives = { herbs: 0, kills: 0, brews: 0 }
chapters[26].boss = '本源传承 · 洞府审核'
chapters[26].opening[2].text = '向古元接取洞府探索，入口碑后三铭按青莲→心炎→星火解封。清理内殿投影、读取石刻并报告，再向内殿南侧传承引路人接取本源凝定。本源心念台35/65/85%三步合计210分通过、失败免费重试；报告和传承审核后营地首通，前往最终战场。'
chapters[26].trialNote = '三铭火纹、实体封门与本源心念评分为原创压缩探索，不复述原著古玉/洞府机关或判定真实帝境实力；传承审核不生成可杀的本源投影。'

export function chapterById(id: number): Chapter {
  const chapter = chapters.find(c => c.id === id)
  if (!chapter) throw new Error(`不存在的章节 ${id}`)
  return chapter
}
