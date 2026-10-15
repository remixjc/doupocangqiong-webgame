import type { GameState } from '../core/model'
import { advancePanmen, panmenAvailable, type PanmenCommand } from '../core/panmen'
import { gameStore } from '../core/store'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { Eyebrow, MutedParagraph } from './NativeRegions'

const places = ['院门', '新生会面处', '薰儿与琥嘉处', '院中议事处']
const members = ['萧炎', '薰儿', '琥嘉']
const duties = ['带头', '管理', '未安排']
const scenes = [
  ['新生的请求', '新生担心与老生的冲突延续，希望大家共同应对，而非各自孤立。', '到新生会面处，回应他们的请求。'],
  ['共同商议', '薰儿赞成建立自保的组织，并提议由她和琥嘉承担管理。', '到薰儿与琥嘉处听取提议。'],
  ['整理职责', '萧炎带头，薰儿与琥嘉负责管理。两人可以承担同一类职责。', '到院中议事处，核对三人的分工。'],
  ['为组织定名', '萧炎希望这支新生势力能够坚实地立足内院。', '留在议事处，选择名称。'],
  ['共同确认', '名称与分工已经议定；新生们将以共同的组织互助。', '回到新生会面处，完成筹议。'],
  ['磐门已立', '萧炎带头，薰儿与琥嘉管理。新生们有了共同的组织。', '筹议已归档，可继续独立的协作经营演练。'],
]

export default function PanmenFounding({ state, exercise }: { state: GameState; exercise: () => void }) {
  if (!panmenAvailable(state)) return <MutedParagraph>当前范围尚无可用的筹议。</MutedParagraph>
  const p = state.panmenFounding
  function act(command: PanmenCommand) {
    const current = gameStore.getSnapshot().state
    const result = advancePanmen(current, { ...command, revision: p?.revision ?? 0 })
    if (result.ok) gameStore.update(s => { s.panmenFounding = result.founding! })
    gameStore.notify(result.message)
  }
  const expected = p ? [1, 2, 3, 3, 1, 1][p.stage] : 0
  return <section aria-label="磐门筹议">
    <Eyebrow>内院 / 新生院落</Eyebrow><h2>聚沙成磐</h2>
    <MutedParagraph>以年番第15话所见建门片段改编；院落移动、分工核对为原创玩法。记录独立保存，不发放主线资源。</MutedParagraph>
    {!p ? <><p>听取新生请求，与同伴商议，核对职责，再共同定名。</p>
      <PrimaryButton onClick={() => act({ type: 'begin' })}>进入院落筹议</PrimaryButton></> : <>
      <p role="status">筹议 {p.stage}/5 · {scenes[p.stage][0]} · 所在：{places[p.place]}</p>
      <nav className="guide-grid" aria-label="院落位置">{places.map((place, i) =>
        <SecondaryButton key={place} aria-pressed={p.place === i} disabled={p.stage === 5 || p.place === i}
          onClick={() => act({ type: 'walk', place: i })}>{place}{p.place === i ? ' · 当前' : ''}</SecondaryButton>)}</nav>
      <h3>{scenes[p.stage][0]}</h3><p>{scenes[p.stage][1]}</p>
      <MutedParagraph>{scenes[p.stage][2]}</MutedParagraph>
      {p.place === expected && <>
        {p.stage === 0 && <div className="panel-tabs">{['回应互助自保的请求', '独自行动，不需组织', '宣布已获免费塔修'].map((text, option) =>
          <SecondaryButton key={text} onClick={() => act({ type: 'answer', option })}>{text}</SecondaryButton>)}</div>}
        {p.stage === 1 && <PrimaryButton onClick={() => act({ type: 'confirm' })}>听取管理提议</PrimaryButton>}
        {p.stage === 2 && <><div className="guide-grid">{members.map((member, i) => <label key={member}>{member}
          <select aria-label={`${member}筹议职责`} value={p.duties[i]} onChange={e => act({ type: 'assign', member: i, duty: Number(e.target.value) })}>
            {duties.map((duty, j) => <option key={duty} value={j}>{duty}</option>)}</select></label>)}</div>
          <PrimaryButton onClick={() => act({ type: 'confirm' })}>核对分工</PrimaryButton></>}
        {p.stage === 3 && <div className="panel-tabs">{['独行会', '磐门', '塔主府'].map((text, option) =>
          <SecondaryButton key={text} onClick={() => act({ type: 'answer', option })}>{text}</SecondaryButton>)}</div>}
        {p.stage === 4 && <PrimaryButton onClick={() => act({ type: 'confirm' })}>与新生共同确认</PrimaryButton>}
      </>}
      {p.stage === 5 && <><p>职责：萧炎 · 带头；薰儿、琥嘉 · 管理。</p>
        <PrimaryButton onClick={exercise}>继续协作经营演练</PrimaryButton>
        <MutedParagraph>后续学员、物资和委托为独立原创演练，既有账本与已结算协作章保留。</MutedParagraph></>}
    </>}
  </section>
}
