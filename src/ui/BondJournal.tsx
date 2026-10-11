import { bondJournal, bondVisitQueue } from '../core/bonds'
import type { GameState } from '../core/model'
import { useState } from 'react'
import { preparationEvents } from '../content/preparations'
import { eventBlockReason, eventDone, eventHint, eventProgress } from '../core/events'
import { canEnter, isVisible } from '../core/rules'

export default function BondJournal({ state, visit }: { state: GameState; visit: (chapter: number) => void }) {
  const lines = bondJournal(state)
  const queue = bondVisitQueue(state)
  const [selected, setSelected] = useState('little-doctor')
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all')
  const active = lines.find(line => line.id === selected) ?? lines[0]
  const entries = active?.entries.filter(entry => filter === 'all' || (filter === 'done' ? entry.done : !entry.done)) ?? []
  const completed = lines.reduce((total, line) => total + line.completed, 0)
  const total = lines.reduce((total, line) => total + line.entries.length, 0)
  return <>
    <span className="eyebrow">伙伴手札 / 可选回访</span><h2>记下同行，留有归途。</h2>
    <p className="muted">支线可在主线通关后回访补做。到人物处接取、读取路标、选择回应，返回确认才领取一次补给。卷页之间需要前页完成，旧通关不自动补齐。</p>
    {!!lines.length && <section className="bond-summary" aria-label="回访安排">
      <p>可见记录 {completed} / {total} · 当前可做 {queue.length} 页</p>
      {queue[0] ? <>
        <p>{queue[0].title} · {queue[0].statusLabel}<br /><span className="muted">下一处：{queue[0].destination}。{queue[0].hint}</span></p>
        <button className="primary small" onClick={() => visit(queue[0].chapter)}>继续第{queue[0].chapter}章 · {queue[0].name}</button>
      </> : <p className="muted">{completed === total ? '当前可见卷页均已完成，可在下方重读。' : '当前没有可直接推进的卷页。先完成主线或补齐前页，再回来安排回访。'}</p>}
    </section>}
    {!lines.length && <p className="quest-hint">当前剧透范围内尚无伙伴卷页。</p>}
    <div className="panel-tabs" aria-label="选择伙伴">{lines.map(line =>
      <button className="secondary" key={line.id} aria-pressed={active?.id === line.id} onClick={() => setSelected(line.id)}>{line.name} · {line.completed}/{line.entries.length}</button>)}</div>
    {(active ? [active] : []).map(line => <section className="bond-line" key={line.id}>
      <h3>{line.name} · {line.title}<small>{line.completed} / {line.entries.length} 可见卷页</small></h3>
      <div className="panel-tabs bond-filters" aria-label="筛选卷页">
        {([['all', '全部'], ['todo', '未完成'], ['done', '已完成']] as const).map(([value, label]) =>
          <button className="secondary" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
      </div>
      {!entries.length && <p className="muted">此伙伴没有符合筛选的可见卷页。</p>}
      {entries.map(entry => <article className="bond-entry" key={entry.eventId}>
        <b>第{String(entry.chapter).padStart(2, '0')}章 · {entry.title}<span>{entry.statusLabel} · {entry.stage} / {entry.total}</span></b>
        <p>{entry.hint}</p>
        {['available', 'reading', 'report'].includes(entry.status) && <p className="muted">下一处：{entry.destination}</p>}
        {entry.choice && <p className="muted">已记回应：{entry.choice}。{entry.response}</p>}
        <div className="bond-actions">
          <button className="secondary" disabled={!entry.canVisit} onClick={() => visit(entry.chapter)}>回访第{entry.chapter}章</button>
          {!entry.done && entry.prerequisite && <button className="secondary" disabled={!entry.prerequisite.canVisit}
            onClick={() => visit(entry.prerequisite!.chapter)}>先补第{entry.prerequisite.chapter}章 · {entry.prerequisite.title}</button>}
        </div>
      </article>)}
    </section>)}
    {active?.id === 'little-doctor' && preparationEvents.filter(item => isVisible(state, item.chapter)).map(({ chapter, event }) => {
      const blocked = eventBlockReason(state, chapter, event), p = eventProgress(state, chapter, event.id)
      const done = eventDone(state, chapter, event.id)
      return <section className="bond-line" key={event.id} aria-label="小医仙专属历练">
        <h3>专属历练 · {event.title}</h3>
        <p>第{chapter}章 · {done ? '已归档' : !p.started ? '尚未接取' : event.stages[p.stage]}</p>
        <p className="muted">{done ? '准备演练已归档，可回访阅读；补给不会重复发放。' : blocked ||
          (state.chapter === chapter ? eventHint(state, event.id) : p.started
            ? `回访第${chapter}章继续：${event.stages[p.stage]}。已完成节点保留。`
            : '回到本章札记处接取，已完成节点可保存恢复。')}</p>
        <p className="muted">寻找练习凭证、选择方案、控制演练风险。此项不计入24页书简，不表示完整毒体控制已实现。</p>
        <button className="secondary" disabled={!canEnter(state, chapter)} onClick={() => visit(chapter)}>前往第{chapter}章准备演练</button>
      </section>
    })}
    <p className="muted">对白与书简是原创改编；卷页标题与记录按当前剧透范围显示。</p>
  </>
}
