import { defineSceneRows } from './scene-rows'
export const firstDepartureScenes = defineSceneRows(['actor', 'space', 'place', 'operation', 'title', 'text', 'action'], [
  ['yan', 'room', 'bed', 'rise', '本人从床边起身', '有限试招已结束。本人从床边起身，才开始这次出门。', '本人从床边起身'],
  ['yan', 'room', 'bed', 'ring', '看一眼静止古戒', '本人看向静止的黑色古戒。戒指没有替本人移动，也没有在此再次拜师或授技。', '本人看一眼静止古戒'],
  ['yan', 'room', 'door', 'approach', '实际走到房门', '沿房内地面走到门口。还在房内，不用回顾一句话代签离房。', '确认本人已到房门'],
  ['yan', 'room', 'door', 'cross', '真正离开房间', '从当前门口跨到室外，房内和门外使用各自位置。室外关门仍待本人完成。', '本人跨出房门'],
  ['yan', 'outside', 'yardDoor', 'sunlight', '适应室外日光', '在门外眯眼适应炽热日光。此刻门还没有关，石路行程也尚未开始。', '适应室外明亮日光'],
  ['yan', 'outside', 'yardDoor', 'close', '从室外关门', '本人在门外仔细将同一房门关好。不能站在房内签室外关门。', '本人从室外仔细关门'],
  ['yan', 'outside', 'path', 'walk-path', '实际踏上石路', '离开门外，沿地面走到通向族内后部的石路。路口会面由下一段接续。', '确认本人已进入石路'],
  ['yan', 'outside', 'path', 'willows', '石路旁的绿柳', '石路两侧绿柳带来些许清凉，与烈日相映。本人尚未转向另一条路，也未遇见来人。', '观察石路两侧的绿柳'],
  ['yan', 'outside', 'path', 'archive', '出门与石路归档', '起身、静止古戒、实际门口、跨门、日光、关门与石路分别保存。下一段再转向路口。', '归档出门与进入石路'],
] as const)
