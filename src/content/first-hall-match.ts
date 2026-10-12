import { defineSceneRows, actorSceneKeys } from './scene-rows'
export const firstHallMatchScenes = defineSceneRows(actorSceneKeys, [
  ['yan', 'identify', '东架望西场', '本人仍靠东架读同一卷，辨认薰儿的对手是萧宁。', '本人辨认场中萧宁'],
  ['yan', 'impression', '平日的印象', '平时偶遇只有寻常招呼。两家长辈不睦，他带着敌意，却未特意嘲弄当时失意的本人。', '记录当时对萧宁的印象'],
  ['yan', 'read', '目光回到卷中', '放下思绪，继续研读第一卷。西场两人切磋，本人没有参赛。', '本人继续读同一卷'],
  ['spectator', 'defend', '西场闪避与挡招', '薰儿避开萧宁的攻势，又挡下一击。两人动作独立于东架阅读位置。', '旁观西场避开并挡下攻势'],
  ['spectator', 'smile', '薰儿望向东架', '薰儿扫视堂内，看见靠架读卷的本人，露出笑意。', '旁观薰儿看向东架'],
  ['spectator', 'warn', '群众出声提醒', '人群提醒薰儿小心身后来袭，她的目光仍留在东侧。', '听见群众提醒'],
  ['yan', 'look', '本人抬眼担忧', '本人抬眼看见袭来的攻势，眉间露出担忧。没有移动到场中。', '本人抬眼留意来袭'],
  ['spectator', 'dodge', '回应目光，左移一步', '薰儿回应东架的目光，向左小迈一步，避开攻势。', '旁观薰儿左移避招'],
  ['spectator', 'palm', '金色手掌', '薰儿掌上泛起金色，穿过对手双手，击中萧宁胸口。', '旁观薰儿掌击胸口'],
  ['spectator', 'turn', '转身化力与退场', '薰儿转身化去力量，萧宁连续后退，退到训练区之外。', '旁观转身化力与萧宁退场'],
  ['spectator', 'applause', '喝彩属于薰儿', '群众为薰儿击退对手喝彩。本人仍在东架，没有胜利、奖励或新技能。', '记录薰儿取胜与群众喝彩'],
  ['yan', 'archive', '东架旁观断点归档', '比赛结果已保存；萧宁返回、薰儿向东架走来与后续问答待接续。', '归档东架旁观比赛'],
  ['spectator', 'return', '萧宁返回', '萧宁带着笑意，走回西场中央。', '旁观萧宁返回西场中央'],
  ['spectator', 'praise', '赛后称赞', '萧宁称赞薰儿的实力，目光热切。', '听见萧宁称赞'],
  ['spectator', 'reply', '薰儿礼貌回应', '薰儿回应对方让招，没有等待答复。', '听见薰儿回应'],
  ['spectator', 'aisle', '走向东架', '薰儿径直离开西场，先走到堂中。本人仍在东架读卷。', '旁观薰儿走到堂中'],
  ['spectator', 'arrive', '到本人旁边', '薰儿继续走到东架本人旁边，尚未招呼。', '旁观薰儿实际到达东架'],
  ['spectator', 'gaze', '群众目光随行', '人群顺着薰儿行进方向，看见东架读卷的本人。', '旁观群众目光转向东架'],
  ['yan', 'continue', '本人继续读卷', '本人没有因群众的目光抬头，仍读同一第一卷。', '本人继续看同一卷'],
  ['yan', 'record', '赛后东架归档', '赛后行走已保存。招呼、薰儿自己的阅读卷和问答由下一段接续。', '归档赛后走到东架'],
] as const)
export function firstHallMatchScene(stage: number, continuation = false) {
  return (continuation ? stage >= 12 : stage < 12) ? firstHallMatchScenes[stage] : undefined
}
