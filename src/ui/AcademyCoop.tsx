import type { GameState } from '../core/model'
import { advanceAcademyCoop, coopAvailable, type CoopCommand } from '../core/academy-coop'
import { gameStore } from '../core/store'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { Eyebrow, MutedParagraph } from './NativeRegions'

const roles = ['巡护', '采办', '复核']
const members = ['巡路学员', '采办学员', '研习学员']
const contracts = ['护送路线', '补给核账', '合练安排']
const scenes = ['旧封路标记未撤，队伍尚未通行。', '实物与交接单数量不符，尚未签收。', '合练时段重叠，队员尚未入场。']
const responses = ['勘路标出安全路线', '核实单据再签收', '复核时段分开安排']

export default function AcademyCoop({ state }: { state: GameState }) {
  if (!coopAvailable(state)) return <MutedParagraph>当前范围尚无可用的协作演练。</MutedParagraph>
  const p = state.academyCoop
  function act(action: CoopCommand) {
    const current = gameStore.getSnapshot().state
    const result = advanceAcademyCoop(current, { ...action, revision: p?.revision ?? 0 })
    if (result.ok) gameStore.update(s => { s.academyCoop = result.coop! })
    gameStore.notify(result.message)
  }
  const need = p ? (p.completed % 3 + p.step) % 3 : 0
  return <section aria-label="内院协作演练">
    <Eyebrow>内院协作 / 原创经营演练</Eyebrow><h2>分工同行</h2>
    <MutedParagraph>学员与委托均原创，与建门记录独立。演练物资、协作章与主线资源独立。</MutedParagraph>
    {!p ? <><p>初始6物资，出发耗2，三步后登记。前3单各3章，共9枚荣誉；之后仍可练习。</p><PrimaryButton onClick={() => act({ type: 'begin' })}>建立协作账本</PrimaryButton></> : <>
      <div className="stat-grid" aria-label="协作账本">{[['物资', `${p.supplies}/6`], ['协作章', `${p.merit}/9`], ['已登记委托', p.completed]].map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div>
      <p>第{p.completed + 1}单 · {contracts[p.completed % 3]} · {p.phase === 'plan' ? '拟定分工' : p.phase === 'review' ? '等待登记' : p.phase === 'failed' ? '整队待续' : `现场 ${p.step + 1}/3`}</p>
      {p.phase === 'plan' && <>
        <MutedParagraph>每职各一人；同名特长零耗，跨职每步耗1物资。</MutedParagraph>
        <div className="guide-grid">{members.map((member, i) => <label key={member}>{member} · 擅长{roles[i]}<select aria-label={`${member}职责`} value={p.assignments[i]} onChange={e => act({ type: 'assign', member: i, role: Number(e.target.value) })}>{[...roles, '未分工'].map((role, j) => <option key={role} value={j}>{role}</option>)}</select></label>)}</div>
        <div className="panel-tabs"><PrimaryButton disabled={p.supplies < 3 || p.assignments.includes(3) || new Set(p.assignments).size !== 3} onClick={() => act({ type: 'dispatch' })}>出发 · 消耗2物资</PrimaryButton><SecondaryButton disabled={p.supplies === 6} onClick={() => act({ type: 'rest' })}>免费整理补给</SecondaryButton></div>
        {p.supplies < 3 && <MutedParagraph>需留1份现场物资，请先整理。</MutedParagraph>}
      </>}
      {p.phase === 'field' && <>
        <p role="status">{scenes[need]}</p><MutedParagraph>误选扣2物资、不推进，耗尽可免费整队。失误{p.mistakes}次。</MutedParagraph>
        <div className="panel-tabs">{responses.map((response, i) => <SecondaryButton key={response} onClick={() => act({ type: 'respond', option: i })}>{response}</SecondaryButton>)}</div>
      </>}
      {p.phase === 'failed' && <><p role="status">物资耗尽，未登记；旧章保留。</p><PrimaryButton onClick={() => act({ type: 'retry' })}>免费整队 · 回到本单分工</PrimaryButton></>}
      {p.phase === 'review' && <><p>三节点完成，登记后接续下一单。</p><PrimaryButton onClick={() => act({ type: 'report' })}>登记本单 · 协作章+{p.completed < 3 ? 3 : 0}</PrimaryButton></>}
      <MutedParagraph>{p.merit === 9 ? '已满9章，后续零奖励。' : '自动保存；前3单各3章。'}</MutedParagraph>
    </>}
  </section>
}
