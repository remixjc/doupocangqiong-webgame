import type { ChapterEvent } from './events'

export interface BondChoice {
  choice: 'steady' | 'premium'
  label: string
  response: string
  reward: { xp: number; heal?: number; mana?: number }
}
export interface BondDefinition { lineId: string; question: string; options: BondChoice[] }
export const bondLines = [
  { id: 'little-doctor', name: '小医仙', title: '同行与自持' },
  { id: 'qinglin', name: '青鳞', title: '被看见的成长' },
  { id: 'hai-bodong', name: '海波东', title: '守约与相助' },
]
export const bondEvents: { chapter: number; event: ChapterEvent }[] = [
  {
    chapter: 4,
    event: {
      id: 'doctor-cave-trust', kind: 'bond', optional: true, introducedVersion: '0.12.0',
      requires: ['hidden-cave-treasure'], title: '小医仙 · 洞外的约定', speaker: '小医仙 · 回访',
      npc: { x: 420, y: 700 },
      stages: ['到同行石记下洞穴后的约定', '前往山径书简选择回应', '返回小医仙处确认约定并领取一次补给', '洞外约定已记入伙伴手札'],
      introduction: '寻宝返程后，回访小医仙。先看同行石，再在山径书简选择如何守住彼此的信任，最后回来确认。可在主线通关后重返补做，支线不会阻挡章节结算。',
      note: '这是洞穴经历后的原创回访，不复述原著对白。选择都可推进，补给仅报告时一次发放；后续卷页需要本页真实完成，旧通关不自动记作完成。',
      checkpoints: [
        { x: 430, y: 480, label: '同行石', text: '洞穴里的合作已结束，信任却不必止于洞口。下一处书简记录你愿意作出的回应。' },
        { x: 650, y: 520, label: '山径书简', text: '先看过同行石，再选择守约的方式。' },
      ],
      bond: {
        lineId: 'little-doctor', question: '面对同行时获知的隐忧，你愿意怎样守约？',
        options: [
          { choice: 'steady', label: '尊重隐私 · 不向旁人转述', response: '你把秘密留在同行者之间，约定不以追问换取信任。', reward: { xp: 20, heal: 1 } },
          { choice: 'premium', label: '留下联络 · 需要时再相助', response: '你留下可以重逢的线索，帮助会以对方的意愿为先。', reward: { xp: 20, mana: 1 } },
        ],
      },
    },
  },
  {
    chapter: 17,
    event: {
      id: 'doctor-poison-notes', kind: 'bond', optional: true, introducedVersion: '0.12.0',
      requires: ['flame-alliance-foundation'], requiresHistory: [{ chapter: 4, eventId: 'doctor-cave-trust' }],
      title: '小医仙 · 毒体书简', speaker: '小医仙 · 往事书简', npc: { x: 520, y: 700 },
      stages: ['到旧约碑读取重逢书简', '前往自持石选择同行方式', '返回书简处确认记录并领取一次补给', '毒体书简已记入伙伴手札'],
      introduction: '炎盟筹备后，阅读营地中的往事书简，回望毒体带来的距离与戒备。承接洞外约定，选择同行方式，再回来确认。这是回望卷页，不表示人物在本章的真实时序位置。',
      note: '毒体为原作设定，书简、回访节点与选择为原创改编；不将一次选择写成治愈毒体，不消耗材料或改变主线结局。',
      checkpoints: [
        { x: 520, y: 450, label: '旧约碑', text: '昔日洞外约定仍在。力量带来距离时，同行者仍可以尊重边界。' },
        { x: 720, y: 320, label: '自持石', text: '毒体的困境不会因为一句承诺消失，选择你能长期守住的同行方式。' },
      ],
      bond: {
        lineId: 'little-doctor', question: '面对毒体的困境，怎样延续当年的约定？',
        options: [
          { choice: 'steady', label: '留出距离 · 尊重她的自持', response: '你承认担忧，也尊重她主动守住的距离。', reward: { xp: 30, heal: 1 } },
          { choice: 'premium', label: '共同寻线索 · 不轻许治愈', response: '你愿意寻找可靠线索，没有许下尚不能兑现的答案。', reward: { xp: 30, mana: 1 } },
        ],
      },
    },
  },
  {
    chapter: 22,
    event: {
      id: 'doctor-rescue-reunion', kind: 'bond', optional: true, introducedVersion: '0.12.0',
      requires: ['soul-prison-teacher-extraction'], requiresHistory: [{ chapter: 17, eventId: 'doctor-poison-notes' }],
      title: '小医仙 · 同行余页', speaker: '小医仙 · 同行书简', npc: { x: 420, y: 700 },
      stages: ['到归途记读取共同经历', '前往同行记选择下一程', '返回书简处确认并领取一次补给', '同行余页已记入伙伴手札'],
      introduction: '营救归途后，阅读伙伴书简，回望众人共同面对险境的经历。确认往日承诺如何成为下一程的行动，再回来登记。书简不会重新触发营救或重复归队。',
      note: '归途卷页为原创伙伴回望，不虚构小医仙在营救每一处的具体招式，不替代毒体控制的完整原作事件。主线完成后可回访补做。',
      checkpoints: [
        { x: 500, y: 600, label: '归途记', text: '险境已过，援手与彼此尊重仍值得记住。' },
        { x: 730, y: 230, label: '同行记', text: '经历不会抹去困境，却让同行的约定更具体。' },
      ],
      bond: {
        lineId: 'little-doctor', question: '下一程，怎样让同行的约定落到行动？',
        options: [
          { choice: 'steady', label: '照看退路 · 彼此留有余地', response: '你们约定先确认退路，不让任何人因逞强失去选择。', reward: { xp: 40, heal: 1 } },
          { choice: 'premium', label: '整理线索 · 共同筹备远行', response: '你们把可靠线索留下，共同承担下一程的准备。', reward: { xp: 40, mana: 1 } },
        ],
      },
    },
  },
  {
    chapter: 28,
    event: {
      id: 'doctor-epilogue-letter', kind: 'bond', optional: true, introducedVersion: '0.12.0',
      requiresCompleted: [28], requiresHistory: [{ chapter: 22, eventId: 'doctor-rescue-reunion' }],
      title: '小医仙 · 归途来信', speaker: '小医仙 · 归途来信', npc: { x: 420, y: 700 },
      stages: ['到旧途石读归途来信', '前往灯火记回应来信', '返回来信处登记并领取一次补给', '同行与自持四页已完成'],
      introduction: '终战正式首通后，重返最终战场营地阅读归途来信。走到旧途石，回应灯火记，再回来确认。昔日同行者的经历与新的生活，仍由她自己选择。',
      note: '来信与回应为原创尾声，不补写原著婚姻、去向或治愈结局。此卷需终战正式首通及前三页完成，不代替主线尾声；支线奖励不重复。',
      checkpoints: [
        { x: 490, y: 400, label: '旧途石', text: '回望当年洞口，珍重同行曾有的信任。' },
        { x: 650, y: 120, label: '灯火记', text: '新的生活并不要求旧约变成束缚。为来信留下回应。' },
      ],
      bond: {
        lineId: 'little-doctor', question: '历尽险境后，你会如何回应来信？',
        options: [
          { choice: 'steady', label: '祝愿安稳 · 保留她的选择', response: '你将祝愿写入归途，不用往日恩义替她决定将来。', reward: { xp: 50, heal: 1 } },
          { choice: 'premium', label: '约定再会 · 各自继续前行', response: '你留下再会的约定，也为各自的旅途留出辽阔天地。', reward: { xp: 50, mana: 1 } },
        ],
      },
    },
  },
  {
    chapter: 7,
    event: {
      id: 'qinglin-desert-listening', kind: 'bond', optional: true, introducedVersion: '0.12.1',
      requires: ['stone-desert-rescue'], title: '青鳞 · 沙城听风', speaker: '青鳞 · 往事书简', npc: { x: 520, y: 750 },
      stages: ['到听风石读取青鳞留下的线索', '前往沙城书简回应她的心事', '返回书简处确认并领取一次补给', '沙城听风已记入伙伴手札'],
      introduction: '团员脱险后，回访营地中的往事书简。读听风石，再回应青鳞的心事：她的价值并不只在能为旁人做什么。确认记录后领取一次补给。',
      note: '书简与回应为原创回望，不把团员救援写成青鳞被带离的完整原作事件；后续去向和成长细节仍需校订。两种回应均可推进，不判定人物真实实力。',
      checkpoints: [
        { x: 500, y: 400, label: '听风石', text: '青鳞留下的方向帮助了众人，也让人看见她的细心。先倾听，再回应。' },
        { x: 740, y: 300, label: '沙城书简', text: '你会怎样回应那份希望被认可的心情？' },
      ],
      bond: {
        lineId: 'qinglin', question: '青鳞担心自己只是给旁人添麻烦。你的回应是？',
        options: [
          { choice: 'steady', label: '肯定细心 · 不以出身定义她', response: '你记得她的细心，让认可落在她自己的行动上。', reward: { xp: 20, heal: 1 } },
          { choice: 'premium', label: '邀请同行 · 给她选择的余地', response: '你留下邀请，也说明同行是她可以选择的道路。', reward: { xp: 20, mana: 1 } },
        ],
      },
    },
  },
  {
    chapter: 19,
    event: {
      id: 'qinglin-growth-notes', kind: 'bond', optional: true, introducedVersion: '0.12.1',
      requires: ['star-pavilion-master-leads'], requiresHistory: [{ chapter: 7, eventId: 'qinglin-desert-listening' }],
      title: '青鳞 · 成长回望', speaker: '青鳞 · 成长书简', npc: { x: 520, y: 700 },
      stages: ['到旧沙记读取成长书简', '前往远行记回应新的道路', '返回书简处确认并领取一次补给', '成长回望已记入伙伴手札'],
      introduction: '师门联络登记后，打开营地中的成长书简，回望青鳞从拘谨到敢于选择的道路。卷页承接沙城听风，不表示她实际在此时此地重逢。',
      note: '回望、节点和两种回应为原创改编，不以数值模拟原著特殊能力、宗门训练或完整成长岁月。没有免费境界提升或新战斗支援，材料不会被扣除。',
      checkpoints: [
        { x: 500, y: 450, label: '旧沙记', text: '沙城旧约不要求她永远停在当年的位置。成长也包括决定自己愿意怎样前行。' },
        { x: 710, y: 190, label: '远行记', text: '面对新的力量与道路，留下你愿意长期守住的回应。' },
      ],
      bond: {
        lineId: 'qinglin', question: '当青鳞开始拥有自己的道路，你怎样延续当年的认可？',
        options: [
          { choice: 'steady', label: '尊重决定 · 不替她选路', response: '你承认她已经能够选择，不拿旧日照顾替代她的判断。', reward: { xp: 35, heal: 1 } },
          { choice: 'premium', label: '交换见闻 · 将彼此视作同行者', response: '你愿意听她的见闻，也将自己的经历坦诚相告。', reward: { xp: 35, mana: 1 } },
        ],
      },
    },
  },
  {
    chapter: 28,
    event: {
      id: 'qinglin-homeward-letter', kind: 'bond', optional: true, introducedVersion: '0.12.1',
      requiresCompleted: [28], requiresHistory: [{ chapter: 19, eventId: 'qinglin-growth-notes' }],
      title: '青鳞 · 远行来信', speaker: '青鳞 · 归途来信', npc: { x: 800, y: 700 },
      stages: ['到旧城记读取归途来信', '前往风灯记回应远行', '返回来信处确认并领取一次补给', '被看见的成长三页已完成'],
      introduction: '终战正式首通后，重返营地读青鳞来信。走过旧城记与风灯记，回望从沙城听风到各自远行的约定，再回来确认。',
      note: '来信为原创尾声，不补写原著宗门、修为和最终去向。需前两页真实完成与终战正式首通；不影响小医仙卷页，不重复主线或支线奖励。',
      checkpoints: [
        { x: 500, y: 300, label: '旧城记', text: '当年的沙城线索，如今成为可以坦然谈起的往事。' },
        { x: 760, y: 430, label: '风灯记', text: '风灯照着归途，也照着她愿意继续走的路。' },
      ],
      bond: {
        lineId: 'qinglin', question: '面对归途来信，你会怎样回应？',
        options: [
          { choice: 'steady', label: '祝愿自在 · 珍重她自己的选择', response: '你祝愿她走得自在，不让旧日恩义成为新的束缚。', reward: { xp: 50, heal: 1 } },
          { choice: 'premium', label: '约定交流 · 分享各自的见闻', response: '你留下交流见闻的约定，彼此都继续成长。', reward: { xp: 50, mana: 1 } },
        ],
      },
    },
  },
  {
    chapter: 8,
    event: {
      id: 'haibodong-desert-agreement', kind: 'bond', optional: true, introducedVersion: '0.12.2',
      requiresCompleted: [8], title: '海波东 · 沙漠旧约', speaker: '海波东 · 往事书简', npc: { x: 420, y: 730 },
      stages: ['到沙路记读取往事书简', '前往守约石回应相助之约', '返回书简处确认并领取一次补给', '沙漠旧约已记入伙伴手札'],
      introduction: '青莲篇章正式首通后，回访营地中的沙漠旧约。读沙路记，再到守约石回应彼此相助的约定，回来确认。书简回望相识与合作，不代表此处的真实会面时序。',
      note: '书简和回应为原创改编，不代替海波东封印、炼药履约与原作交易的完整过程；不生成原著指定丹药，不恢复人物真实境界。',
      checkpoints: [
        { x: 480, y: 470, label: '沙路记', text: '沙漠中的相助，让陌生人之间有了继续合作的理由。将约定记清，再作回应。' },
        { x: 740, y: 180, label: '守约石', text: '一份能兑现的约定，值得把条件说清楚。' },
      ],
      bond: {
        lineId: 'hai-bodong', question: '面对相助与约定，你会怎样回应？',
        options: [
          { choice: 'steady', label: '记清条件 · 按约履行', response: '你将条件逐项记下，愿意按说好的方式履行。', reward: { xp: 25, heal: 1 } },
          { choice: 'premium', label: '坦诚能力 · 共同安排下一步', response: '你说明眼下能做的事，与他共同安排下一步。', reward: { xp: 25, mana: 1 } },
        ],
      },
    },
  },
  {
    chapter: 16,
    event: {
      id: 'haibodong-yunlan-help', kind: 'bond', optional: true, introducedVersion: '0.12.2',
      requiresCompleted: [16], requiresHistory: [{ chapter: 8, eventId: 'haibodong-desert-agreement' }],
      title: '海波东 · 援手余页', speaker: '海波东 · 援手书简', npc: { x: 500, y: 730 },
      stages: ['到援手记回望共同经历', '前往余诺石回应今后的相助', '返回书简处确认并领取一次补给', '援手余页已记入伙伴手札'],
      introduction: '再临云岚正式首通后，回望海波东的相助。读取援手记，将沙漠旧约如何延续到险境之后记下来，再回书简处确认。药老离队状态继续由主线管理。',
      note: '回望卷页不重放原著云岚战斗招式，不增加战斗伙伴或提前营救药老。两种回应是原创承诺，仅报告时发一次补给；人物真实履约细节仍待校订。',
      checkpoints: [
        { x: 500, y: 500, label: '援手记', text: '旧约之外，险境中的援手也值得记住。下一程的相助，需要继续说清彼此的能力与退路。' },
        { x: 700, y: 160, label: '余诺石', text: '将感谢写成可以实践的回应。' },
      ],
      bond: {
        lineId: 'hai-bodong', question: '经历险境之后，如何珍重这份相助？',
        options: [
          { choice: 'steady', label: '整理补给 · 为下一程留退路', response: '你把感谢落实在补给与退路的准备中。', reward: { xp: 40, heal: 1 } },
          { choice: 'premium', label: '共享情报 · 让援手有所依据', response: '你愿意共享可靠情报，共同判断下一程的风险。', reward: { xp: 40, mana: 1 } },
        ],
      },
    },
  },
  {
    chapter: 28,
    event: {
      id: 'haibodong-homeward-message', kind: 'bond', optional: true, introducedVersion: '0.12.2',
      requiresCompleted: [28], requiresHistory: [{ chapter: 16, eventId: 'haibodong-yunlan-help' }],
      title: '海波东 · 故人问候', speaker: '海波东 · 归途问候', npc: { x: 1150, y: 750 },
      stages: ['到沙风记读取故人问候', '前往旧约记回应归途', '返回问候处确认并领取一次补给', '守约与相助三页已完成'],
      introduction: '终战正式首通后，重返营地读故人的问候。读沙风记、回应旧约记，再回来确认；旧日合作也可以成为轻松谈起的往事。',
      note: '问候为原创尾声，不补写海波东原著修为、职位或最终去向。此页需前两页完成，不代替主线尾声或重复首通奖励。',
      checkpoints: [
        { x: 960, y: 160, label: '沙风记', text: '曾经的沙路与约定，如今都成为归途可以谈起的往事。' },
        { x: 1170, y: 310, label: '旧约记', text: '回望相助与守约，为故人的问候留下回应。' },
      ],
      bond: {
        lineId: 'hai-bodong', question: '走过漫长旅途，怎样回应故人的问候？',
        options: [
          { choice: 'steady', label: '珍重旧约 · 祝愿各自安稳', response: '你记得相助的情义，也祝愿彼此的生活安稳。', reward: { xp: 50, heal: 1 } },
          { choice: 'premium', label: '邀谈见闻 · 约定故地再会', response: '你留下故地再会的约定，等下一次慢慢谈起见闻。', reward: { xp: 50, mana: 1 } },
        ],
      },
    },
  },
]
