import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { firstTechniqueBed, firstTechniqueBlock, firstTechniqueNear, submitFirstTechnique } from '../core/first-technique'
import { firstTechniqueScenes } from '../content/first-technique'
import { ironPlaces } from '../core/early-iron'
import { marketTradeLedger } from '../core/early-market-trade'
import { firstTechniqueSaveSummary } from '../core/save-preview'
import TeacherRoom from './TeacherRoom'

export default function FirstTechnique({ state, onBack }: { state: GameState; onBack: () => void }) {
  const t = state.earlyTraining, task = t.firstTechnique
  return <TeacherRoom title="房中 / 同一铁片研究与感知" heading="取回铁片，亲自感知其中方法。"
    help="本人实际走到床边取枕后铁片；研究回顾与现在动作分开。两掌夹片闭眼时保持姿势，旁观老师不移动本人。刷新保留断点。"
    mapLabel="铁片研究房中地图" prefix="铁片研究" stage={task.stage} total={9} summary={firstTechniqueSaveSummary(state, state.settings)}
    scene={firstTechniqueScenes[task.stage]} blocked={firstTechniqueBlock(state)}
    start={task.stage ? firstTechniqueBed : ironPlaces.table} movable={task.eyes !== 'closed'}
    near={firstTechniqueNear}
    draw={yan => <>
      <g aria-label="床边枕后铁片取出位置"><rect x="115" y="345" width="55" height="15" fill="#937954" /><rect x="117" y="341" width="15" height="8" fill="#eed7ad" /><text x="140" y="332" textAnchor="middle" fill="#eed7ad" fontSize="10">床边 · 枕后</text></g>
      <rect aria-label={`同一铁片：${task.iron === 'hands' ? '本人持有' : '枕后保存'}`} x={task.iron === 'hands' ? yan.x - 6 : 122} y={task.iron === 'hands' ? 340 : 339}
        width="12" height="8" fill="#222" stroke={task.clean ? '#dac6a1' : '#9f886b'} />
      {task.eyes === 'closed' && <text x={yan.x} y="407" textAnchor="middle" fill="#eed7ad" fontSize="10">夹片 · 闭眼感知</text>}
      {task.claw && <text x={yan.x} y="407" textAnchor="middle" fill="#eed7ad" fontSize="10">右手成爪 · 尚未试瓶</text>}
    </>}
    errors={[{ operation: 'duplicate', label: '研究就再发一片铁片' }, { operation: 'learn', label: '感知就授新技能' }, { operation: 'absorb-person', label: '成爪就签吸人成功' }]}
    onAction={(yan, actor, operation) => submitFirstTechnique(gameStore, yan, { ...task, expectedLedger: marketTradeLedger(state),
      expectedTraining: { ...t.firstTraining }, expectedIron: { ...t.iron }, expectedPractice: { ...t.practice }, expectedRecovery: { ...t.recovery },
      teacherPosition: { ...ironPlaces.teacher }, actor, operation })}
    onBack={onBack} finished="本人取片、观察、研究回顾与感知成爪已归档。有限瓷瓶试招和真实出门继续接续，旧技能与后期两瓶记录保持。"
    back="暂离铁片研究" />
}
