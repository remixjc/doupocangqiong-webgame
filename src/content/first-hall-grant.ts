import { defineSceneRows } from './scene-rows'
export const firstHallGrantScenes = defineSceneRows(['actor','operation','title','speaker','text','action'] as const, [
  ["teacher","approve","老师答应","药老","既然眼下需要，便教一门近身斗技。先听清条件。","老师认可 · 尚未传入知识"],
  ["yan","perk","本人振作","萧炎","听到老师答应，本人提起精神，想知道技法的层次。","振作并留意 · 仍在原位"],
  ["teacher","condition","使用条件","药老","吸掌眼下仍显弱。另一技法以五段斗之气为使用条件，不能算作当前晋阶。","听清五段条件 · 当时仍四段"],
  ["yan","ask-tier","询问品阶","萧炎","玄阶之中，这门技法具体处在哪一品阶？","本人询问品阶"],
  ["teacher","tier","品阶与来历","药老","玄阶高级。昔日持有者请我炼药，执意以这门技法相赠。","记下品阶与炼药往事"],
  ["yan","gap","理解差距","萧炎","比起家族所藏，这样的品阶令本人惊讶；老师却说得平常。","理解品阶差距 · 不签使用成功"],
  ["yan","archive","认可问答归档","往事手札","条件已听清，实际凝神、额前点触与接收知识仍待继续。","归档认可与条件"]
] as const)
