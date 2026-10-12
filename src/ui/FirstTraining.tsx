import { useEffect, useState } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { firstTrainingBlock, firstTrainingNear, submitFirstTraining } from '../core/first-training'
import { firstTrainingScenes } from '../content/first-training'
import { firstReviewScenes } from '../content/first-review'
import { ironPlaces } from '../core/early-iron'
import { refiningWater } from '../core/early-refining'
import { marketTradeLedger } from '../core/early-market-trade'
import { firstTrainingSaveSummary } from '../core/save-preview'
import TeacherRoom from './TeacherRoom'
export default function FirstTraining({ state, onBack, continuation = false }: { state: GameState; onBack: () => void; continuation?: boolean }) {
  const t = state.earlyTraining, task = t.firstTraining
  const [marker, setMarker] = useState(.5)
  useEffect(() => { setMarker(.5) }, [task.stage, task.beats, task.attempts])
  const prefix = continuation ? '半月回顾' : '持续调息'
  return <TeacherRoom title={continuation ? '房中 / 半月回顾与当时四段' : '房中 / 当前一轮持续调息'}
    heading={continuation ? '分别回顾时段、成果与药色。' : '坐定、调息，再收束这一轮。'}
    help="方向键或按钮实际走到容器正前。坐定期间保持姿势；调息使用手动标记，失误免费重试。刷新保留断点，老师旁观与本人操作分开。"
    mapLabel={`${prefix}房中地图`} prefix={prefix} stage={continuation ? Math.max(0, task.stage - 10) : Math.min(10, task.stage)} total={continuation ? 7 : 10}
    summary={firstTrainingSaveSummary(state, state.settings)} scene={continuation ? firstReviewScenes[task.stage - 10] : firstTrainingScenes[task.stage]}
    blocked={firstTrainingBlock(state) || (continuation && task.stage < 10 ? '先完成当前一轮归档。' : '')}
    start={continuation ? ironPlaces.table : task.stage >= 1 && task.stage <= 7 ? refiningWater : ironPlaces.table} movable={!task.seated}
    near={yan => firstTrainingNear(yan, task.stage)}
    draw={() => <>
      <rect x="94" y="365" width="44" height="28" rx="9" fill="#6b835f" aria-label="衣着剪影与容器遮挡" />
      <text x="115" y="320" textAnchor="middle" fill="#eed7ad" fontSize="10">{task.seated ? '保持坐定' : '修炼容器'}</text>
      {continuation && task.stage === 13 && <text x="160" y="342" fill="#eed7ad" fontSize="10">回望处</text>}
      {continuation && task.pale && <text x="115" y="356" fontSize="10" fill="#eed7ad">当时绿意变淡</text>}
      {continuation && task.dressed && <text x="260" y="405" fontSize="10" fill="#eed7ad">衣着已整理</text>}
      <rect x="95" y="293" width="220" height="22" fill="#e8d2a7" opacity={task.light === 'warm' ? .22 : .07} aria-label={task.light === 'warm' ? '当时暖日' : '当时日光渐弱'} />
    </>}
    controls={task.stage === 2 ? <label>呼吸标记 {Math.round(marker * 100)}% · 已稳定 {task.beats}/3
      <input type="range" aria-label="持续调息呼吸标记" min="0" max="1" step=".05" value={marker} onChange={e => setMarker(Number(e.target.value))} />
    </label> : undefined}
    errors={[{ operation: 'wait', label: '现实等待自动完成' }, { operation: 'restore', label: '回补就重新领取药液' },
      { operation: 'fifth', label: '预计就签实际五段' }]}
    onAction={(yan, actor, operation) => submitFirstTraining(gameStore, yan, { ...task, expectedLedger: marketTradeLedger(state),
      expectedRefining: { ...t.refining }, expectedPractice: { ...t.practice }, expectedRecovery: { ...t.recovery },
      teacherPosition: { ...ironPlaces.teacher }, actor, operation, marker: task.stage === 2 ? marker : undefined })}
    onBack={onBack} finished={continuation ? '半月回顾已归档，当时四段与五段预测分开。铁片试招和出门待接续，旧药液及后期境界保持。'
      : '当前一轮已归档。两个月五段只记录预计；半月回顾由独立入口接续。旧技能、药液及后期境界保持。'}
    back={`暂离${prefix}`} />
}
