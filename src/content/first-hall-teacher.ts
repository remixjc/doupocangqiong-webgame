import { defineSceneRows } from './scene-rows'
export const firstHallTeacherScenes = defineSceneRows(['actor', 'operation', 'title', 'text'] as const, [
  ['teacher', 'voice', '房中响起老声', '房中老声：她的来历，也有些不同。'],
  ['yan', 'look', '疲惫中抬头', '本人抬头，看见房中的虚幻身影。'],
  ['yan', 'recognize', '辨认房中老师', '眼前的身影是药老，薰儿已在院中分路。'],
  ['yan', 'ask', '本人询问她的背景', '萧炎：老师知道她的来历？'],
  ['teacher', 'reply', '老师只答眼前的一点', '药老：知道一点。现在追问对你无用，先不必费心；她的背景颇有力量。'],
  ['yan', 'stop', '本人收住追问', '萧炎收住好奇。眼前只记有限答复，不推断具体身份。'],
  ['yan', 'archive', '房中现身与问答归档', '老师仍在房中，同一第二借卷仍在桌上。翻卷与求技另续。'],
]).map(scene => ({ ...scene, action: scene.title }))
