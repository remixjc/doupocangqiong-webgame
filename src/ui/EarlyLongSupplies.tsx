import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { earlyLongSuppliesBlock, submitEarlyLongSupplies, type LongSupplyStation, type LongSupplyItem } from '../core/early-long-supplies'
import { longSupplyScenes } from '../content/early-long-supplies'
import { gameStore } from '../core/store'
import './early-walk.css'

const stations = { receipt: '批次标签台', herbs: '药材格', cores: '魔核格', cabinet: '房柜' } as const
const places = { none: '未展开', parcel: '标签台原包', shelf: '分拣格', cabinet: '房柜' } as const
export default function EarlyLongSupplies({ state, position, onBack, onForest }: { state: GameState; position: EarlyWalkPosition; onBack: () => void; onForest?: () => void }) {
  const task = state.earlyTraining.longSupplies, scene = longSupplyScenes[task.stage]
  const [station, setStation] = useState<LongSupplyStation>('receipt')
  const [item, setItem] = useState<LongSupplyItem>()
  const heading = useRef<HTMLHeadingElement>(null), blocked = earlyLongSuppliesBlock(state, position)
  useEffect(() => { if (!blocked) heading.current?.focus() }, [blocked])
  useEffect(() => { setItem(undefined) }, [task.stage])
  if (blocked) return <p>{blocked}</p>
  const sorting = task.stage === 1 || task.stage === 2
  return <>
    <span className="eyebrow">房中物资 / 回溯父亲来访之前</span>
    <h2 ref={heading} tabIndex={-1}>收好这一批，继续后来的修炼。</h2>
    <p>回看首次寄售后已经买回的另批物资。在标签台核对、分拣药材与魔核，再藏入房柜。此页接入次序是手札回溯，故事时间在父亲来访之前。</p>
    <svg className="early-walk-map" viewBox="0 0 720 280" role="img" aria-label={`长期物资：药材包在${places[task.herbs]}，魔核包在${places[task.cores]}；同瓶仍由萧炎保管，自用药液耗尽。`}>
      <rect width="720" height="280" fill="#293a33" />
      <rect x="35" y="110" width="175" height="110" fill="#685d42" stroke="#b5a073" />
      <text x="123" y="82" textAnchor="middle" fill="#e8d1a6" fontSize="15">批次标签台</text>
      {[{ x: 272, title: '药材格' }, { x: 408, title: '魔核格' }].map(tray => <g key={tray.x}><rect x={tray.x} y="129" width="99" height="91" fill="#414c3b" stroke="#b5a073" /><text x={tray.x + 50} y="105" textAnchor="middle" fill="#e8d1a6" fontSize="15">{tray.title}</text></g>)}
      <rect x="552" y="64" width="138" height="156" fill="#685d42" stroke="#b5a073" />
      <text x="621" y="46" textAnchor="middle" fill="#e8d1a6" fontSize="15">房柜{task.stage === 6 ? ' · 已合上' : ''}</text>
      {task.stage < 6 && (['herbs', 'cores'] as const).map(id => task[id] !== 'none' && <g key={id} transform={`translate(${task[id] === 'cabinet' ? id === 'herbs' ? 591 : 651 : task[id] === 'shelf' ? id === 'herbs' ? 322 : 458 : id === 'herbs' ? 84 : 163} 174)`}>
        <path d="M-22 19 Q-30-5-7-17 H7 Q30-5 22 19Z" fill={id === 'herbs' ? '#aab57d' : '#96b7b8'} stroke="#d0c398" />
        <path d="M-9-15 H9" stroke="#d0c398" strokeWidth="4" />
        <text y="39" textAnchor="middle" fill="#e8d1a6" fontSize="12">{id === 'herbs' ? '药材包' : '魔核包'}</text>
      </g>)}
      {task.stage === 6 && <path d="M621 67 V217 M617 151 H625" stroke="#b5a073" strokeWidth="3" />}
      <text x="360" y="262" textAnchor="middle" fill="#e8d1a6" fontSize="13">另购批次 · 八个月用量是故事概述 · 分拣位置为原创布局</text>
    </svg>
    <div className="early-walk-controls" aria-label="长期物资位置">
      {(Object.keys(stations) as LongSupplyStation[]).map(id => <SecondaryButton key={id} aria-pressed={station === id} onClick={() => setStation(id)}>查看{stations[id]}</SecondaryButton>)}
    </div>
    <p role="status">物资归档 {task.stage}/6 · 药材包{places[task.herbs]} · 魔核包{places[task.cores]}</p>
    {scene ? station === scene.station ? <section className="bond-summary" aria-label="物资归档步骤">
      <SceneHeading title={scene.title} text={scene.text} speaker={scene.speaker} />
      {sorting && <div className="early-walk-controls" aria-label="选择物资包">
        <SecondaryButton aria-pressed={item === 'herbs'} disabled={task.herbs !== 'parcel'} onClick={() => setItem('herbs')}>拿起药材包</SecondaryButton>
        <SecondaryButton aria-pressed={item === 'cores'} disabled={task.cores !== 'parcel'} onClick={() => setItem('cores')}>拿起魔核包</SecondaryButton>
      </div>}
      <PrimaryButton disabled={sorting && !item} onClick={() => submitEarlyLongSupplies(gameStore, position, station,
        { step: task.stage, herbs: task.herbs, cores: task.cores, operation: scene.operation, item: sorting ? item : undefined })}>{scene.action}</PrimaryButton>
    </section> : <p className="muted">下一步请到{stations[scene.station]}：{scene.title}。</p>
      : <section className="bond-summary"><h3>房柜已合上，另批物资已记下。</h3><p>两包原物都在柜中，没有散落副本。后山首次成功练技、后续补液与七段突破分别继续；这次归档不代签后续修炼结果。</p>
        {onForest && <PrimaryButton onClick={onForest}>接续后山森林 · 首次成功练技</PrimaryButton>}</section>}
    <p className="muted">包代表物资类别，不代表已核实的数量或容量。这里只归档原作已购批次，没有新增付款、配方或精确价单；寄售净款39200、家族交卡、原瓶和耗尽记录保留。</p>
    <SecondaryButton onClick={onBack}>暂离物资回溯 · 保留同批断点</SecondaryButton>
  </>
}
