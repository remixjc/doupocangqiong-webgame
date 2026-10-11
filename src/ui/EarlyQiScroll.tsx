import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { earlyQiScrollBlock, submitEarlyQiScroll } from '../core/early-qi-scroll'
import { qiScrollScenes } from '../content/early-qi-scroll'

export default function EarlyQiScroll({ state, onBack }: { state: GameState; onBack: () => void }) {
  const blocked = earlyQiScrollBlock(state)
  if (blocked) return <p className="muted">{blocked}</p>
  const task = state.earlyTraining.qiPavilionScroll
  const scene = qiScrollScenes[task.stage]
  if (!scene) return <><section className="bond-summary" aria-label="功法阁卷轴保管"><h3>家族卷已保管归档。</h3><p>四十三号房唯一家族火属性卷由萧炎保管；薰儿额外卷轴提议已婉拒。登记与离阁结果待后续正文。</p></section><button className="secondary" onClick={onBack}>返回重修往事</button></>
  return <section className="bond-summary" aria-label="功法阁卷轴保管">
    <span className="eyebrow">功法阁 / 卷轴保管 · {task.stage + 1} / 6</span>
    <h3>{scene.title}</h3>
    <p>{scene.text}</p>
    <button className="primary" onClick={() => submitEarlyQiScroll(gameStore, { ...task, operation: scene.operation })}>{scene.action}</button>
    <p className="muted">不直接修炼焚诀、不增加主线斗技或境界；本段只记录保管与婉拒。</p>
    <button className="secondary" onClick={onBack}>暂离卷轴保管 · 保留断点</button>
  </section>
}
