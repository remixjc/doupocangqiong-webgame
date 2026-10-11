import { useEffect, useState } from 'react'
import { certificationTargets, findEvent, tournamentRound, tournamentRounds } from '../content/events'
import { eventDone, eventHint, eventProgress, pulseMarker, type EventAction } from '../core/events'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'

export default function StoryEventPanel({ state, eventId, checkpoint, close, shop }: { state: GameState; eventId?: string; checkpoint?: number; close: () => void; shop: () => void }) {
  const event = findEvent(state.chapter, eventId), progress = eventProgress(state, state.chapter, eventId)
  const [marker, setMarker] = useState(0)
  useEffect(() => {
    const moving = (event?.kind === 'stone' && progress.stage >= 1 && progress.stage <= 3) ||
      (event?.kind === 'certification' && progress.stage >= 2 && progress.stage <= 4) ||
      (event?.kind === 'tournament' && progress.stage >= 2 && progress.stage <= 12 && ![5, 9].includes(progress.stage))
    if (!moving) return
    let last = performance.now(), elapsed = 0
    setMarker(0)
    const timer = window.setInterval(() => {
      const now = performance.now()
      if (!document.hidden) { elapsed += now - last; setMarker(pulseMarker(elapsed * (event?.kind === 'tournament' ? tournamentRounds[tournamentRound(progress.stage)].speed : 1))) }
      last = now
    }, 30)
    return () => window.clearInterval(timer)
  }, [event?.kind, progress.stage])
  if (!event) return null
  const done = eventDone(state, state.chapter, event.id)
  const act = (action: EventAction) => {
    if (['cave', 'certification', 'rescue', 'flame', 'tournament', 'auction', 'squad', 'hunt', 'tower', 'siege', 'alliance'].includes(event.kind)) {
      const point = checkpoint !== undefined ? event.checkpoints![checkpoint] : event.npc
      const runtime = gameStore.getSnapshot().runtime
      if (Math.hypot(runtime.x - point.x, runtime.y - point.y) >= 75) { gameStore.notify('请靠近对应人物或机关后再操作。'); return false }
      if (event.kind === 'tournament' && (action.type === 'test' || action.type === 'pulse') &&
        checkpoint !== tournamentRound(progress.stage) + 1) { gameStore.notify('请到当前轮次的赛炉操作。'); return false }
      if (event.kind === 'auction' && ['bid', 'resolve-bid', 'observe'].includes(action.type) && checkpoint !== 1) { gameStore.notify('请到竞拍台处理出价。'); return false }
      if (event.kind === 'auction' && action.type === 'deliver' && checkpoint !== undefined) { gameStore.notify('请返回交易执事处登记。'); return false }
      if (event.kind === 'hunt' && action.type === 'deliver' && !runtime.huntTeam?.arrived) { gameStore.notify('队友须存活并返回胡嘉处，等待队友跟上。'); return false }
      if (event.kind === 'siege' && action.type === 'deliver' && checkpoint !== undefined) { gameStore.notify('请返回药老处确认决战准备。'); return false }
      if (event.kind === 'alliance' && ['strategy', 'deliver'].includes(action.type) && checkpoint !== undefined) { gameStore.notify('请返回海波东处选择方案或报告。'); return false }
    }
    return gameStore.event({ ...action, eventId: event.id })
  }
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
    {event.kind === 'cave' && progress.started && !done && <>
      {checkpoint === 1 && progress.stage === 1 && <>
        <p>三符封印 {progress.score} / 3 · 复位 {progress.attempts} 次。按石刻提示选择符文。</p>
        <div className="camp-options">{([['leaf', '叶'], ['moon', '月'], ['fire', '火']] as const).map(([symbol, label]) =>
          <button className="secondary" key={symbol} onClick={() => act({ type: 'rune', symbol, step: progress.score })}>触碰「{label}」符</button>)}</div>
      </>}
      {checkpoint === undefined && progress.stage === 3 && <button className="primary" onClick={() => act({ type: 'deliver' })}>与小医仙会合 · 确认返程</button>}
    </>}
    {event.kind === 'certification' && progress.started && <>
      <p>认证累计 {progress.score} / 300 分 · 已完成尝试 {progress.attempts} 次</p>
      {checkpoint === 1 && progress.stage === 1 && <button className="primary" onClick={() => act({ type: 'test' })}>领取公会练习材料 · 开始认证</button>}
      {checkpoint === 1 && progress.stage >= 2 && progress.stage <= 4 && <>
        <p>当前目标火候 {certificationTargets[progress.stage - 2] * 100}% · 绿色目标区中心得分最高</p>
        <div className="heat-meter" data-marker={marker.toFixed(3)} aria-label="认证控火指针"><div className="heat-target" style={{ left: `${certificationTargets[progress.stage - 2] * 100 - 8}%`, width: '16%', background: '#81c99d66' }} /><i style={{ left: `${marker * 100}%` }} /></div>
        <button className="primary" onClick={() => act({ type: 'pulse', marker, stage: progress.stage })}>锁定{['提炼', '融合', '凝丹'][progress.stage - 2]}火候</button>
      </>}
      {checkpoint === undefined && progress.stage === 5 && <button className="primary" onClick={() => act({ type: 'deliver' })}>登记认证 · 40金币 / 50修炼积累</button>}
    </>}
    {event.kind === 'rescue' && progress.started && progress.stage === 3 && <button className="primary" onClick={() => act({ type: 'deliver' })}>向萧鼎报告 · 50金币</button>}
    {event.kind === 'squad' && progress.started && progress.stage === 3 && <button className="primary" onClick={() => act({ type: 'deliver' })}>登记协作资格 · 40积累</button>}
    {event.kind === 'hunt' && progress.started && <>
      <p>本次猎捕取得 {progress.score} 火能 · 当前持有 {state.fireEnergy}</p>
      {progress.stage === 3 && <button className="primary" onClick={() => act({ type: 'deliver' })}>登记磐门资格 · 消耗2火能 / 30积累</button>}
    </>}
    {event.kind === 'tower' && progress.started && progress.stage === 4 && <button className="primary" onClick={() => act({ type: 'deliver' })}>向苏千报告 · 准备塔底危机</button>}
    {event.kind === 'flame' && progress.started && <>
      {checkpoint === 1 && progress.stage === 1 && <button className="primary" onClick={() => { if (act({ type: 'test' })) close() }}>开始三段控火 · 返回火域</button>}
      {checkpoint === undefined && progress.stage === 5 && <button className="primary" onClick={() => act({ type: 'deliver' })}>向药老确认控火准备</button>}
    </>}
    {event.kind === 'tournament' && progress.started && <>
      <p>已通过 {progress.roundScores?.length ?? 0} / 3 轮 · 分轮成绩 {progress.roundScores?.join(' / ') || '待完成'} · 尝试 {progress.attempts} 次</p>
      {checkpoint === tournamentRound(progress.stage) + 1 && progress.stage >= 1 && progress.stage <= 12 && <>
        <p>{tournamentRounds[tournamentRound(progress.stage)].name} · 本轮 {progress.score} / 300 分</p>
        {[1, 5, 9].includes(progress.stage) ? <button className="primary" onClick={() => act({ type: 'test' })}>开始{tournamentRounds[tournamentRound(progress.stage)].name} · 免费赛材</button> : <>
          <p>目标火候 {Math.round(tournamentRounds[tournamentRound(progress.stage)].targets[(progress.stage - 2) % 4] * 100)}% · 指针速度 {tournamentRounds[tournamentRound(progress.stage)].speed}倍</p>
          <div className="heat-meter" data-marker={marker.toFixed(3)} aria-label="大会控火指针"><div className="heat-target" style={{ left: `${tournamentRounds[tournamentRound(progress.stage)].targets[(progress.stage - 2) % 4] * 100 - 8}%`, width: '16%', background: '#81c99d66' }} /><i style={{ left: `${marker * 100}%` }} /></div>
          <button className="primary" onClick={() => act({ type: 'pulse', marker, stage: progress.stage })}>锁定{tournamentRounds[tournamentRound(progress.stage)].name}{['提炼', '融合', '凝丹'][(progress.stage - 2) % 4]}火候</button>
        </>}
      </>}
      {checkpoint === undefined && progress.stage === 13 && <button className="primary" onClick={() => act({ type: 'deliver' })}>登记大会成绩 · 60金币 / 80积累</button>}
    </>}
    {event.kind === 'auction' && progress.started && <>
      <p>可用金币 {state.gold} · {progress.stage === 2 ? `已托管 ${progress.quote}` : progress.auctionOutcome === 'won' ? '竞得旅行补给 · 已支付80金币' : progress.auctionOutcome === 'observed' ? '旁观情报 · 未支付' : '没有托管出价'}</p>
      {checkpoint === 1 && [1, 3].includes(progress.stage) && <div className="camp-options">
        {(progress.stage === 1 ? [40, 60, 80] : [80]).map(amount => <button className="secondary" key={amount} onClick={() => act({ type: 'bid', amount })}>出价{amount}金币 · 托管</button>)}
        <button className="secondary" onClick={() => act({ type: 'observe' })}>旁观退场 · 免费取得情报</button>
      </div>}
      {checkpoint === 1 && progress.stage === 2 && <button className="primary" onClick={() => act({ type: 'resolve-bid' })}>查看对手回应 · 结算本次出价</button>}
      {checkpoint === undefined && progress.stage === 4 && <button className="primary" onClick={() => act({ type: 'deliver' })}>登记交易情报 · 30积累</button>}
    </>}
    {event.kind === 'siege' && progress.started && !done && <>
      <p>三阵按序通过；离阵或受击清空当前计时，已通过阵眼保留。</p>
      {checkpoint === undefined && progress.stage === 4 && <button className="primary" onClick={() => act({ type: 'deliver' })}>确认决战准备</button>}
    </>}
    {event.kind === 'alliance' && progress.started && !done && <>
      {checkpoint === undefined && progress.stage === 1 && <div className="camp-options">
        <button className="primary" onClick={() => { if (act({ type: 'strategy', choice: 'steady' })) close() }}>免费巡防 · 清理两处守卫</button>
        <button className="secondary" disabled={state.gold < 60} onClick={() => { if (act({ type: 'strategy', choice: 'premium' })) close() }}>出资补给 · 支付60金币</button>
      </div>}
      {progress.stage >= 2 && <p>{progress.choice === 'premium' ? '补给方案已支付60金币 · 两处物资不另扣材料' : '免费巡防 · 清理对应驻点守卫后登记'}</p>}
      {checkpoint === undefined && progress.stage === 4 && <button className="primary" onClick={() => act({ type: 'deliver' })}>报告筹备 · 领取{progress.choice === 'premium' ? '恢复丹2 / 回气丹1' : '恢复丹1'}与40积累</button>}
    </>}
    {(done || (progress.started && ['training', 'vow', 'competition', 'cave', 'escort', 'survival', 'certification', 'rescue', 'flame', 'tournament', 'escape', 'auction', 'squad', 'hunt', 'tower', 'siege', 'alliance'].includes(event.kind))) && <button className="primary" onClick={close}>{done ? '事件完成 · 继续探索' : '返回地图 · 完成操作'}</button>}
  </>
}
