import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { earlyRefiningBlock, refiningNear, refiningStart, submitEarlyRefining, type RefiningAction } from '../core/early-refining'
import { ironPlaces } from '../core/early-iron'
import { marketTradeLedger } from '../core/early-market-trade'
import { refiningScenes } from '../content/early-refining'
import { earlyRefiningSaveSummary } from '../core/save-preview'
import { refiningAt } from '../core/early-refining-state'
import TeacherRoom from './TeacherRoom'
export default function EarlyRefining({ state, onBack, continuation = false }: { state: GameState; onBack: () => void; continuation?: boolean }) {
  const task = state.earlyTraining.refining
  const shown = continuation ? task : refiningAt(Math.min(11, task.stage)), prefix = continuation ? '魔核炼化与入水' : '主辅药调制'
  return <TeacherRoom title={continuation ? '房中 / 魔核炼化与入水' : '房中 / 清水与主辅药'} heading={continuation ? '先柔化魔核，再将药团加入清水。' : '先备清水，再看白焰中的药性。'}
    help="本人走近盛水处；老师的处理需明确选择旁观。逐步保存，刷新重新选人物。旧档只补当时过程，已耗材料和已完成药液保持。"
    mapLabel={continuation ? '魔核炼化与入水地图' : '清水与主辅药地图'} prefix={prefix} stage={continuation ? Math.max(0, task.stage - 11) : Math.min(11, task.stage)} total={11} summary={earlyRefiningSaveSummary(state, state.settings)}
    scene={continuation || task.stage < 11 ? refiningScenes[task.stage] : undefined}
    blocked={earlyRefiningBlock(state) || (continuation && task.stage < 11 ? '先完成清水与主辅药归档。' : '')}
    start={continuation ? task.stage < 18 ? ironPlaces.table : refiningStart(task.stage) : refiningStart(task.stage)} near={yan => refiningNear(yan, task.stage)}
    draw={() => <>
      <path aria-label={shown.stage >= 18 ? '当时药团已入清水' : shown.water ? '当时已备清水，尚未入药' : '盛水处，尚未备水'} d="M88 350 Q100 375 112 350 Z" fill={shown.stage >= 18 ? '#75bd7e' : shown.water ? '#6ba4bb' : '#937954'} />
      <text x="100" y="340" textAnchor="middle" fill="#eed7ad" fontSize="10">清水</text>
      {shown.flame && <path aria-label="老师掌中白焰，尚未熄灭" d="M230 348 Q222 340 230 327 Q238 340 230 348" fill="#fff4dc" />}
      <circle aria-label={`当时魔核药性：${({ table: '桌面', teacher: '老师手中', flame: '白焰中', softened: '已柔化', suspended: '悬浮药团', water: '水中' })[shown.core]}`}
        cx={shown.core === 'table' ? 260 : shown.core === 'water' ? 100 : shown.core === 'flame' || shown.core === 'suspended' ? 230 : 210}
        cy={shown.core === 'water' ? 357 : 344} r="4" fill="#75bd7e" />
    </>}
    errors={continuation ? task.stage === 11 || task.stage === 21 ? [{ operation: 'restore', label: '旧材料与药液免费补回' }]
      : task.stage === 15 || task.stage === 17 ? [{ operation: 'drink', label: '直接口服悬浮药团' }]
        : task.stage === 20 ? [{ operation: 'wait', label: '现实等待自动提升境界' }] : []
      : task.stage === 0 || task.stage === 8 ? [{ operation: 'restore', label: '回补历史就重新领取耗材' }]
      : task.stage === 4 ? [{ operation: 'drink', label: '将尚未完成的药液直接口服' }]
        : task.stage === 9 ? [{ operation: 'finish', label: '主辅药融合就算药液完成' }] : []}
    onAction={(yan, actor, operation) => submitEarlyRefining(gameStore, yan, { ...task, expectedLedger: marketTradeLedger(state),
      expectedIron: { ...state.earlyTraining.iron }, teacherPosition: { ...ironPlaces.teacher }, actor, operation: operation as RefiningAction['operation'] })}
    onBack={onBack} finished={continuation ? '当时药团已入水，口服已否决，期限与续购已说明。可由原入口继续修炼；旧已耗药液不恢复。' : '当时清水已备、主辅药已融合；可由魔核入口接续后半段。原已耗药液与修炼结果保持。'} back={`暂离${prefix}`} />
}
