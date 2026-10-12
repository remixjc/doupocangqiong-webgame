import { defineSceneRows } from './scene-rows'

export const firstHallApproachScenes = defineSceneRows(['actor', 'operation', 'title', 'text', 'action'], [
  ['ning', 'sour', '西侧的神情', '萧宁看见东架两人的交谈，脸色难看，仍在西场。', '观察神情'],
  ['ning', 'clench', '握紧双手', '他握起拳头，尚未走动。', '记录握拳'],
  ['ning', 'relax', '松开拳头', '双手松开，仍未靠近。', '记录松拳'],
  ['ning', 'clench-again', '再次握拳', '他再次握紧双手，堂内未起交战。', '记录再次握拳'],
  ['ning', 'breathe', '吐出一口气', '萧宁吐气，收住情绪。', '记录吐气'],
  ['ning', 'smile', '换上笑容', '他露出平静的笑容。', '记录笑容'],
  ['ning', 'clothes', '整理衣着', '实际整理凌乱衣着后，他准备向东架走去。', '记录实际整衣'],
  ['ning', 'aisle', '走到堂中', '他从西场走到堂中，两人仍在东架各自持卷。', '记录实际走到堂中'],
  ['ning', 'east', '走到东架前', '他继续走到两人前面，本人仍靠架阅读。', '记录实际走近东架'],
  ['bystander', 'watch', '人群看着来人', '众人看着他走向两人，露出看热闹的神情。', '观察人群反应'],
  ['yan', 'memorize', '同一第一卷的读法', '本人记下同一黑卷的运气路线与要点；只是阅读，未授战斗技能。', '记下同卷读法'],
  ['yan', 'notice', '察觉对方走近', '本人吐气皱眉，察觉堂中动静与萧宁的靠近。', '察觉来人'],
  ['yan', 'roll', '收起同一第一卷', '本人叹气，把同一第一卷卷起，尚未归架。薰儿仍持她自己的临时卷。', '卷起同一第一卷'],
  ['yan', 'archive', '靠近前段归档', '整衣、靠近与收卷分存，帮选提议与归架待续。', '归档靠近与收卷'],
] as const)

export const firstHallFirstReturnScenes = defineSceneRows(['actor', 'operation', 'title', 'text', 'action'], [
  ['ning', 'offer', '帮选的提议', '萧宁笑着提出替本人挑选几门高阶斗技，卷轴尚未交付。', '听见帮选提议'],
  ['ning', 'access', '访问资格的说法', '他称本人无权查看某些斗技，这一说法不改变技能。', '听见访问资格说法'],
  ['yan', 'decline', '本人婉拒', '本人摇头婉拒，第一卷仍在手中。', '本人婉拒帮选'],
  ['yan', 'return-first', '同一第一卷归架', '把已经卷起的同一第一卷实际放回原书架。薰儿仍持她自己的临时卷，第二卷尚未取。', '实际放回同一第一卷'],
  ['yan', 'archive-return', '同卷归架归档', '帮选与归架已分存，交锋与第二卷待续。', '归档同卷归架'],
] as const)
export const firstHallConflictScenes = defineSceneRows(['actor', 'operation', 'title', 'text', 'action'], [
  ['ning', 'taunt', '过时的三段说法', '萧宁以旧三段讥讽。只是他的过时说法，不回退本人当时四段或当前境界。', '听见过时讥讽'],
  ['yan', 'recognize', '察觉刻意讥讽', '本人叹气，明白对方刻意讥讽，尚未接受挑战。', '察觉刻意讥讽'],
  ['yan', 'childish', '回应幼稚', '本人点明对方想吸引薰儿注意，认为这种表现幼稚。', '本人回应幼稚'],
  ['ning', 'darken', '对方脸色变化', '萧宁脸色沉下，仍未动手。', '观察对方脸色'],
  ['ning', 'propose', '仅提出切磋', '对方提出试试身手。提议不表示接受或开战。', '听见切磋提议'],
  ['xuner', 'place-own', '放下她自己的卷', '薰儿先实际放下她自己的临时阅读卷。该卷不交给本人，也不是本人第二卷。', '薰儿放下自己的临时卷'],
  ['xuner', 'defend', '薰儿出面回应', '她抬眼冷声回应，提出由她来试。当前仍是言语交锋。', '听见薰儿出面回应'],
  ['ning', 'hide', '对方继续讥讽', '萧宁转而讥讽本人躲在女子身后，没有当前战斗结算。', '听见继续讥讽'],
  ['yan', 'pick-second', '踮脚取另一第二卷', '本人踮脚，从书架实际拿取另一卷。第一卷已经归架，她放下的临时卷仍独立。', '实际踮脚取本人第二卷'],
  ['yan', 'dust', '拂去第二卷灰尘', '本人拂去同一第二卷的灰尘，未登记或离堂。', '拂去同一第二卷灰尘'],
  ['yan', 'past', '回应三年前', '本人平静反问对方为何三年前不敢这样说。后续威胁与离堂另存。', '本人回应三年前'],
  ['yan', 'archive-conflict', '交锋与第二卷归档', '她自己的卷放下与本人另取第二卷分存。未开战、未登记、未离堂。', '归档交锋与第二卷'],
] as const)
export const firstHallThreatScenes = defineSceneRows(['actor', 'operation', 'title', 'text', 'action'], [
  ['ning', 'grind', '对方咬牙', '萧宁咬牙，怒意未变成当前战斗。', '观察咬牙'],
  ['ning', 'restrain', '顾忌族长之子', '他顾忌本人的身份，仍没有动手。', '观察未动手'],
  ['ning', 'inhale', '深吸一口气', '对方深吸一口气，看向本人。', '记录深吸气'],
  ['ning', 'old-genius', '旧天才的讥讽', '他以三年前的变化继续讥讽。这不改变本人境界与奖励。', '听见旧天才讥讽'],
  ['ning', 'leave-taunt', '要求离开的说法', '对方声称本人不配同行，要求离开。本人还在东架持同一第二卷。', '听见离开要求'],
  ['ning', 'ritual-threat', '来年成人礼威胁', '萧宁以明年的成人礼族人挑战威胁本人。只是未来威胁，不接受或结算当前挑战。', '听见来年成人礼威胁'],
  ['yan', 'inspect', '本人观察对方', '本人嘴角微动，偏头观察萧宁，尚未走向堂口。', '本人观察对方'],
  ['yan', 'eye-roll', '本人收回目光', '本人收回目光，第二卷仍由本人保管。', '本人收回目光'],
  ['yan', 'archive-threat', '威胁与观察归档', '未来挑战与本人观察已记下。实际向堂口走、登记同卷与离堂待续。', '归档威胁与观察'],
] as const)
export const firstHallExitResponseScenes = defineSceneRows(['actor', 'operation', 'title', 'text', 'action'], [
  ['yan', 'walk-aisle', '持同卷走向堂口', '本人持同一第二卷离开东架，实际走到堂中。第一卷与她放下的临时卷仍各在原处。', '持同一第二卷走到堂中'],
  ['ning', 'misread', '对方误解退让', '萧宁把本人的移动误解为退让。这只是他的想法，没有本人认输或当前胜利结算。', '观察对方误解'],
  ['yan', 'walk-entrance', '走到堂内入口', '本人继续持同一第二卷走到堂内入口，尚未向管理者登记，也没有跨门离堂。', '持同一第二卷走到堂内入口'],
  ['yan', 'next-year', '本人回应来年', '本人回应来年再见分晓。仍是来年的话，没有当前切磋或成人礼挑战的奖励。', '本人回应来年'],
  ['ning', 'green', '对方脸色发青', '萧宁听见回应，脸色发青。本人仍在堂内入口持同一第二卷。', '观察对方脸色发青'],
  ['yan', 'archive-exit-response', '堂内移步与回应归档', '实际位置与来年回应已分存。管理者登记、薰儿同行与跨门离堂另续。', '归档堂内移步与来年回应'],
] as const)
export const firstHallCheckoutScenes = defineSceneRows(['actor', 'operation', 'title', 'text', 'action'], [
  ['yan', 'check-held', '核对本人所持同卷', '本人在堂口持同一第二卷；第一卷已归架，她的临时卷仍独立放下。现在向斗技堂管理者办理借阅。', '核对所持同一第二卷'],
  ['yan', 'checkout-second', '实际办理同卷借阅', '本人持该同一第二卷向斗技堂管理者实际办理借阅。记录只提高本次登记，尚未与薰儿跨门离堂。', '向管理者实际登记同一第二卷'],
  ['yan', 'archive-checkout', '同卷借阅归档', '同一第二卷已经登记借出，仍由本人持有。薰儿同行与交谈、实际跨门离堂分别待续。', '归档同一第二卷借阅'],
] as const)
export function firstHallApproachScene(stage: number, continuation = false, conflict = false, threat = false, exitResponse = false, checkout = false) {
  return checkout ? firstHallCheckoutScenes[stage - 46] : exitResponse ? firstHallExitResponseScenes[stage - 40] : threat ? firstHallThreatScenes[stage - 31] : conflict ? firstHallConflictScenes[stage - 19] : continuation ? firstHallFirstReturnScenes[stage - 14] : firstHallApproachScenes[Math.min(stage, 14)]
}
