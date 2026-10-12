import { defineSceneRows } from './scene-rows'
// Chapter 15 retrospective; no real-world clock or main-character stat change.
export const firstReviewScenes = defineSceneRows(['actor', 'operation', 'title', 'text', 'action'], [
  ['yan', 'period', '回看此前半月', '此前半月以修炼为主，只在饮食等需要时暂离。单独回顾这段时日，不把当前一轮当作整个半月。', '回顾此前半月修炼'],
  ['yan', 'fourth', '当时实际四段', '当时已达四段，比老师预计更早。与两个月五段预测分别记录，保持如今的主线境界。', '记录当时实际四段'],
  ['teacher', 'reaction', '老师的反应', '老师原估约一个月，见半月成果也感惊讶。这是当时反应，尚未授新技能。', '旁观老师确认修炼速度'],
  ['yan', 'pale', '离容器回望', '由本人走近容器外回望，药液绿意变淡。只记当时观察，不恢复旧药液。', '观察当时药色变淡'],
  ['yan', 'remaining', '余期疑问', '本人担心余下药性还能否支撑一个半月。这是疑问，并未得到新的保证或补药。', '记下药液余期疑问'],
  ['yan', 'dress', '整理衣着', '擦去水迹，换好衣着后再研究铁片。画面保持衣着剪影。', '擦净水迹并整理衣着'],
  ['yan', 'review-archive', '半月回顾归档', '时段、四段、老师反应与药色衣着分别归档。铁片试招和出门由下一段接续。', '归档半月回顾'],
] as const)
