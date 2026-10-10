import { eventForChapter } from '../content/events'
import { eventDone, eventHint } from '../core/events'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'

export default function StoryEventPanel({ state, close, shop }: { state: GameState; close: () => void; shop: () => void }) {
  const event = eventForChapter(state.chapter)
  if (!event) return null
  const progress = state.progress[state.chapter].event
  return <>
    <span className="eyebrow">{event.speaker} / 本章事件</span><h2>{event.title}</h2>
    <p>{event.introduction}</p><p className="muted">{event.note}</p>
    <p className="quest-hint">{eventHint(state)}</p>
    {!progress.started && <button className="primary" onClick={() => { if (gameStore.event({ type: 'begin' })) close() }}>接下历练 · 返回地图</button>}
    {progress.started && event.kind === 'trade' && progress.stage === 0 && <div className="camp-options">
      {[42, 60, 90].map(amount => <button className="secondary" key={amount} onClick={() => gameStore.event({ type: 'quote', amount })}>报价 {amount} 金币</button>)}
    </div>}
    {progress.started && event.kind === 'trade' && progress.stage === 1 && <>
      <p>已议定 {progress.quote} 金币。灵草 {state.inventory.herb}/2 · 魔晶 {state.inventory.crystal}/1</p>
      <div className="camp-options"><button className="primary" onClick={() => gameStore.event({ type: 'deliver' })}>交付材料 · 领取货款</button><button className="secondary" onClick={shop}>到坊市补货</button></div>
    </>}
    {(eventDone(state) || (progress.started && event.kind !== 'trade')) && <button className="primary" onClick={close}>{eventDone(state) ? '事件完成 · 继续探索' : '返回地图 · 完成操作'}</button>}
  </>
}
