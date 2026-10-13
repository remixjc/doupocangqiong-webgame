import { returnButton } from './Buttons'
import { useSceneFocus } from './use-scene-focus'
import { Eyebrow } from './NativeRegions'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { sceneHeading } from './SceneHeading'
import { useRef } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { earlyQiExchangeBlock, submitEarlyQiExchange } from '../core/early-qi-exchange'
import { qiExchangeScenes } from '../content/early-qi-exchange'

export default function EarlyQiExchange({ state, onBack }: { state: GameState; onBack: () => void }) {
  const title = useRef<HTMLHeadingElement>(null)
  const task = state.earlyTraining.qiPavilionExchange, scene = qiExchangeScenes[task.stage]
  const blocked = earlyQiExchangeBlock(state)
  useSceneFocus(title, !blocked, [blocked])
  if (blocked) return <><p>{blocked}</p>{returnButton(onBack, "返回重修准备")}</>
  return <>
    <Eyebrow>功法阁 / 双卷交接回看</Eyebrow><h2 ref={title} tabIndex={-1}>同一卷递去，再取回。</h2>
    <p>简略保管的结局记录保留，这里回看过程。操作不会重新取卷或改变主线。</p>
    <svg role="img" aria-label={`家族卷由${task.familyOwner === 'xiaoyan' ? '萧炎' : '薰儿'}拿看；支持卷${task.support === 'shown' ? '展示中，仍归薰儿' : '未展示'}`} viewBox="0 0 600 150" className="early-walk-map">
      <rect width="600" height="150" fill="#293e35" /><text x="60" y="40" fill="#edcea0">萧炎</text><text x="450" y="40" fill="#edcea0">薰儿</text>
      <g transform={`translate(${task.familyOwner === 'xiaoyan' ? 100 : 440} 75)`}><rect width="80" height="20" rx="5" fill="#aa554b" /><text y="45" fill="#edcea0" fontSize="13">家族黄阶高级卷 ×1</text></g>
      {task.support === 'shown' && <g transform="translate(440 120)"><rect width="80" height="20" rx="5" fill="#d39662" /><text x="-180" y="15" fill="#edcea0" fontSize="13">薰儿玄阶高级支持卷 ×1</text></g>}
    </svg>
    <StatusParagraph>交接 {task.stage}/8 · 家族卷{task.familyOwner === 'xiaoyan' ? '萧炎拿看' : '薰儿拿看'} · 支持卷仍属薰儿 · {task.reply === 'declined' ? '已婉拒' : '尚待回应'}</StatusParagraph>
    {scene ? <BondSummary>{sceneHeading(scene)}
      <PrimaryButton onClick={() => submitEarlyQiExchange(gameStore, { ...task, actor: scene.actor, operation: scene.operation })}>{scene.action}</PrimaryButton>
      {task.stage >= 3 && <SecondaryButton onClick={() => submitEarlyQiExchange(gameStore, { ...task, actor: scene.actor, operation: 'take-support' })}>尝试收取支持卷</SecondaryButton>}
    </BondSummary> : <BondSummary><h3>双卷交接已归档。</h3><p>家族卷由萧炎保管，支持卷归薰儿。接续同行与萧媚房门援助。</p></BondSummary>}
    {returnButton(onBack, "暂离双卷回看 · 保留断点")}
  </>
}
