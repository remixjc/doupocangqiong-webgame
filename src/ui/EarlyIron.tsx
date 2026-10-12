import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { earlyIronBlock, ironNear, ironPlaces, ironStart, submitEarlyIron, type IronAction } from '../core/early-iron'
import { marketTradeLedger } from '../core/early-market-trade'
import { ironScenes } from '../content/early-iron'
import { earlyIronSaveSummary } from '../core/save-preview'
import TeacherRoom from './TeacherRoom'
export default function EarlyIron({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.iron
  return <TeacherRoom title="房中 / 铁片辨认与限制" heading="先辨明来历，再认识自己的限度。"
    help="选择本人可用方向/WASD行走，近老师交接、近桌拾回。老师步骤需明确选择旁观老师；旁观不移动本人。刷新保留历史并重新选择人物，名称与意愿不授技能。"
    mapLabel="房中铁片交接地图" prefix="铁片辨认" stage={task.stage} total={18} summary={earlyIronSaveSummary(state, state.settings)}
    scene={ironScenes[task.stage]} blocked={earlyIronBlock(state)} start={ironStart(task.stage)} near={yan => ironNear(yan, task.stage)}
    draw={yan => task.owner !== 'bag' && <rect aria-label={`铁片历史持有：${task.owner}`}
      x={(task.owner === 'yan' ? yan.x : task.owner === 'teacher' ? 220 : 260) - 5} y={task.owner === 'table' ? 350 : 340} width="12" height="8" fill="#222" stroke="#c2a679" />}
    errors={task.stage === 8 || task.stage === 13 ? [{ operation: 'learn', label: '知道名称或想研究就学会斗技' }]
      : task.stage === 12 ? [{ operation: 'duplicate', label: '拾回就再发一片并补材料' }]
        : task.stage === 16 ? [{ operation: 'refine', label: '收好铁片就完成药液炼化' }] : []}
    onAction={(yan, actor, operation) => submitEarlyIron(gameStore, yan, { ...task, expectedLedger: marketTradeLedger(state),
      expectedReturn: { ...state.earlyTraining.marketReturn }, actor, teacherPosition: { ...ironPlaces.teacher }, operation: operation as IronAction['operation'] })}
    onBack={onBack} finished="原黑铁片已收好；名称、原理、反制风险与当时能力限制已分存，详细调制待续。" back="暂离铁片辨认" />
}
