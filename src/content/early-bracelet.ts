import { defineSceneRows } from './scene-rows'
// Original short scenes; licensed English chapters 12–13, see C1d source card.
export const earlyBraceletScenes = defineSceneRows(["operation","title","speaker","text","action"], [
  ["begin","坊市手链往事","旅途手札","寻找魔核时，还有一段发生在护卫介入之前的插曲。这里单独回顾，不重做已经完成的采购。","回顾坊市手链插曲"],
  ["consider","带魔核的赠礼","旅途手札","加列奥向薰儿提出赠送一只带木属性魔核的手链。礼物尚未交到她手中；这枚魔核没有进入萧炎的任务袋。","留意这份赠礼的来意"],
  ["decline","先想起老师的准备单","薰儿","魔核正是萧炎哥哥需要的东西。但这份赠礼背后，是否还有别的用意？","萧炎阻止接取赠核手链"],
  ["present","不收这份赠核手链","萧炎","老师要的材料，我们继续找。别因为一枚魔核，就欠下这份来意不明的人情。","萧炎另拿出普通绿链"],
  ["accept","另一只普通绿链","萧炎","这只没有魔核，只是普通的绿色手链。薰儿，送给你。","薰儿收下普通绿链"],
  ["finish","礼物已交到薰儿手中","旅途手札","薰儿收下了萧炎的普通绿链。此后护卫介入争执，二人继续寻找魔核；已经完成的坊市记录保留。","记下手链往事"]
] as const)
