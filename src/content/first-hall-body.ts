import { defineSceneRows } from './scene-rows'
export const firstHallBodyScenes = defineSceneRows(['actor', 'operation', 'title', 'speaker', 'text', 'action'] as const, [
  ['yan', 'hope', '想到眼前的对手', '萧炎', '当时四段，想到学会后或可对付萧宁。仅是想法，五段使用条件与身体要求仍在。', '本人记下四段的想法'],
  ['teacher', 'restrict', '弱身体无法承受', '药老', '八极崩是近身斗技，也要求身体承受。眼下筋骨弱，勉强使用可能先伤自己；这是警示，尚未受伤。', '老师说明身体限制'],
  ['yan', 'ask-improve', '怎样增强身体', '萧炎', '收住急于使用的念头，问怎样增强身体。问答不代签身体合格。', '本人询问增强办法'],
  ['teacher', 'explain-growth', '斗气成长与外力', '药老', '斗气增长能使身体更强；想加快，可借外力刺激。仅听方法，没有开始训练或升级。', '老师说明成长与外力'],
  ['yan', 'ask-stimulus', '再问具体刺激', '萧炎', '追问外力刺激是什么。接收答案与实际训练分别保存。', '本人追问刺激种类'],
  ['teacher', 'explain-beatings', '听清挨打说明', '药老', '老师解释为挨打。只记录说明，尚未出手、消耗或受伤；训练另续。', '老师说明挨打'],
  ['yan', 'archive', '身体问答归档', '往事手札', '四段想法、身体限制与增强说明归档。知识、身体强度与使用分别记录。', '归档身体问答 · 训练另续']
] as const)
