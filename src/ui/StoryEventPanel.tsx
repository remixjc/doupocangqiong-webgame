import { useEffect, useState } from 'react'
import { findEvent } from '../content/events'
import { eventDone, eventHint, eventProgress, pulseMarker, type EventAction } from '../core/events'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'

export default function StoryEventPanel({ state, eventId, close, shop }: { state: GameState; eventId?: string; close: () => void; shop: () => void }) {
  const event = findEvent(state.chapter, eventId), progress = eventProgress(state, state.chapter, eventId)
  const [marker, setMarker] = useState(0)
  useEffect(() => {
    if (event?.kind !== 'stone' || progress.stage < 1 || progress.stage > 3) return
    let last = performance.now(), elapsed = 0
    setMarker(0)
    const timer = window.setInterval(() => {
      const now = performance.now()
      if (!document.hidden) { elapsed += now - last; setMarker(pulseMarker(elapsed)) }
      last = now
    }, 30)
    return () => window.clearInterval(timer)
  }, [event?.kind, progress.stage])
  if (!event) return null
  const done = eventDone(state, state.chapter, event.id)
  const act = (action: EventAction) => gameStore.event({ ...action, eventId: event.id })
  return <>
    <span className="eyebrow">{event.speaker} / 本章事件</span><h2>{event.title}</h2>
    <p>{event.introduction}</p><p className="muted">{event.note}</p>
    <p className="quest-hint">{eventHint(state, event.id)}</p>
    {!progress.started && <button className="primary" onClick={() => { if (act({ type: 'begin' }) && event.kind !== 'stone') close() }}>接下历练{event.kind !== 'stone' && ' · 返回地图'}</button>}
    {progress.started && event.kind === 'trade' && progress.stage === 0 && <div className="camp-options">
      {[42, 60, 90].map(amount => <button className="secondary" key={amount} onClick={() => act({ type: 'quote', amount })}>报价 {amount} 金币</button>)}
    </div>}
    {progress.started && event.kind === 'trade' && progress.stage === 1 && <>
      <p>已议定 {progress.quote} 金币。灵草 {state.inventory.herb}/2 · 魔晶 {state.inventory.crystal}/1</p>
      <div className="camp-options"><button className="primary" onClick={() => act({ type: 'deliver' })}>交付材料 · 领取货款</button><button className="secondary" onClick={shop}>到坊市补货</button></div>
    </>}
    {event.kind === 'stone' && progress.started && !done && <>
      <p>累计 {progress.score} / 300 分 · 完成尝试 {progress.attempts} 次</p>
      {progress.stage === 0 ? <button className="primary" onClick={() => act({ type: 'test' })}>开始控气测试</button> : <>
        <div className="heat-meter" data-marker={marker.toFixed(3)} aria-label="控气指针"><div className="heat-target" /><i style={{ left: `${marker * 100}%` }} /></div>
        <button className="primary" onClick={() => act({ type: 'pulse', marker, stage: progress.stage })}>锁定第 {progress.stage} 道斗气</button>
      </>}
    </>}
    {event.kind === 'stone' && done && <p>控气评分 {progress.score} / 300 · 本次练习已记录。</p>}
    {event.kind === 'competition' && progress.started && !done && <>
      {progress.stage === 0 && <div className="camp-options">
        <button className="secondary" onClick={() => act({ type: 'strategy', choice: 'steady' })}>稳妥供货 · 2 草 1 晶 / 70 金币</button>
        <button className="secondary" onClick={() => act({ type: 'strategy', choice: 'premium' })}>精品考察 · 4 草 2 晶 / 135 金币 + 修炼丹</button>
      </div>}
      {progress.stage === 4 && <><p>{progress.choice === 'premium' ? '精品' : '稳妥'}路线 · 持有灵草 {state.inventory.herb}、魔晶 {state.inventory.crystal}</p><div className="camp-options">
        <button className="primary" onClick={() => act({ type: 'deliver' })}>交付竞争委托</button><button className="secondary" onClick={shop}>到坊市补货</button>
      </div></>}
    </>}
    {(done || (progress.started && ['training', 'vow', 'competition'].includes(event.kind))) && <button className="primary" onClick={close}>{done ? '事件完成 · 继续探索' : '返回地图 · 完成操作'}</button>}
  </>
}
