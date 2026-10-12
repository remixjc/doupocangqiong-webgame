import { useEffect, useState } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { firstTrainingBlock, firstTrainingNear, submitFirstTraining } from '../core/first-training'
import { firstTrainingScenes } from '../content/first-training'
import { ironPlaces } from '../core/early-iron'
import { refiningWater } from '../core/early-refining'
import { marketTradeLedger } from '../core/early-market-trade'
import { firstTrainingSaveSummary } from '../core/save-preview'
import TeacherRoom from './TeacherRoom'
export default function FirstTraining({ state, onBack }: { state: GameState; onBack: () => void }) {
  const t = state.earlyTraining, task = t.firstTraining
  const [marker, setMarker] = useState(.5)
  useEffect(() => { setMarker(.5) }, [task.stage, task.beats, task.attempts])
  return <TeacherRoom title="房中 / 当前一轮持续调息" heading="坐定、调息，再收束这一轮。"
    help="方向键或按钮实际走到容器正前。坐定期间保持姿势；调息使用手动标记，失误免费重试。刷新保留断点，老师旁观与本人操作分开。"
    mapLabel="持续调息房中地图" prefix="持续调息" stage={task.stage} total={10}
    summary={firstTrainingSaveSummary(state, state.settings)} scene={firstTrainingScenes[task.stage]} blocked={firstTrainingBlock(state)}
    start={task.stage >= 1 && task.stage <= 7 ? refiningWater : ironPlaces.table} movable={!task.seated}
    near={yan => firstTrainingNear(yan, task.stage)}
    draw={() => <>
      <rect x="94" y="365" width="44" height="28" rx="9" fill="#6b835f" aria-label="衣着剪影与容器遮挡" />
      <text x="115" y="320" textAnchor="middle" fill="#eed7ad" fontSize="10">{task.seated ? '保持坐定' : '修炼容器'}</text>
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
    onBack={onBack} finished="当前一轮已归档。两个月五段只记录预计；半月回顾与当时四段待接续。旧技能、药液及后期境界保持。"
    back="暂离持续调息" />
}
