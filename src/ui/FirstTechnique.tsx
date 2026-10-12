import { HallText } from './MapPrimitives'
import { useEffect, useState } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { firstTechniqueBed, firstTechniqueBlock, firstTechniqueNear, submitFirstTechnique } from '../core/first-technique'
import { firstTechniqueScenes } from '../content/first-technique'
import { firstBottleScenes } from '../content/first-bottle'
import { ironPlaces } from '../core/early-iron'
import { earlySnapshots } from '../core/early-snapshots'
import { firstTechniqueSaveSummary } from '../core/save-preview'
import TeacherRoom from './TeacherRoom'

export default function FirstTechnique({ state, onBack, continuation = false }: { state: GameState; onBack: () => void; continuation?: boolean }) {
  const t = state.earlyTraining, task = t.firstTechnique
  const [marker, setMarker] = useState(.5)
  useEffect(() => { setMarker(.5) }, [task.stage, task.beats, task.attempts])
  const prefix = continuation ? '有限试瓶' : '铁片研究'
  return <TeacherRoom title={continuation ? '房中 / 有限瓷瓶试招' : '房中 / 同一铁片研究与感知'} heading={continuation ? '以当时有限功力，面对桌上的瓷瓶。' : '取回铁片，亲自感知其中方法。'}
    help={continuation ? '本人留在床边，面对桌上真实瓷瓶，以当时有限功力试招。两次手动标记为游戏机制，失误免费复位。起身与出门由后段完成。' : '本人实际走到床边取枕后铁片；研究回顾与现在动作分开。两掌夹片闭眼时保持姿势，旁观老师不移动本人。刷新保留断点。'}
    mapLabel={`${prefix}房中地图`} prefix={prefix} stage={continuation ? Math.max(0, task.stage - 9) : Math.min(9, task.stage)} total={continuation ? 10 : 9} summary={firstTechniqueSaveSummary(state, state.settings)}
    scene={continuation ? firstBottleScenes[task.stage - 9] : firstTechniqueScenes[task.stage]}
    blocked={firstTechniqueBlock(state) || (continuation && task.stage < 9 ? '先完成铁片研究与感知归档。' : '')}
    start={task.stage ? firstTechniqueBed : ironPlaces.table} movable={task.eyes !== 'closed' && !(task.stage >= 9 && task.stage < 19)}
    near={firstTechniqueNear}
    draw={yan => <>
      <g aria-label="床边枕后铁片取出位置"><rect x="115" y="345" width="55" height="15" fill="#937954" /><rect x="117" y="341" width="15" height="8" fill="#eed7ad" /><HallText x="140" y="332">床边 · 枕后</HallText></g>
      <rect aria-label={`同一铁片：${task.iron === 'hands' ? '本人持有' : '枕后保存'}`} x={task.iron === 'hands' ? yan.x - 6 : 122} y={task.iron === 'hands' ? 340 : 339}
        width="12" height="8" fill="#222" stroke={task.clean ? '#dac6a1' : '#9f886b'} />
      {task.eyes === 'closed' && <HallText x={yan.x} y="407">夹片 · 闭眼感知</HallText>}
      {task.claw && <HallText x={yan.x} y="407">右手成爪{task.stage <= 9 ? ' · 尚未试瓶' : ''}</HallText>}
      {continuation && <g aria-label={`当时瓷瓶：${({ unobserved: '尚未面对', intact: '完整', turning: '转动', fallen: '从桌上落下', fragments: '地面碎片' })[task.bottle]}`}>
        {task.bottle === 'fragments' ? <path d="M256 393 l7 -2 l-4 4 M271 394 l4 -2 l-2 4" stroke="#eadbbb" fill="none" />
          : <path d="M264 335 h8 v4 l3 4 v10 h-14 v-10 l3 -4 Z" fill="#eadbbb" transform={task.bottle === 'turning' ? 'rotate(24 268 349)' : task.bottle === 'fallen' ? 'translate(0 30) rotate(70 268 349)' : undefined} />}
      </g>}
    </>}
    controls={continuation && task.stage === 11 ? <label>有限吸力标记 {Math.round(marker * 100)}% · {task.beats}/2 · 重试{task.attempts}
      <input aria-label="有限吸力标记" type="range" min="0" max="1" step=".05" value={marker} onChange={e => setMarker(Number(e.target.value))} /></label> : undefined}
    errors={[{ operation: 'duplicate', label: '研究就再发一片铁片' }, { operation: 'learn', label: '感知就授新技能' }, { operation: 'absorb-person', label: '成爪就签吸人成功' }]}
    onAction={(yan, actor, operation) => submitFirstTechnique(gameStore, yan, { ...task, ...earlySnapshots(state, ['Ledger', 'Training', 'Iron', 'Practice', 'Recovery']), teacherPosition: { ...ironPlaces.teacher }, actor, operation, marker: task.stage === 11 ? marker : undefined })}
    onBack={onBack} finished={continuation ? '有限瓷瓶试招已归档，碎片没有发战利品，七段仅为条件。实际起身与出门待接续，旧技能和后期两瓶保持。' : '本人取片、观察、研究回顾与感知成爪已归档。有限瓷瓶试招由独立入口接续，旧技能与后期两瓶记录保持。'}
    back={`暂离${prefix}`} />
}
