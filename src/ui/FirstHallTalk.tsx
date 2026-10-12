import { HallText } from './MapPrimitives'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { hallReadingPlaces } from '../core/first-hall-reading'
import { firstHallTalkBlock, submitFirstHallTalk, type FirstHallTalkAction } from '../core/first-hall-talk'
import { firstHallTalkScenes } from '../content/first-hall-talk'
import { earlySnapshots } from '../core/early-snapshots'
import { firstHallTalkSaveSummary } from '../core/save-preview'
import { PrimaryButton, SecondaryButton } from './Buttons'
import HistoryBlocked from './HistoryBlocked'
import SceneHeading from './SceneHeading'
import MarketWalker from './MarketWalker'
import './early-walk.css'

export default function FirstHallTalk({ state, onBack }: { state: GameState; onBack: () => void }) {
  const t = state.earlyTraining, task = t.firstHallTalk, scene = firstHallTalkScenes[task.stage]
  const [actor, setActor] = useState<FirstHallTalkAction['actor']>('yan')
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const blocked = firstHallTalkBlock(state)
  const act = (operation: string) => {
    if (!scene || document.hidden) return
    submitFirstHallTalk(gameStore, hallReadingPlaces.shelf, 'hall', { ...task, expectedReading: { ...t.firstHallReading },
      expectedMatch: { ...t.firstHallMatch }, ...earlySnapshots(state, ['Entry', 'Meeting', 'Departure', 'Technique', 'Training', 'Iron', 'Ledger', 'Practice', 'Recovery', 'Hall']), actor, operation })
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key.toLowerCase() !== 'e' || event.ctrlKey || event.altKey || event.metaKey || event.repeat) return
    event.preventDefault()
    if (scene && actor === scene.actor) act(scene.operation)
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <span className="eyebrow">斗技堂 / 东架会面</span><h2>各自拿着阅读卷，说起这半月。</h2>
    <p id="hall-talk-help">明确选择本人、薰儿或人群，按E记录本步。重新进入默认关注本人；本人位置不动，四段只是当时结果。</p>
    <div className="early-walk-controls">
      <SecondaryButton aria-pressed={actor === 'yan'} onClick={() => setActor('yan')}>本人目光与答话</SecondaryButton>
      <SecondaryButton aria-pressed={actor === 'xuner'} onClick={() => setActor('xuner')}>旁观薰儿动作与发言</SecondaryButton>
      <SecondaryButton aria-pressed={actor === 'bystander'} onClick={() => setActor('bystander')}>旁观堂中人群</SecondaryButton>
    </div>
    <svg ref={field} role="group" aria-label="东架会面地图" aria-describedby="hall-talk-help" tabIndex={0} viewBox="100 190 390 115" className="early-walk-map" onKeyDown={key}>
      <rect x="100" y="190" width="390" height="115" fill="#293e36" />
      <rect x="160" y="220" width="110" height="45" fill="none" stroke="#bfa46a" />
      <HallText x="215" y="211">西侧训练场</HallText>
      <g aria-label="萧宁仍在西场" transform="translate(235 244)">
        <circle r="7" fill="#bd8d6b" /><HallText y="21" fontSize="9">萧宁</HallText>
      </g>
      <rect x="345" y="210" width="110" height="20" fill="#937954" />
      <HallText x="400" y="201">东侧书架</HallText>
      <g aria-label={task.seated ? '薰儿已坐旁边' : '薰儿仍站东架'} transform="translate(380 250)">
        <circle cy={task.seated ? 5 : 0} r="7" fill="#ae8dbd" />
        <HallText y="-13" fontSize="9">薰儿</HallText>
      </g>
      {task.ownScroll === 'xuner' && <rect aria-label="薰儿自己的临时阅读卷" x="360" y="257" width="13" height="9" fill="#604572" stroke="#c2a679" />}
      <g aria-label="萧炎本人东架位置" transform="translate(400 250)">
        <MarketWalker />
        {task.stage >= 17 && <path aria-label="轻拍头部的历史动作" d="M0 4 L-15 -5" fill="none" stroke="#eac49b" strokeWidth="3" />}
        <HallText y="26" fontSize="9">本人 · {task.stage >= 16 || task.stage >= 2 && task.stage < 12 ? '抬眼答话' : '读第一卷'}</HallText>
      </g>
      <rect aria-label="本人同一第一卷的位置或明确回顾" x="420" y="245" width="28" height="15" fill="#161e20" stroke="#bfa46a" />
    </svg>
    <p role="status">东架会面 {task.stage}/20 · {firstHallTalkSaveSummary(state, state.settings)}</p>
    <p>{t.firstHallReading.record === 'recalled' || t.hall.stage >= 6 ? '明确回顾当时第一卷，现有更高卷账不回退。' : '本人仍持同一第一卷。'}薰儿的卷{task.ownScroll === 'xuner' ? '由她临时拿看' : '尚在架上'}；旧卷账 {t.hall.stage}/9。借资{t.purse.borrowed}、已付{t.purse.spent}保持。</p>
    {scene ? <section className="bond-summary"><SceneHeading title={scene.title} text={scene.text} />
      <p>{actor === scene.actor ? '当前人物正确。' : '请明确切换到本步人物。'}</p>
      <PrimaryButton disabled={actor !== scene.actor} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      <SecondaryButton onClick={() => act('repay')}>把玩笑当作已还款</SecondaryButton>
      <SecondaryButton onClick={() => act('second')}>把她的卷记作本人第二卷</SecondaryButton>
    </section> : <section className="bond-summary"><h3>东架会面已归档。</h3><p>临时阅读卷仍由薰儿拿看，萧宁仍在西场。靠近与两卷交涉待续。</p></section>}
    <SecondaryButton onClick={onBack}>暂离东架会面 · 保留断点</SecondaryButton>
  </>
}
