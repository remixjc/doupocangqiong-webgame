import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { nearbyEarlyWalkPlace } from '../core/early-walk'
import { earlyTrainingBlock } from '../core/early-training'
import { earlyBraceletScenes } from '../content/early-bracelet'
import { submitEarlyBracelet } from '../core/early-bracelet'
import { gameStore } from '../core/store'

export default function EarlyBracelet({ state, position }: { state: GameState; position: EarlyWalkPosition }) {
  const task = state.earlyTraining, bracelet = task.bracelet
  if (earlyTrainingBlock(state) || nearbyEarlyWalkPlace(position)?.id !== 'market'
    || !task.started || !task.receipts.bluegrass || !task.receipts.boneflower) return null
  const scene = earlyBraceletScenes[bracelet.stage]
  return <section className="bond-summary" aria-label="坊市手链往事">
    <span className="eyebrow">护卫介入之前 / 手链 {bracelet.stage}/6</span>
    {scene ? <><h3>{scene.title}</h3><b>{scene.speaker}</b><p>{scene.text}</p>
      <button className="secondary" onClick={() => submitEarlyBracelet(gameStore, position, { stage: bracelet.stage, operation: scene.operation })}>{scene.action}</button>
    </> : <><h3>手链往事已归档</h3><p>普通绿链由薰儿收好；加列奥提出的赠核手链没有接取。魔核材料仍以采购收据为准。</p></>}
    <p className="muted">普通链归属：{bracelet.gift === 'xuner' ? '薰儿已收下' : '尚未交付'}。这是独立的往事记录，不向行囊增加魔核、可售物品或关系数值，不另扣药材采购资金。</p>
  </section>
}
