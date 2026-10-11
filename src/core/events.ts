import { certificationTargets, danFinalTargets, heritageTargets, eventsForChapter, findEvent, tournamentRound, tournamentRounds, type ChapterEvent, type ReflectionChoice } from '../content/events'
import { blankEvent, type ChapterEventProgress, type GameState } from './model'

export type EventAction = ({ type: 'begin' | 'strike' | 'dodge' | 'deliver' | 'test' | 'survive' | 'resolve-bid' | 'observe' | 'formation' | 'restart' }
  | { type: 'seal'; index: number } | { type: 'quote'; amount: number }
  | { type: 'strategy'; choice: 'steady' | 'premium' }
  | { type: 'rune'; symbol: 'leaf' | 'moon' | 'fire'; step: number }
  | { type: 'stabilize'; stage: number }
  | { type: 'evade'; stage: number }
  | { type: 'descend'; stage: number }
  | { type: 'breach'; stage: number }
  | { type: 'lead'; destination: 'danta' | 'rescue' | 'thunder' }
  | { type: 'bid'; amount: number }
  | { type: 'reflect'; choice: ReflectionChoice; stage: number }
  | { type: 'purify'; stage: number }
  | { type: 'pulse'; marker: number; stage: number }) & { eventId?: string }
export interface EventResult { state: GameState; ok: boolean; message: string }
export function eventProgress(state: GameState, chapter = state.chapter, eventId?: string): ChapterEventProgress {
  const event = findEvent(chapter, eventId)
  return (event && state.progress[chapter]?.events[event.id]) || blankEvent()
}
export function eventDone(state: GameState, chapter = state.chapter, eventId?: string): boolean {
  const events = eventId ? [findEvent(chapter, eventId)].filter((e): e is ChapterEvent => !!e) : eventsForChapter(chapter).filter(e => !e.optional)
  if (eventId && !events.length) return false
  return events.every(e => { const p = eventProgress(state, chapter, e.id); return p.started && p.stage === e.stages.length - 1 })
}
export function nextEvent(state: GameState, includeOptional = false): ChapterEvent | undefined {
  return eventsForChapter(state.chapter).find(e => (includeOptional || !e.optional) && !eventDone(state, state.chapter, e.id))
}
export function eventHint(state: GameState, eventId?: string): string {
  const event = eventId ? findEvent(state.chapter, eventId) : nextEvent(state)
  if (!event) return ''
  const p = eventProgress(state, state.chapter, event.id)
  return p.started ? event.stages[p.stage] : `靠近${event.speaker}，按 E 接下「${event.title}」`
}
export function migrateLegacyEvent(chapter: number, bossPassed: boolean, eventId?: string): ChapterEventProgress {
  const event = findEvent(chapter, eventId)
  return event && bossPassed ? { ...blankEvent(), started: true, stage: event.stages.length - 1,
    quote: event.kind === 'trade' ? 60 : 0, score: ['stone', 'certification', 'danfinal', 'inheritance'].includes(event.kind) ? 300 : ['lineage', 'illusion'].includes(event.kind) ? 3 : event.kind === 'expedition' ? 7 : 0,
    attempts: ['tournament', 'tomb', 'illusion'].includes(event.kind) ? 3 : ['stone', 'certification', 'lineage', 'expedition', 'danfinal', 'inheritance'].includes(event.kind) ? 1 : 0,
    ...(event.kind === 'tournament' ? { roundScores: [300, 300, 300] } : {}),
    ...(event.kind === 'auction' ? { auctionOutcome: 'observed' as const } : {}),
    ...(event.kind === 'hunt' ? { huntOutcome: 'legacy' as const } : {}),
    choice: ['competition', 'alliance'].includes(event.kind) ? 'steady' : 'none' } : blankEvent()
}
export function migrateLegacyEvents(chapter: number, bossPassed: boolean): Record<string, ChapterEventProgress> {
  return Object.fromEntries(eventsForChapter(chapter).map(e => [e.id, migrateLegacyEvent(chapter, bossPassed, e.id)]))
}
export function pulseMarker(elapsedMs: number): number {
  const phase = ((elapsedMs % 3600) + 3600) % 3600 / 1800
  return phase <= 1 ? phase : 2 - phase
}
export function advanceEvent(state: GameState, action: EventAction): EventResult {
  const event = findEvent(state.chapter, action.eventId), progress = eventProgress(state, state.chapter, event?.id)
  const fail = (message: string): EventResult => ({ state, ok: false, message })
  if (!event) return fail('此篇章没有该剧情事件。')
  if (eventDone(state, state.chapter, event.id)) return fail('本次事件已经完成，奖励不会重复发放。')
  if (event.requires?.some(id => !eventDone(state, state.chapter, id))) return fail('先完成前置历练，再接下此项任务。')
  const next = structuredClone(state), p = next.progress[state.chapter].events[event.id] ??= blankEvent()
  let message = ''
  if (action.type === 'begin') {
    if (progress.started) return fail('已接下任务，继续完成当前目标。')
    p.started = true
    if (event.kind === 'tournament') p.roundScores = []
    message = event.stages[0]
  } else {
    if (!progress.started) return fail('先与本章人物交谈，接下剧情任务。')
    if (event.kind === 'training' && ((action.type === 'strike' && p.stage === 0) || (action.type === 'dodge' && p.stage === 1))) {
      p.stage++
      message = event.stages[p.stage]
    } else if (event.kind === 'vow' && action.type === 'seal' && action.index === p.stage) {
      message = event.checkpoints![p.stage].text
      p.stage++
    } else if (event.kind === 'cave' && action.type === 'seal' && action.index === 0 && p.stage <= 1) {
      p.stage = 1
      message = event.checkpoints![0].text
    } else if (event.kind === 'cave' && action.type === 'rune' && p.stage === 1) {
      if (action.step !== p.score || !['leaf', 'moon', 'fire'].includes(action.symbol)) return fail('机关输入已更新，请按当前步骤继续。')
      if (action.symbol !== ['leaf', 'moon', 'fire'][p.score]) {
        p.score = 0; p.attempts++
        message = '符文顺序不对，机关复位。没有消耗材料；可回到石刻重新查看线索。'
      } else {
        p.score++
        message = `符文响应 · 已解开 ${p.score} / 3 道封印。`
        if (p.score === 3) { p.stage = 2; p.score = 0; message = '三符相合，石门已经开启。穿过通道，前往宝匣。' }
      }
    } else if (event.kind === 'cave' && action.type === 'seal' && action.index === 2 && p.stage === 2) {
      next.inventory.herb += 3; next.inventory.crystal += 2; next.inventory.heal++
      p.stage = 3; message = event.checkpoints![2].text
    } else if (event.kind === 'cave' && action.type === 'deliver' && p.stage === 3) {
      p.stage = 4; message = '已与小医仙会合，洞穴探索完成。现在可前往试炼碑完成本章历练。'
    } else if (event.kind === 'escort' && action.type === 'seal' && action.index === p.stage && p.stage < 3) {
      if (p.stage < 2) next.inventory.herb++
      message = event.checkpoints![p.stage].text; p.stage++
    } else if (event.kind === 'survival' && action.type === 'seal' && action.index === 0 && p.stage === 0) {
      p.stage = 1; message = event.checkpoints![0].text
    } else if (event.kind === 'survival' && action.type === 'survive' && p.stage === 1) {
      p.stage = 2; message = '撤离窗口已开。前往西侧撤离标记，按 E 安全离开。'
    } else if (event.kind === 'survival' && action.type === 'seal' && action.index === 1 && p.stage === 2) {
      p.stage = 3; message = event.checkpoints![1].text
    } else if (event.kind === 'certification' && action.type === 'seal' && action.index === 0 && p.stage <= 1) {
      p.stage = 1; message = event.checkpoints![0].text
    } else if (event.kind === 'certification' && action.type === 'test' && p.stage === 1) {
      p.stage = 2; p.score = 0; message = '公会已提供本次练习材料。先提炼，再融合，最后凝丹。'
    } else if (event.kind === 'certification' && action.type === 'pulse' && p.stage >= 2 && p.stage <= 4) {
      if (action.stage !== p.stage || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1) return fail('这一步火候已锁定或输入无效。')
      p.score += Math.max(0, Math.round(100 - Math.abs(action.marker - certificationTargets[p.stage - 2]) * 200))
      p.stage++; message = `本步控火记录完成 · 累计 ${p.score} / 300 分。`
      if (p.stage === 5) {
        p.attempts++
        if (p.score < 210) { message = `本次 ${p.score} 分，未达到210分。公会材料已回收，可免费重试。`; p.stage = 1; p.score = 0 }
        else message = `三步控火通过 · ${p.score} / 300 分。返回认证执事处登记。`
      }
    } else if (event.kind === 'certification' && action.type === 'deliver' && p.stage === 5) {
      next.gold += 40; next.xp += 50; p.stage = 6
      message = '控火认证已经登记 · 40金币、50修炼积累。练习不另生成丹药，继续前往审核台。'
    } else if (event.kind === 'purification' && action.type === 'seal' && action.index === 0 && p.stage === 0) {
      p.stage = 1; message = event.checkpoints![0].text
    } else if (event.kind === 'purification' && action.type === 'purify' && action.stage === p.stage && p.stage >= 1 && p.stage <= 3) {
      p.stage++; message = p.stage === 4 ? '三段净化完成，返回引路人处报告。' : `安全阶段已记录。${event.stages[p.stage]}`
    } else if (event.kind === 'purification' && action.type === 'deliver' && p.stage === 4) {
      p.stage = 5; message = '净化登记完成，未发资源或异火。收服台确认后，营地正式首通才取得净莲妖火。'
    } else if (event.kind === 'illusion' && action.type === 'seal' && action.index === 0 && p.stage === 0) {
      p.stage = 1; message = event.checkpoints![0].text
    } else if (event.kind === 'illusion' && action.type === 'reflect' && p.stage >= 1 && p.stage <= 3) {
      const reflection = event.reflections![p.stage - 1], option = reflection.options.find(o => o.choice === action.choice)
      if (action.stage !== p.stage || !option) return fail('本境选择已经更新或无效。')
      p.attempts++; message = option.response
      if (action.choice === reflection.answer) { p.score++; p.stage++ }
    } else if (event.kind === 'illusion' && action.type === 'deliver' && p.stage === 4) {
      const reward = event.reflectionReward ?? 100
      next.xp += reward; p.stage = 5
      message = `${event.title}已确认${reward ? ` · ${reward}积累` : ' · 未发资源'}。幻象财富不进入行囊。${event.stages[p.stage]}。`
    } else if (event.kind === 'tomb' && action.type === 'seal' && action.index === p.stage && p.stage >= 0 && p.stage <= 3) {
      message = event.checkpoints![p.stage].text; p.stage++
      if (p.stage <= 3) p.attempts++
    } else if (event.kind === 'tomb' && action.type === 'restart' && p.stage >= 1 && p.stage <= 3) {
      p.attempts++; message = '当前层重新计时，已完成层保留，不扣材料。刷新/休整会重建未完成层守卫。'
    } else if (event.kind === 'tomb' && action.type === 'deliver' && p.stage === 4) {
      p.stage = 5; message = '天墓探索登记完成，未发资源。前往萧玄处接取传承稳固。'
    } else if (event.kind === 'inheritance' && action.type === 'test' && p.stage === 0) {
      p.stage = 1; p.score = 0; message = '族史祭台开始稳固。三步心念25 / 55 / 75%，合计210分通过。'
    } else if (event.kind === 'inheritance' && action.type === 'pulse' && p.stage >= 1 && p.stage <= 3) {
      if (action.stage !== p.stage || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1) return fail('心念输入已更新或无效。')
      p.score += Math.max(0, Math.round(100 - Math.abs(action.marker - heritageTargets[p.stage - 1]) * 200)); p.stage++
      message = `心念已记录 · 累计${p.score}/300分。`
      if (p.stage === 4) {
        p.attempts++
        if (p.score < 210) { message = `本次${p.score}分，未达到210分，免费重试。`; p.stage = 0; p.score = 0 }
        else message = '三步心念已稳固。返回萧玄处报告，成绩不判定血脉品级。'
      }
    } else if (event.kind === 'inheritance' && action.type === 'deliver' && p.stage === 4) {
      next.xp += 120; p.stage = 5; message = '传承稳固已报告 · 120修炼积累。前往离墓台审核，再营地结算，不发异火或材料。'
    } else if (event.kind === 'prison' && action.type === 'seal' && action.index === p.stage && p.stage >= 0 && p.stage <= 3) {
      message = event.checkpoints![p.stage].text; p.stage++
    } else if (event.kind === 'prison' && action.type === 'deliver' && p.stage === 4) {
      p.stage = 5; message = '师徒已安全会合。前往出口确认撤离，再营地首通结算；此时药老支援仍未恢复。'
    } else if (event.kind === 'starfire' && action.type === 'seal' && action.index === 0 && p.stage === 0) {
      p.stage = 1; message = event.checkpoints![0].text
    } else if (event.kind === 'starfire' && action.type === 'test' && p.stage === 1) {
      p.stage = 2; message = '星火稳固开始。压力跨段保留，核心内压力不超过65才计时；镇心石降压时不计时。'
    } else if (event.kind === 'starfire' && action.type === 'stabilize' && action.stage === p.stage && p.stage >= 2 && p.stage <= 4) {
      p.stage++; message = p.stage === 5 ? '不灭星火已稳定。返回引路人报告，再确认收服。' : event.stages[p.stage]
    } else if (event.kind === 'starfire' && action.type === 'deliver' && p.stage === 5) {
      p.stage = 6; message = '稳固记录已登记，不发异火或材料。前往收服台确认，再营地首通结算取得三千焱炎火。'
    } else if (event.kind === 'danfinal' && action.type === 'test' && p.stage === 0) {
      p.stage = 1; p.score = 0; message = '大会丹炉开始。三步火候30 / 70 / 50%，合计210分通过。'
    } else if (event.kind === 'danfinal' && action.type === 'pulse' && p.stage >= 1 && p.stage <= 3) {
      if (action.stage !== p.stage || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1) return fail('控火输入已更新或无效。')
      p.score += Math.max(0, Math.round(100 - Math.abs(action.marker - danFinalTargets[p.stage - 1]) * 200)); p.stage++
      message = `本步已锁定 · 累计${p.score}/300分。`
      if (p.stage === 4) {
        p.attempts++
        if (p.score < 210) { message = `本次${p.score}分，未达210分。免费重试三步，不扣材料。`; p.stage = 0; p.score = 0 }
        else message = '控火成丹通过。大会练习丹药不进入行囊，前往丹雷台开始生存。'
      }
    } else if (event.kind === 'danfinal' && action.type === 'seal' && action.index === 1 && p.stage === 4) {
      p.stage = 5; message = event.checkpoints![1].text
    } else if (event.kind === 'danfinal' && action.type === 'survive' && p.stage === 5) {
      p.stage = 6; message = '丹雷平息。返回玄空子处登记，再到大会审核台确认。'
    } else if (event.kind === 'danfinal' && action.type === 'deliver' && p.stage === 6) {
      next.xp += 80; p.stage = 7; message = '大会成绩已登记 · 80积累。未额外产丹，前往审核台确认。'
    } else if (event.kind === 'expedition' && action.type === 'seal' && action.index === 0 && p.stage === 0) {
      p.stage = 1; p.attempts++; message = event.checkpoints![0].text
    } else if (event.kind === 'expedition' && action.type === 'restart' && p.stage === 1) {
      p.attempts++; message = '当前未采节点重新计时45秒，已取得记录保留，未消耗金币或材料。'
    } else if (event.kind === 'expedition' && action.type === 'seal' && p.stage === 1 && [1, 2, 3].includes(action.index)) {
      const bit = 1 << (action.index - 1)
      if (p.score & bit) return fail('这份指定药材已取得，不重复领取。')
      p.score |= bit; message = event.checkpoints![action.index].text
      if (p.score === 7) { p.stage = 2; message = '三份药材已齐，时限结束。回丹塔执事登记，再准备炼药与丹雷历练。' }
    } else if (event.kind === 'expedition' && action.type === 'deliver' && p.stage === 2) {
      p.stage = 3; message = '丹界探索已经登记，不增发药材或丹药。向玄空子接取控火成丹与丹雷历练。'
    } else if (event.kind === 'lineage' && action.type === 'seal' && action.index === 0 && p.stage === 0) {
      p.stage = 1; message = event.checkpoints![0].text
    } else if (event.kind === 'lineage' && action.type === 'seal' && p.stage === 1 && [1, 2].includes(action.index)) {
      const bit = 1 << (action.index - 1)
      if (p.score & bit) return fail('这份师门记录已取得，不重复领取。')
      p.score |= bit; message = event.checkpoints![action.index].text
      if (p.score === 3) { p.stage = 2; message += ' 两份记录已齐，前往中庭校对台。' }
    } else if (event.kind === 'lineage' && action.type === 'lead' && p.stage === 2) {
      if (!['danta', 'rescue', 'thunder'].includes(action.destination)) return fail('联络方向无效。')
      p.attempts++
      if (action.destination === 'danta') { p.stage = 3; message = '两份记录均指向丹塔。返回风尊者处登记，师门继续整理营救退路。' }
      else message = '与两份记录不符。下一程需要提升炼药与灵魂实力，先去丹塔；未消耗材料，可重新校对。'
    } else if (event.kind === 'lineage' && action.type === 'deliver' && p.stage === 3) {
      next.xp += 50; p.stage = 4; message = '丹塔之行已登记 · 50积累。药老仍待营救；前往联络审核台确认出发。'
    } else if (event.kind === 'alliance' && action.type === 'seal' && action.index === 0 && p.stage === 0) {
      p.stage = 1; message = event.checkpoints![0].text
    } else if (event.kind === 'alliance' && action.type === 'strategy' && p.stage === 1) {
      if (!['steady', 'premium'].includes(action.choice)) return fail('筹备方案无效。')
      if (action.choice === 'premium' && next.gold < 60) return fail('补给筹备需60金币，金币不足未扣款。可选免费巡防。')
      if (action.choice === 'premium') next.gold -= 60
      p.choice = action.choice; p.stage = 2
      message = action.choice === 'steady' ? '免费巡防已确定。清理西侧和东侧驻点守卫，再逐处登记。' : '补给方案已支付60金币。物资由炎盟调拨，去两处驻点登记，不再扣材料。'
    } else if (event.kind === 'alliance' && action.type === 'seal' && action.index === p.stage - 1 && [2, 3].includes(p.stage)) {
      message = event.checkpoints![action.index].text; p.stage++
    } else if (event.kind === 'alliance' && action.type === 'deliver' && p.stage === 4) {
      next.inventory.heal += p.choice === 'premium' ? 2 : 1
      if (p.choice === 'premium') next.inventory.mana++
      next.xp += 40; p.stage = 5
      message = `炎盟筹备已完成 · 恢复丹${p.choice === 'premium' ? '2 / 回气丹1' : '1'}、40积累。前往边境防线完成试炼，再准备中州之行。`
    } else if (event.kind === 'siege' && action.type === 'seal' && action.index === 0 && p.stage === 0) {
      p.stage = 1; message = event.checkpoints![0].text
    } else if (event.kind === 'siege' && action.type === 'breach' && action.stage === p.stage && p.stage >= 1 && p.stage <= 3) {
      message = event.checkpoints![p.stage].text; p.stage++
    } else if (event.kind === 'siege' && action.type === 'deliver' && p.stage === 4) {
      p.stage = 5; message = '决战准备已确认。蓄势时护盾减伤，收招时反击更有效。前往宗门决战碑。'
    } else if (event.kind === 'tower' && action.type === 'seal' && action.index === 0 && p.stage === 0) {
      p.stage = 1; message = event.checkpoints![0].text
    } else if (event.kind === 'tower' && action.type === 'descend' && action.stage === p.stage && p.stage >= 1 && p.stage <= 3) {
      p.stage++; message = p.stage === 4 ? '三层心炎已稳定。返回苏千处报告，再准备塔底危机。' : `已完成上一层，安全台阶已记录。${event.stages[p.stage]}`
    } else if (event.kind === 'tower' && action.type === 'deliver' && p.stage === 4) {
      p.stage = 5; message = '塔底退路已报告，不增发材料或异火。通过韩枫投影后，首次正式结算才取得陨落心炎。'
    } else if (event.kind === 'hunt' && action.type === 'seal' && action.index === p.stage && p.stage < 3) {
      if (p.stage > 0) { next.fireEnergy += 2; p.score += 2 }
      message = event.checkpoints![p.stage].text; p.stage++
    } else if (event.kind === 'hunt' && action.type === 'deliver' && p.stage === 3) {
      if (next.fireEnergy < 2) return fail('登记需2火能。完成两路猎捕可取得4火能，登记前不能用于普通修炼。')
      next.fireEnergy -= 2; next.xp += 30; p.stage = 4; p.huntOutcome = 'completed'
      message = '磐门修炼资格已登记 · 消耗2火能、获得30积累。前往强榜演武台。'
    } else if (event.kind === 'squad' && action.type === 'seal' && action.index === p.stage && p.stage <= 1) {
      message = event.checkpoints![p.stage].text; p.stage++
    } else if (event.kind === 'squad' && action.type === 'formation' && p.stage === 2) {
      p.stage = 3; message = event.checkpoints![2].text
    } else if (event.kind === 'squad' && action.type === 'deliver' && p.stage === 3) {
      next.xp += 40; p.stage = 4; message = '协作资格已经登记 · 40修炼积累。前往入院审核台。'
    } else if (event.kind === 'auction' && action.type === 'seal' && action.index === 0 && p.stage === 0) {
      p.stage = 1; message = event.checkpoints![0].text
    } else if (event.kind === 'auction' && action.type === 'bid' && [1, 3].includes(p.stage)) {
      if (![40, 60, 80].includes(action.amount) || (p.stage === 3 && action.amount <= p.score)) return fail('报价需高于对手60金币，才能继续竞拍。')
      if (next.gold < action.amount) return fail('金币不足，未托管出价。可选择旁观，仍能取得退路情报。')
      next.gold -= action.amount; p.quote = action.amount; p.attempts++; p.stage = 2
      message = `已托管${action.amount}金币，等待对手回应。刷新不会再次扣款。`
    } else if (event.kind === 'auction' && action.type === 'resolve-bid' && p.stage === 2) {
      if (p.quote < 80) {
        next.gold += p.quote; p.quote = 0; p.score = 60; p.stage = 3
        message = '对手报出60金币。你的托管已全额退回，可加价80或旁观退出。'
      } else {
        next.inventory.heal += 2; next.inventory.mana += 2; p.auctionOutcome = 'won'; p.stage = 4
        message = '80金币竞得旅行补给 · 恢复丹2 / 回气丹2。前往学院的退路情报已取得，返回执事登记。'
      }
    } else if (event.kind === 'auction' && action.type === 'observe' && [1, 3].includes(p.stage)) {
      p.auctionOutcome = 'observed'; p.stage = 4
      message = '旁观交易取得退路情报。未扣金币、没有旅行补给，返回执事登记。'
    } else if (event.kind === 'auction' && action.type === 'deliver' && p.stage === 4) {
      next.xp += 30; p.stage = 5
      message = '交易结果与退路情报已登记 · 30修炼积累。前往出发碑完成路上拦截试炼。'
    } else if (event.kind === 'escape' && action.type === 'seal' && action.index === 0 && p.stage === 0) {
      p.stage = 1; message = event.checkpoints![0].text
    } else if (event.kind === 'escape' && action.type === 'evade' && action.stage === p.stage && [1, 2].includes(p.stage)) {
      message = event.checkpoints![p.stage].text; p.stage++
    } else if (event.kind === 'escape' && action.type === 'seal' && action.index === 3 && p.stage === 3) {
      p.stage = 4; message = event.checkpoints![3].text
    } else if (event.kind === 'tournament' && action.type === 'seal' && action.index === 0 && p.stage === 0) {
      p.stage = 1; message = event.checkpoints![0].text
    } else if (event.kind === 'tournament' && action.type === 'test' && [1, 5, 9].includes(p.stage)) {
      p.stage++; p.score = 0; message = event.stages[p.stage]
    } else if (event.kind === 'tournament' && action.type === 'pulse' && p.stage >= 2 && p.stage <= 12 && ![5, 9].includes(p.stage)) {
      if (action.stage !== p.stage || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1) return fail('本步火候已更新或输入无效。')
      const round = tournamentRound(p.stage), step = p.stage - (round * 4 + 2)
      p.score += Math.max(0, Math.round(100 - Math.abs(action.marker - tournamentRounds[round].targets[step]) * 200))
      p.stage++; message = `本轮已锁定 · ${p.score} / 300 分。`
      if ([5, 9, 13].includes(p.stage)) {
        p.attempts++
        if (p.score < 210) {
          message = `${tournamentRounds[round].name}${p.score}分，未达210分。已通过轮次保留，可免费重试本轮。`
          p.stage = round * 4 + 1
        } else {
          p.roundScores!.push(p.score)
          message = `${tournamentRounds[round].name}${p.score}分通过 · ${event.stages[p.stage]}`
        }
        p.score = 0
      }
    } else if (event.kind === 'tournament' && action.type === 'deliver' && p.stage === 13) {
      next.gold += 60; next.xp += 80; p.stage = 14
      message = `大会成绩登记 · ${p.roundScores!.join(' / ')}分，60金币 / 80修炼积累。前往领奖台审核。`
    } else if (event.kind === 'rescue' && action.type === 'seal' && action.index === 0 && p.stage >= 1) {
      message = event.checkpoints![0].text
    } else if (event.kind === 'rescue' && action.type === 'seal' && action.index === p.stage && p.stage < 3) {
      if (p.stage > 0) next.inventory.heal++
      message = event.checkpoints![p.stage].text; p.stage++
    } else if (event.kind === 'rescue' && action.type === 'deliver' && p.stage === 3) {
      next.gold += 50; p.stage = 4; message = '两位团员脱险的消息已带回 · 50金币。前往城外试炼碑，准备下一程。'
    } else if (event.kind === 'flame' && action.type === 'seal' && action.index === 0 && p.stage <= 1) {
      p.stage = 1; message = event.checkpoints![0].text
    } else if (event.kind === 'flame' && action.type === 'test' && p.stage === 1) {
      p.stage = 2; message = event.checkpoints![1].text
    } else if (event.kind === 'flame' && action.type === 'stabilize' && p.stage >= 2 && p.stage <= 4 && action.stage === p.stage) {
      p.stage++; message = p.stage === 5 ? '三段火焰已稳定，返回药老处确认。' : `本段控火完成 · ${event.stages[p.stage]}`
    } else if (event.kind === 'flame' && action.type === 'deliver' && p.stage === 5) {
      p.stage = 6; message = '控火准备已确认。前往收服台，再返回营地正式结算；异火尚未入手。'
    } else if (event.kind === 'trade' && action.type === 'quote' && p.stage === 0) {
      if (![42, 60].includes(action.amount)) return fail('报价超过买方预算，订单未签订，也没有消耗材料。')
      p.quote = action.amount
      p.stage = 1
      message = `订单议定 ${action.amount} 金币，备好材料后返回执事处交付。`
    } else if (event.kind === 'stone' && action.type === 'test' && p.stage === 0) {
      p.stage = 1; p.score = 0; message = '指针靠近中央时锁定斗气，三次合计需 180 分。'
    } else if (event.kind === 'stone' && action.type === 'pulse' && p.stage >= 1 && p.stage <= 3) {
      if (action.stage !== p.stage || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1) return fail('此道斗气已锁定或输入无效。')
      p.score += Math.round(100 - Math.abs(action.marker - .5) * 200); p.stage++
      message = `已锁定 · 累计 ${p.score} / 300 分。`
      if (p.stage === 4) {
        p.attempts++
        if (p.score < 180) { message = `本次 ${p.score} 分，未达到 180 分。未消耗材料，可免费重新测试。`; p.stage = 0; p.score = 0 }
        else message = `控气测试通过 · ${p.score} / 300 分。评估不改变原著境界。`
      }
    } else if (event.kind === 'competition' && action.type === 'strategy' && p.stage === 0) {
      if (!['steady', 'premium'].includes(action.choice)) return fail('委托策略无效。')
      p.choice = action.choice; p.stage = action.choice === 'steady' ? 4 : 1
      message = event.stages[p.stage]
    } else if (event.kind === 'competition' && action.type === 'seal' && p.choice === 'premium' && p.stage >= 1 && p.stage <= 3 && action.index === p.stage - 1) {
      message = event.checkpoints![action.index].text; p.stage++
    } else if (action.type === 'deliver' && ((event.kind === 'trade' && p.stage === 1) || (event.kind === 'competition' && p.stage === 4))) {
      const premium = p.choice === 'premium', herbs = premium ? 4 : 2, crystals = premium ? 2 : 1
      if (state.inventory.herb < herbs || state.inventory.crystal < crystals) return fail(`还缺供货材料：灵草 ×${herbs}、魔晶 ×${crystals}。失败不扣材料。`)
      next.inventory.herb -= herbs; next.inventory.crystal -= crystals
      const gold = event.kind === 'trade' ? p.quote : premium ? 135 : 70
      next.gold += gold
      if (event.kind === 'competition' && premium) next.inventory.elixir++
      p.stage = event.stages.length - 1
      message = `供货完成 · 收到 ${gold} 金币${premium ? '与修炼丹 ×1' : ''}。`
    } else return fail('这次操作不符合当前剧情目标。')
  }
  return { state: next, ok: true, message }
}
