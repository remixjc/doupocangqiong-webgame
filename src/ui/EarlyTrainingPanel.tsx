import type { GameState } from '../core/model'
import { earlyTrainingBlock } from '../core/early-training'
import { gameStore } from '../core/store'

export default function EarlyTrainingPanel({ state }: { state: GameState }) {
  const blocked = earlyTrainingBlock(state)
  return <>
    <span className="eyebrow">重修往事 / 拜师之后</span>
    <h2>从一份准备单，重新开始。</h2>
    {blocked ? <p className="muted">{blocked}</p> : <>
      <p>三年约定之后，药老在后山现身，萧炎拜师。重修的下一步，是筹措资金、找到指定药材，再由老师调制供修炼使用的药液。</p>
      <p className="muted">这段往事独立记录。任务资金和材料专用于重修，不与行囊金币、灵草或魔晶混用。</p>
      <section className="bond-summary" aria-label="重修准备记录">
        <b>{state.earlyTraining.started ? '准备单已记下' : '尚未接下准备'}</b>
        <p>两种指定草药，分别三株与两株；另需一枚一阶木属性魔核。药老负责调制，萧炎准备容器与水。药液用于修炼。</p>
        <p className="muted">采购与调制的后续行程尚未展开。现在只记录准备，不代表已经取得材料或完成重修。</p>
        {!state.earlyTraining.started && <button className="primary" onClick={() => gameStore.beginEarlyTraining()}>记下重修准备</button>}
      </section>
    </>}
    <p className="muted">重修往事不会回退已完成主线，也不会重新发放章节奖励。</p>
  </>
}
