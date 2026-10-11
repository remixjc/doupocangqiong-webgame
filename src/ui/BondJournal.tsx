import { bondJournal } from '../core/bonds'
import type { GameState } from '../core/model'

export default function BondJournal({ state, visit }: { state: GameState; visit: (chapter: number) => void }) {
  const lines = bondJournal(state)
  return <>
    <span className="eyebrow">伙伴手札 / 可选回访</span><h2>记下同行，留有归途。</h2>
    <p className="muted">支线可在主线通关后回访补做。到人物处接取、读取路标、选择回应，返回确认才领取一次补给。卷页之间需要前页完成，旧通关不自动补齐。</p>
    {!lines.length && <p className="quest-hint">当前剧透范围内尚无伙伴卷页。</p>}
    {lines.map(line => <section className="bond-line" key={line.id}>
      <h3>{line.name} · {line.title}<small>{line.completed} / {line.entries.length} 可见卷页</small></h3>
      {line.entries.map(entry => <article className="bond-entry" key={entry.eventId}>
        <b>第{String(entry.chapter).padStart(2, '0')}章 · {entry.title}<span>{entry.done ? '已完成 ✓' : `${entry.stage} / ${entry.total}`}</span></b>
        <p>{entry.hint}</p>
        {entry.choice && <p className="muted">已记回应：{entry.choice}。{entry.response}</p>}
        <button className="secondary" disabled={!entry.canVisit} onClick={() => visit(entry.chapter)}>回访第{entry.chapter}章</button>
      </article>)}
    </section>)}
    <p className="muted">对白与书简是原创改编；卷页标题与记录按当前剧透范围显示。</p>
  </>
}
