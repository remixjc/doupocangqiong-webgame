import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { certificationTargets, danFinalTargets, mindTargets, findEvent, tournamentRound, tournamentRounds } from '../content/events'
import { eventBlockReason, eventDone, eventHint, eventProgress, type EventAction } from '../core/events'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { preparationLabels, preparationProtocols, type PreparationOperation } from '../content/preparations'
import HeatControl from './HeatControl'

export default function StoryEventPanel({ state, eventId, checkpoint, close, shop }: { state: GameState; eventId?: string; checkpoint?: number; close: () => void; shop: () => void }) {
  const event = findEvent(state.chapter, eventId), progress = eventProgress(state, state.chapter, eventId)
  if (!event) return null
  const done = eventDone(state, state.chapter, event.id)
  const act = (action: EventAction) => {
    if (event.kind === 'preparation') {
      const point = checkpoint === undefined ? event.npc : event.checkpoints![checkpoint]
      const runtime = gameStore.getSnapshot().runtime
      if (!point || Math.hypot(runtime.x - point.x, runtime.y - point.y) >= 75) {
        gameStore.notify('请靠近对应札记或演练盘后再操作。'); return false
      }
      if ((['strategy', 'contain'].includes(action.type) && checkpoint !== 4) ||
        (['begin', 'deliver'].includes(action.type) && checkpoint !== undefined)) {
        gameStore.notify('选方案和控制操作在演练盘完成，接取与报告请返回札记。'); return false
      }
    }
    if (event.kind === 'bond') {
      const runtime = gameStore.getSnapshot().runtime, point = checkpoint === undefined ? event.npc : event.checkpoints![checkpoint]
      if (!point || Math.hypot(runtime.x - point.x, runtime.y - point.y) >= 75) { gameStore.notify('请靠近对应人物或书简后再操作。'); return false }
      if (action.type === 'strategy' ? checkpoint !== 1 : ['begin', 'deliver'].includes(action.type) && checkpoint !== undefined) {
        gameStore.notify(action.type === 'strategy' ? '请到回应书简选择。' : '请返回人物处接取或报告。'); return false
      }
    }
    if (['cave', 'certification', 'rescue', 'prison', 'tomb', 'inheritance', 'illusion', 'purification', 'defense', 'vault', 'flame', 'starfire', 'tournament', 'auction', 'squad', 'hunt', 'tower', 'siege', 'alliance', 'lineage', 'expedition', 'danfinal'].includes(event.kind)) {
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
      if (event.kind === 'lineage' && action.type === 'lead' && checkpoint !== 3) { gameStore.notify('请在中庭校对台比对线索。'); return false }
      if (event.kind === 'lineage' && action.type === 'deliver' && checkpoint !== undefined) { gameStore.notify('请返回风尊者处登记。'); return false }
      if (event.kind === 'expedition' && ['restart', 'deliver'].includes(action.type) && checkpoint !== undefined) { gameStore.notify('请返回丹塔执事处重试或登记。'); return false }
      if (event.kind === 'danfinal' && ['test', 'pulse'].includes(action.type) && checkpoint !== 0) { gameStore.notify('请在大会丹炉操作控火。'); return false }
      if (event.kind === 'danfinal' && ['begin', 'deliver'].includes(action.type) && checkpoint !== undefined) { gameStore.notify('请返回玄空子处接取或登记。'); return false }
      if (event.kind === 'starfire' && action.type === 'test' && checkpoint !== 1) { gameStore.notify('请在星火核心开始稳固。'); return false }
      if (event.kind === 'starfire' && ['begin', 'deliver'].includes(action.type) && checkpoint !== undefined) { gameStore.notify('请返回丹塔引路人处接取或报告。'); return false }
      if (event.kind === 'prison' && action.type === 'deliver' && (checkpoint !== undefined || !runtime.prisonEscort?.arrived)) { gameStore.notify('药老须存活并到达风尊者会合点才能报告。'); return false }
      if (event.kind === 'tomb' && ['begin', 'restart', 'deliver'].includes(action.type) && checkpoint !== undefined) { gameStore.notify('请返回薰儿处接取、重试或报告。'); return false }
      if (event.kind === 'inheritance' && ['test', 'pulse'].includes(action.type) && checkpoint !== 0) { gameStore.notify(`请在${event.checkpoints![0].label}操作心念。`); return false }
      if (event.kind === 'inheritance' && ['begin', 'deliver'].includes(action.type) && checkpoint !== undefined) { gameStore.notify(`请返回${event.speaker}处接取或报告。`); return false }
      if (event.kind === 'illusion' && action.type === 'reflect' && checkpoint !== progress.stage) { gameStore.notify('请到当前幻境观察再选择。'); return false }
      if (event.kind === 'illusion' && ['begin', 'deliver'].includes(action.type) && checkpoint !== undefined) { gameStore.notify(`请返回${event.speaker}处接取或确认。`); return false }
      if (event.kind === 'purification' && ['begin', 'deliver'].includes(action.type) && checkpoint !== undefined) { gameStore.notify('请返回净化引路人处接取或报告。'); return false }
      if (event.kind === 'defense' && ['begin', 'deliver'].includes(action.type) && checkpoint !== undefined) { gameStore.notify('请返回药老处接取或报告。'); return false }
      if (event.kind === 'vault' && action.type === 'inscribe' && checkpoint !== 4) { gameStore.notify('请在封门盘操作火纹。'); return false }
      if (event.kind === 'vault' && ['begin', 'deliver'].includes(action.type) && checkpoint !== undefined) { gameStore.notify('请返回古元处接取或报告。'); return false }
    }
    return gameStore.event({ ...action, eventId: event.id })
  }
  return <>
    <Eyebrow>{event.speaker} / 本章事件</Eyebrow><h2>{event.title}</h2>
    <p>{event.introduction}</p><MutedParagraph>{event.note}</MutedParagraph>
    <p className="quest-hint">{eventHint(state, event.id)}</p>
    {!progress.started && <PrimaryButton disabled={!!eventBlockReason(state, state.chapter, event)} onClick={() => { if (act({ type: 'begin' }) && event.kind !== 'stone') close() }}>接下历练{event.kind !== 'stone' && ' · 返回地图'}</PrimaryButton>}
    {event.kind === 'preparation' && progress.started && <>
      <p>练习凭证：{['器皿', '隔离区域', '观察记录'].map((label, index) => `${progress.score & (1 << index) ? '✓' : '◇'}${label}`).join(' · ')}</p>
      {progress.stage >= 2 && <p>演练风险 {progress.attempts % 3 * 35}/100 · 操作失误 {progress.attempts} 次 · 三次错误放弃当前方案，凭证保留。</p>}
      {checkpoint === 4 && progress.stage === 2 && <div className="camp-options">
        <SecondaryButton onClick={() => act({ type: 'strategy', choice: 'steady' })}>隔离方案 · 隔离 → 冷却 → 观察</SecondaryButton>
        <SecondaryButton onClick={() => act({ type: 'strategy', choice: 'premium' })}>缓释方案 · 冷却 → 观察 → 隔离</SecondaryButton>
      </div>}
      {checkpoint === 4 && progress.stage >= 3 && progress.stage <= 5 && progress.choice !== 'none' && <>
        <p>当前方案：{preparationProtocols[progress.choice].map(operation => preparationLabels[operation]).join(' → ')}。正在处理第{progress.stage - 2}步。</p>
        <div className="camp-options">{(Object.keys(preparationLabels) as PreparationOperation[]).map(operation =>
          <SecondaryButton key={operation} onClick={() => act({ type: 'contain', operation, stage: progress.stage, attempts: progress.attempts })}>{preparationLabels[operation]}</SecondaryButton>)}</div>
      </>}
      {checkpoint === undefined && progress.stage === 6 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>报告准备演练 · 领取一次补给</PrimaryButton>}
      <MutedParagraph>准备演练不生产毒丹，不表示毒体已被压制或控制。</MutedParagraph>
      <SecondaryButton onClick={close}>返回地图 · 继续准备</SecondaryButton>
    </>}
    {event.kind === 'bond' && progress.started && <>
      {checkpoint === 1 && progress.stage === 1 && <>
        <p>{event.bond!.question}</p><div className="camp-options">{event.bond!.options.map(option =>
          <SecondaryButton key={option.choice} onClick={() => act({ type: 'strategy', choice: option.choice })}>{option.label} · {option.reward.xp}积累 / {option.reward.heal ? `恢复丹${option.reward.heal}` : `回气丹${option.reward.mana}`}</SecondaryButton>)}</div>
      </>}
      {progress.choice !== 'none' && <MutedParagraph>{event.bond!.options.find(option => option.choice === progress.choice)?.response}</MutedParagraph>}
      {checkpoint === undefined && progress.stage === 2 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>确认伙伴记录 · 领取一次补给</PrimaryButton>}
      {!done && <SecondaryButton onClick={close}>返回地图 · 继续回访</SecondaryButton>}
    </>}
    {progress.started && event.kind === 'trade' && progress.stage === 0 && <div className="camp-options">
      {[42, 60, 90].map(amount => <SecondaryButton key={amount} onClick={() => act({ type: 'quote', amount })}>报价 {amount} 金币</SecondaryButton>)}
    </div>}
    {progress.started && event.kind === 'trade' && progress.stage === 1 && <>
      <p>已议定 {progress.quote} 金币。灵草 {state.inventory.herb}/2 · 魔晶 {state.inventory.crystal}/1</p>
      <div className="camp-options"><PrimaryButton onClick={() => act({ type: 'deliver' })}>交付材料 · 领取货款</PrimaryButton><SecondaryButton onClick={shop}>到坊市补货</SecondaryButton></div>
    </>}
    {event.kind === 'stone' && progress.started && !done && <>
      <p>累计 {progress.score} / 300 分 · 完成尝试 {progress.attempts} 次</p>
      {progress.stage === 0 ? <PrimaryButton onClick={() => act({ type: 'test' })}>开始控气测试</PrimaryButton> : <>
        <HeatControl key={`${event.id}:${progress.stage}`} reducedMotion={state.settings.reducedMotion}
          markerLabel="控气指针" inputLabel="控气位置" lockLabel={`锁定第 ${progress.stage} 道斗气`}
          onLock={marker => act({ type: 'pulse', marker, stage: progress.stage })} />
      </>}
    </>}
    {event.kind === 'stone' && done && <p>控气评分 {progress.score} / 300 · 本次练习已记录。</p>}
    {event.kind === 'competition' && progress.started && !done && <>
      {progress.stage === 0 && <div className="camp-options">
        <SecondaryButton onClick={() => act({ type: 'strategy', choice: 'steady' })}>稳妥供货 · 2 草 1 晶 / 70 金币</SecondaryButton>
        <SecondaryButton onClick={() => act({ type: 'strategy', choice: 'premium' })}>精品考察 · 4 草 2 晶 / 135 金币 + 修炼丹</SecondaryButton>
      </div>}
      {progress.stage === 4 && <><p>{progress.choice === 'premium' ? '精品' : '稳妥'}路线 · 持有灵草 {state.inventory.herb}、魔晶 {state.inventory.crystal}</p><div className="camp-options">
        <PrimaryButton onClick={() => act({ type: 'deliver' })}>交付竞争委托</PrimaryButton><SecondaryButton onClick={shop}>到坊市补货</SecondaryButton>
      </div></>}
    </>}
    {event.kind === 'cave' && progress.started && !done && <>
      {checkpoint === 1 && progress.stage === 1 && <>
        <p>三符封印 {progress.score} / 3 · 复位 {progress.attempts} 次。按石刻提示选择符文。</p>
        <div className="camp-options">{([['leaf', '叶'], ['moon', '月'], ['fire', '火']] as const).map(([symbol, label]) =>
          <SecondaryButton key={symbol} onClick={() => act({ type: 'rune', symbol, step: progress.score })}>触碰「{label}」符</SecondaryButton>)}</div>
      </>}
      {checkpoint === undefined && progress.stage === 3 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>与小医仙会合 · 确认返程</PrimaryButton>}
    </>}
    {event.kind === 'certification' && progress.started && <>
      <p>认证累计 {progress.score} / 300 分 · 已完成尝试 {progress.attempts} 次</p>
      {checkpoint === 1 && progress.stage === 1 && <PrimaryButton onClick={() => act({ type: 'test' })}>领取公会练习材料 · 开始认证</PrimaryButton>}
      {checkpoint === 1 && progress.stage >= 2 && progress.stage <= 4 && <>
        <p>当前目标火候 {certificationTargets[progress.stage - 2] * 100}% · 绿色目标区中心得分最高</p>
        <HeatControl key={`${event.id}:${progress.stage}`} reducedMotion={state.settings.reducedMotion}
          target={certificationTargets[progress.stage - 2]} targetWidth={16} targetColor="#81c99d66" markerLabel="认证控火指针"
          inputLabel="认证火候位置" lockLabel={`锁定${['提炼', '融合', '凝丹'][progress.stage - 2]}火候`}
          onLock={marker => act({ type: 'pulse', marker, stage: progress.stage })} />
      </>}
      {checkpoint === undefined && progress.stage === 5 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>登记认证 · 40金币 / 50修炼积累</PrimaryButton>}
    </>}
    {event.kind === 'purification' && progress.started && checkpoint === undefined && progress.stage === 4 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>登记三段净化 · 未发资源</PrimaryButton>}
    {event.kind === 'defense' && progress.started && checkpoint === undefined && progress.stage === 4 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>报告联盟守线 · 未额外发资源</PrimaryButton>}
    {event.kind === 'vault' && progress.started && !done && <>
      {checkpoint === 4 && progress.stage === 4 && <>
        <p>已连通火纹 {progress.score}/3 · 尝试记录 {progress.attempts}。北铭青莲 → 南铭心炎 → 西铭星火。</p>
        <div className="camp-options">{([['lotus', '青莲'], ['fallen', '心炎'], ['star', '星火']] as const).map(([symbol, label]) =>
          <SecondaryButton key={symbol} onClick={() => act({ type: 'inscribe', symbol, step: progress.score })}>触碰{label}火纹</SecondaryButton>)}</div>
      </>}
      {checkpoint === undefined && progress.stage === 6 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>报告洞府路线 · 未发资源</PrimaryButton>}
    </>}
    {event.kind === 'rescue' && progress.started && progress.stage === 3 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>向萧鼎报告 · 50金币</PrimaryButton>}
    {event.kind === 'squad' && progress.started && progress.stage === 3 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>登记协作资格 · 40积累</PrimaryButton>}
    {event.kind === 'hunt' && progress.started && <>
      <p>本次猎捕取得 {progress.score} 火能 · 当前持有 {state.fireEnergy}</p>
      {progress.stage === 3 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>登记磐门资格 · 消耗2火能 / 30积累</PrimaryButton>}
    </>}
    {event.kind === 'tower' && progress.started && progress.stage === 4 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>向苏千报告 · 准备塔底危机</PrimaryButton>}
    {event.kind === 'flame' && progress.started && <>
      {checkpoint === 1 && progress.stage === 1 && <PrimaryButton onClick={() => { if (act({ type: 'test' })) close() }}>开始三段控火 · 返回火域</PrimaryButton>}
      {checkpoint === undefined && progress.stage === 5 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>向药老确认控火准备</PrimaryButton>}
    </>}
    {event.kind === 'starfire' && progress.started && <>
      {checkpoint === 1 && progress.stage === 1 && <PrimaryButton onClick={() => { if (act({ type: 'test' })) close() }}>开始星火稳固 · 返回核心</PrimaryButton>}
      {checkpoint === undefined && progress.stage === 5 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>报告星火稳固 · 准备收服</PrimaryButton>}
    </>}
    {event.kind === 'prison' && progress.started && progress.stage === 4 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>报告安全会合 · 准备撤离</PrimaryButton>}
    {event.kind === 'tomb' && progress.started && !done && <>
      <p>已通过{Math.min(3, Math.max(0, progress.stage - 1))}/3层 · 累计启动{progress.attempts}次</p>
      {checkpoint === undefined && progress.stage >= 1 && progress.stage <= 3 && <SecondaryButton onClick={() => { if (act({ type: 'restart' })) close() }}>免费重试当前层 · 已完成层保留</SecondaryButton>}
      {checkpoint === undefined && progress.stage === 4 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>登记天墓探索记录</PrimaryButton>}
    </>}
    {event.kind === 'tournament' && progress.started && <>
      <p>已通过 {progress.roundScores?.length ?? 0} / 3 轮 · 分轮成绩 {progress.roundScores?.join(' / ') || '待完成'} · 尝试 {progress.attempts} 次</p>
      {checkpoint === tournamentRound(progress.stage) + 1 && progress.stage >= 1 && progress.stage <= 12 && <>
        <p>{tournamentRounds[tournamentRound(progress.stage)].name} · 本轮 {progress.score} / 300 分</p>
        {[1, 5, 9].includes(progress.stage) ? <PrimaryButton onClick={() => act({ type: 'test' })}>开始{tournamentRounds[tournamentRound(progress.stage)].name} · 免费赛材</PrimaryButton> : <>
          <p>目标火候 {Math.round(tournamentRounds[tournamentRound(progress.stage)].targets[(progress.stage - 2) % 4] * 100)}% · 指针速度 {tournamentRounds[tournamentRound(progress.stage)].speed}倍</p>
          <HeatControl key={`${event.id}:${progress.stage}`} reducedMotion={state.settings.reducedMotion}
            target={tournamentRounds[tournamentRound(progress.stage)].targets[(progress.stage - 2) % 4]} targetWidth={16} targetColor="#81c99d66"
            speed={tournamentRounds[tournamentRound(progress.stage)].speed} markerLabel="大会控火指针" inputLabel="大会火候位置"
            lockLabel={`锁定${tournamentRounds[tournamentRound(progress.stage)].name}${['提炼', '融合', '凝丹'][(progress.stage - 2) % 4]}火候`}
            onLock={marker => act({ type: 'pulse', marker, stage: progress.stage })} />
        </>}
      </>}
      {checkpoint === undefined && progress.stage === 13 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>登记大会成绩 · 60金币 / 80积累</PrimaryButton>}
    </>}
    {event.kind === 'auction' && progress.started && <>
      <p>可用金币 {state.gold} · {progress.stage === 2 ? `已托管 ${progress.quote}` : progress.auctionOutcome === 'won' ? '竞得旅行补给 · 已支付80金币' : progress.auctionOutcome === 'observed' ? '旁观情报 · 未支付' : '没有托管出价'}</p>
      {checkpoint === 1 && [1, 3].includes(progress.stage) && <div className="camp-options">
        {(progress.stage === 1 ? [40, 60, 80] : [80]).map(amount => <SecondaryButton key={amount} onClick={() => act({ type: 'bid', amount })}>出价{amount}金币 · 托管</SecondaryButton>)}
        <SecondaryButton onClick={() => act({ type: 'observe' })}>旁观退场 · 免费取得情报</SecondaryButton>
      </div>}
      {checkpoint === 1 && progress.stage === 2 && <PrimaryButton onClick={() => act({ type: 'resolve-bid' })}>查看对手回应 · 结算本次出价</PrimaryButton>}
      {checkpoint === undefined && progress.stage === 4 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>登记交易情报 · 30积累</PrimaryButton>}
    </>}
    {event.kind === 'siege' && progress.started && !done && <>
      <p>三阵按序通过；离阵或受击清空当前计时，已通过阵眼保留。</p>
      {checkpoint === undefined && progress.stage === 4 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>确认决战准备</PrimaryButton>}
    </>}
    {event.kind === 'alliance' && progress.started && !done && <>
      {checkpoint === undefined && progress.stage === 1 && <div className="camp-options">
        <PrimaryButton onClick={() => { if (act({ type: 'strategy', choice: 'steady' })) close() }}>免费巡防 · 清理两处守卫</PrimaryButton>
        <SecondaryButton disabled={state.gold < 60} onClick={() => { if (act({ type: 'strategy', choice: 'premium' })) close() }}>出资补给 · 支付60金币</SecondaryButton>
      </div>}
      {progress.stage >= 2 && <p>{progress.choice === 'premium' ? '补给方案已支付60金币 · 两处物资不另扣材料' : '免费巡防 · 清理对应驻点守卫后登记'}</p>}
      {checkpoint === undefined && progress.stage === 4 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>报告筹备 · 领取{progress.choice === 'premium' ? '恢复丹2 / 回气丹1' : '恢复丹1'}与40积累</PrimaryButton>}
    </>}
    {event.kind === 'lineage' && progress.started && <>
      <p>西林札记：{progress.score & 1 ? '已取得' : '待寻找'} · 东侧联络簿：{progress.score & 2 ? '已取得' : '待寻找'} · 校对{progress.attempts}次</p>
      {progress.score & 1 ? <MutedParagraph>西林札记：先提升炼药与灵魂实力，前往圣丹城丹塔。</MutedParagraph> : null}
      {progress.score & 2 ? <MutedParagraph>东侧联络簿：营救退路仍在整理，不能仓促直闯魂殿；下一程先去丹塔。</MutedParagraph> : null}
      {checkpoint === 3 && progress.stage === 2 && <div className="camp-options">
        <PrimaryButton onClick={() => act({ type: 'lead', destination: 'danta' })}>前往丹塔 · 提升炼药与灵魂</PrimaryButton>
        <SecondaryButton onClick={() => act({ type: 'lead', destination: 'rescue' })}>立即营救 · 直接闯入魂殿</SecondaryButton>
        <SecondaryButton onClick={() => act({ type: 'lead', destination: 'thunder' })}>重返雷区 · 继续争夺</SecondaryButton>
      </div>}
      {checkpoint === undefined && progress.stage === 3 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>登记丹塔之行 · 50积累</PrimaryButton>}
    </>}
    {event.kind === 'expedition' && progress.started && !done && <>
      <p>已取得 {[1, 2, 4].filter(bit => progress.score & bit).length}/3 份指定药材 · 已启动 {progress.attempts} 次</p>
      {checkpoint === undefined && progress.stage === 1 && <SecondaryButton onClick={() => { if (act({ type: 'restart' })) close() }}>免费重试 · 保留已取得节点</SecondaryButton>}
      {checkpoint === undefined && progress.stage === 2 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>登记丹界药材目标</PrimaryButton>}
    </>}
    {event.kind === 'danfinal' && progress.started && !done && <>
      <p>成丹累计 {progress.score}/300 分 · 已完成尝试 {progress.attempts} 次 · 210分通过，免费重试</p>
      {checkpoint === 0 && progress.stage === 0 && <PrimaryButton onClick={() => act({ type: 'test' })}>开始三步成丹 · 免费赛材</PrimaryButton>}
      {checkpoint === 0 && progress.stage >= 1 && progress.stage <= 3 && <>
        <p>{['提炼', '融合', '凝丹'][progress.stage - 1]}目标 {danFinalTargets[progress.stage - 1] * 100}%</p>
        <HeatControl key={`${event.id}:${progress.stage}`} reducedMotion={state.settings.reducedMotion}
          target={danFinalTargets[progress.stage - 1]} targetWidth={16} targetColor="#81c99d66" markerLabel="丹会成丹控火指针"
          inputLabel="成丹火候位置" lockLabel="锁定本步火候" onLock={marker => act({ type: 'pulse', marker, stage: progress.stage })} />
      </>}
      {checkpoint === undefined && progress.stage === 6 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>登记大会成绩 · 80积累</PrimaryButton>}
    </>}
    {event.kind === 'inheritance' && progress.started && !done && <>
      <p>心念累计{progress.score}/300分 · 已完成尝试{progress.attempts}次 · 不判定血脉品级</p>
      {checkpoint === 0 && progress.stage === 0 && <PrimaryButton onClick={() => act({ type: 'test' })}>开始传承心念稳固</PrimaryButton>}
      {checkpoint === 0 && progress.stage >= 1 && progress.stage <= 3 && <>
        <p>{event.stages[progress.stage]} · 合计210分通过</p>
        <HeatControl key={`${event.id}:${progress.stage}`} reducedMotion={state.settings.reducedMotion}
          target={mindTargets(event)[progress.stage - 1]} targetWidth={16} targetColor="#81c99d66" markerLabel="传承心念指针"
          inputLabel="传承心念位置" lockLabel="锁定本步心念" onLock={marker => act({ type: 'pulse', marker, stage: progress.stage })} />
      </>}
      {checkpoint === undefined && progress.stage === 4 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>确认{event.title} · {event.mindReward ?? 120}积累</PrimaryButton>}
    </>}
    {event.kind === 'illusion' && progress.started && !done && <>
      <p>已识破{progress.score}/3处 · 累计选择{progress.attempts}次 · 幻境资源不入行囊</p>
      {checkpoint === progress.stage && progress.stage >= 1 && progress.stage <= 3 && <>
        <p className="quest-hint">{event.reflections![progress.stage - 1].clue}</p>
        <div className="camp-options">{event.reflections![progress.stage - 1].options.map(option =>
          <SecondaryButton key={option.choice} onClick={() => act({ type: 'reflect', choice: option.choice, stage: progress.stage })}>{option.label}</SecondaryButton>)}</div>
      </>}
      {checkpoint === undefined && progress.stage === 4 && <PrimaryButton onClick={() => act({ type: 'deliver' })}>确认{event.title} · {event.reflectionReward === 0 ? '不发资源' : `${event.reflectionReward ?? 100}积累`}</PrimaryButton>}
    </>}
    {(done || (progress.started && ['training', 'vow', 'competition', 'cave', 'escort', 'survival', 'certification', 'rescue', 'prison', 'tomb', 'inheritance', 'illusion', 'purification', 'defense', 'vault', 'flame', 'starfire', 'tournament', 'escape', 'auction', 'squad', 'hunt', 'tower', 'siege', 'alliance', 'lineage', 'expedition', 'danfinal'].includes(event.kind))) && <PrimaryButton onClick={close}>{done ? '事件完成 · 继续探索' : '返回地图 · 完成操作'}</PrimaryButton>}
  </>
}
