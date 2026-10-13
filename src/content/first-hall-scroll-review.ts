import { defineSceneRows } from './scene-rows'
export const firstHallScrollReviewScenes = defineSceneRows(['actor', 'operation', 'title', 'text'] as const, [
  ['teacher', 'arrive', '老师到达身旁桌边', '药老走到桌边，本人仍疲惫坐在原处。'],
  ['teacher', 'flip', '翻看桌上同一借卷', '药老翻看那份第二借卷；卷仍在桌上，没有副本或新技能。'],
  ['teacher', 'assess', '老师评价这份借卷', '药老：这种浅层斗技，也值得花这些时间？'],
  ['yan', 'explain', '本人说明眼前的需要', '萧炎：除了吸掌，我还没有别的斗技。族中人人可学的只有黄阶，成人礼与人交手又该用什么？'],
  ['teacher', 'understand', '老师看出求技意图', '药老看出本人想向他求一门斗技。'],
  ['yan', 'request', '本人明确向老师求技', '萧炎没有掩饰，只把请求明明白白说出。'],
  ['teacher', 'condition', '听明日后的赠技条件', '药老：以后学会炼药，自会有人愿赠较好的斗技。这是未来条件，眼下没有赠技或收据。'],
  ['yan', 'insist', '本人坚持眼下需要', '萧炎：可我现在就需要。请求仍未成为老师实际传授。'],
  ['yan', 'archive', '翻卷与求技归档', '同卷留桌，老师在桌边，本人原位。正式传技和身体要求另续。'],
]).map(scene => ({ ...scene, action: scene.title }))
