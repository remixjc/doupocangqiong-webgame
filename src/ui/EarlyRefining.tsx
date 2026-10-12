import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { earlyRefiningBlock, refiningNear, refiningStart, submitEarlyRefining, type RefiningAction } from '../core/early-refining'
import { ironPlaces } from '../core/early-iron'
import { marketTradeLedger } from '../core/early-market-trade'
import { refiningScenes } from '../content/early-refining'
import { earlyRefiningSaveSummary } from '../core/save-preview'
import TeacherRoom from './TeacherRoom'
export default function EarlyRefining({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.refining
  return <TeacherRoom title="房中 / 清水与主辅药" heading="先备清水，再看白焰中的药性。"
    help="本人走到盛水处备水；老师的处理需明确选择旁观。逐步保存，刷新重新选人物。旧档只补当时过程，已耗材料和已完成药液保持。"
    mapLabel="清水与主辅药地图" prefix="主辅药调制" stage={task.stage} total={11} summary={earlyRefiningSaveSummary(state, state.settings)}
    scene={refiningScenes[task.stage]} blocked={earlyRefiningBlock(state)} start={refiningStart(task.stage)} near={yan => refiningNear(yan, task.stage)}
    draw={() => <>
      <path aria-label={task.water ? '当时已备清水，尚未入药' : '盛水处，尚未备水'} d="M88 350 Q100 375 112 350 Z" fill={task.water ? '#6ba4bb' : '#937954'} />
      <text x="100" y="340" textAnchor="middle" fill="#eed7ad" fontSize="10">清水</text>
      <circle aria-label={`当时魔核在${task.core === 'teacher' ? '老师手中' : '桌面'}`} cx={task.core === 'teacher' ? 210 : 260} cy="344" r="4" fill="#75bd7e" />
      {task.flame && <path aria-label="老师掌中白焰，尚未熄灭" d="M230 348 Q222 340 230 327 Q238 340 230 348" fill="#fff4dc" />}
    </>}
    errors={task.stage === 0 || task.stage === 8 ? [{ operation: 'restore', label: '回补历史就重新领取耗材' }]
      : task.stage === 4 ? [{ operation: 'drink', label: '将尚未完成的药液直接口服' }]
        : task.stage === 9 ? [{ operation: 'finish', label: '主辅药融合就算药液完成' }] : []}
    onAction={(yan, actor, operation) => submitEarlyRefining(gameStore, yan, { ...task, expectedLedger: marketTradeLedger(state),
      expectedIron: { ...state.earlyTraining.iron }, teacherPosition: { ...ironPlaces.teacher }, actor, operation: operation as RefiningAction['operation'] })}
    onBack={onBack} finished="当时清水已备、主辅药已融合；魔核处理、白焰熄灭和入水尚待接续。原已耗药液与修炼结果保持。" back="暂离主辅药调制" />
}
