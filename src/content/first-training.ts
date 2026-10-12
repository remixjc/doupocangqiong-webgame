import { defineSceneRows, actorSceneKeys } from './scene-rows'
// Chapter 15, current round only. Timing choices are an original game mechanic.
export const firstTrainingScenes = defineSceneRows(actorSceneKeys, [
  ['yan', 'seat', '走近容器坐定', '清水中已有药性。由本人走到容器前，准备这一轮修炼。', '在容器中坐定'],
  ['yan', 'posture', '手势与闭眼', '保持坐姿，结起手势，闭眼收束注意。', '结手势并闭眼'],
  ['yan', 'breathe', '稳定调息', '手动把呼吸标记放在35%至65%之间，连续完成三次。偏离只重试本轮，不耗药。', '完成一次调息'],
  ['yan', 'continue', '继续吸收', '初有收获时仍保持姿势，继续这一轮修炼。', '保持姿势继续吸收'],
  ['yan', 'observe', '药性与气息', '观察淡绿气息随调息进入，水中药性继续作用。', '记录这一轮吸收'],
  ['yan', 'light', '日光渐弱', '房中光线逐渐变弱。这是叙事时段，不要求现实挂机。', '记录日光变化'],
  ['yan', 'close', '收束末缕', '收束最后气息，缓缓呼气后睁眼，再起身。', '呼气睁眼并起身'],
  ['yan', 'leave', '实际离开容器', '切回本人，沿房中地面走离容器，再收束这一轮。', '确认本人离开容器'],
  ['yan', 'forecast', '舒展与预计', '舒展后估计：照此速度，两个月或可达到五段。这是预计，尚未签实际结果。', '记下两个月预计五段'],
  ['yan', 'archive', '当前一轮归档', '保存坐定、调息与收束。半月回顾和当时四段仍由后续独立接续。', '归档当前一轮'],
] as const)
