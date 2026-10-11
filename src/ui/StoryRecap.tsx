import { useState } from 'react'
import type { GameState } from '../core/model'
import { chapterRecaps } from '../core/story-recap'

export default function StoryRecap({ state }: { state: GameState }) {
  const [selected, setSelected] = useState(state.chapter)
  const recaps = chapterRecaps(state)
  const current = recaps.find(chapter => chapter.id === selected) ?? recaps[0]
  return <>
    <span className="eyebrow">篇章回顾 / 旅途对白</span>
    <h2>重读一路走来的故事。</h2>
    <p className="muted">查看已读开场与首通后的收尾。这里展示当前版本的游戏对白；修订后可重新阅读。</p>
    {!current ? <p className="muted">还没有可回顾的篇章。读完第一章开场后，再来翻阅。</p> : <>
      <label className="setting-row"><span>选择回顾篇章</span>
        <select aria-label="选择回顾篇章" value={current.id} onChange={event => setSelected(Number(event.target.value))}>
          {recaps.map(chapter => <option key={chapter.id} value={chapter.id}>第{chapter.id}章 · {chapter.title}</option>)}
        </select>
      </label>
      <p className="muted">{current.location} · {current.completed ? '已首通' : '历练中'}</p>
      <section className="recap-section" aria-label="开场对白">
        <h3>开场</h3>
        {current.opening.map((line, index) => <article className="recap-line" key={index}>
          <b>{line.speaker}</b><p>{line.text}</p>
        </article>)}
      </section>
      <section className="recap-section" aria-label="收尾对白">
        <h3>收尾</h3>
        {current.completed ? current.closing.map((line, index) => <article className="recap-line" key={index}>
          <b>{line.speaker}</b><p>{line.text}</p>
        </article>) : <p className="muted">完成本章首通结算后，才能回顾收尾对白。</p>}
      </section>
      <p className="muted">{current.note}</p>
    </>}
    <p className="muted">阅读回顾不改变历练进度，也不领取奖励。篇章按已读进度及当前剧透范围显示。</p>
  </>
}
