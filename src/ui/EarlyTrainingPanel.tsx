import { lazyScene } from './scene-load'
import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { BondSummary } from './NativeRegions'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { deferredRoute } from './DeferredScene'
import { useSceneRoutes } from './use-scene-routes'
import type { ComponentType } from 'react'
import { useReturningScene } from './use-returning-scene'
import type { GameState } from '../core/model'
import { earlyTrainingBlock } from '../core/early-training'
import { gameStore } from '../core/store'
import { EARLY_LOAN, earlySupplies, type EarlySupplyId } from '../core/early-training-state'
import { earlyMarketScenes } from '../content/early-market'
import { earlyLiquidScenes } from '../content/early-liquid'
import EarlyPractice from './EarlyPractice'
import EarlyWalk from './EarlyWalk'
import { isVisible } from '../core/rules'
import { earlyFamilyContractSaveSummary, earlyMountainRingSaveSummary, earlyApprenticeSaveSummary, earlyMethodDiscussionSaveSummary, earlyPreparationBriefSaveSummary, earlyMountainVisitorSaveSummary, earlyMorningCardSaveSummary, earlyCityPharmacySaveSummary } from '../core/save-preview'
const EarlyQiPavilion = lazyScene(() => import('./EarlyQiPavilion'))
const EarlyQiBarrier = lazyScene(() => import('./EarlyQiBarrier'))
const EarlyQiScroll = lazyScene(() => import('./EarlyQiScroll'))
const EarlyQiAid = lazyScene(() => import('./EarlyQiAid'))
const EarlyQiExchange = lazyScene(() => import('./EarlyQiExchange'))
const EarlyFamilyVisit = lazyScene(() => import('./EarlyFamilyVisit'))
const EarlyFamilyCompensation = lazyScene(() => import('./EarlyFamilyCompensation'))
const EarlyFamilyContract = lazyScene(() => import('./EarlyFamilyContract'))
const EarlyMountainRing = lazyScene(() => import('./EarlyMountainRing'))
const EarlyApprentice = lazyScene(() => import('./EarlyApprentice'))
const EarlyMethodDiscussion = lazyScene(() => import('./EarlyMethodDiscussion'))
const EarlyPreparationBrief = lazyScene(() => import('./EarlyPreparationBrief'))
const EarlyMountainVisitor = lazyScene(() => import('./EarlyMountainVisitor'))
const EarlyMorningCard = lazyScene(() => import('./EarlyMorningCard'))
const EarlyCityPharmacy = lazyScene(() => import('./EarlyCityPharmacy'))
const EarlyMarketEscort = lazyScene(() => import('./EarlyMarketEscort'))
const EarlyMarketSearch = lazyScene(() => import('./EarlyMarketSearch'))
const EarlyMarketDiscovery = lazyScene(() => import('./EarlyMarketDiscovery'))
const EarlyMarketStandoff = lazyScene(() => import('./EarlyMarketStandoff'))
const EarlyMarketBracelets = lazyScene(() => import('./EarlyMarketBracelets'))

const FirstExternalTraining = lazyScene(() => import('./FirstExternalTraining'))
const FirstExternalLimit = lazyScene(() => import('./FirstExternalLimit'))
const FirstHallScrollReview = lazyScene(() => import('./FirstHallScrollReview'))
const FirstHallTeacher = lazyScene(() => import('./FirstHallTeacher'))
const FirstHallEvening = lazyScene(() => import('./FirstHallEvening'))
const FirstHallAfternoon = lazyScene(() => import('./FirstHallAfternoon'))
const FirstHallApproach = lazyScene(() => import('./FirstHallApproach'))
const FirstHallTalk = lazyScene(() => import('./FirstHallTalk'))
const FirstHallMatch = lazyScene(() => import('./FirstHallMatch'))
const FirstHallReading = lazyScene(() => import('./FirstHallReading'))
const FirstHallEntry = lazyScene(() => import('./FirstHallEntry'))
const FirstRoadMeeting = lazyScene(() => import('./FirstRoadMeeting'))
const FirstDeparture = lazyScene(() => import('./FirstDeparture'))
const FirstTechnique = lazyScene(() => import('./FirstTechnique'))
const FirstTraining = lazyScene(() => import('./FirstTraining'))
const EarlyRefining = lazyScene(() => import('./EarlyRefining'))
const EarlyIron = lazyScene(() => import('./EarlyIron'))

const preparationRoutes = [
  [51, FirstExternalTraining, "正在接续山后受击……", {}],
  [52, FirstExternalLimit, "正在接续限度说明与离林……", {}],
  [17, FirstHallApproach, "正在接续同卷归架……", { continuation: true }],
  [18, FirstHallApproach, "正在接续成人礼威胁……", { threat: true }],
  [19, FirstHallApproach, "正在接续堂内移步……", { exitResponse: true }],
  [20, FirstHallApproach, "正在接续同卷登记……", { checkout: true }],
  [21, FirstHallTeacher, "正在接续身体问答……", { body: true }],
  [22, FirstHallScrollReview, "正在接续额前传授……", { transmission: true }],
  [23, FirstHallTeacher, "正在接续认可条件……", { agreement: true }],
  [24, FirstHallScrollReview, "正在接续同卷求技……", {}],
  [25, FirstHallTeacher, "正在接续房中有限问答……", {}],
  [26, FirstHallEvening, "正在接续夜间回房……", {  }],
  [27, FirstHallAfternoon, "正在接续整个午后……", {  }],
  [28, FirstHallApproach, "正在接续堂内反应……", { aftermath: true }],
  [29, FirstHallApproach, "正在接续同行离堂……", { leaving: true }],
  [30, FirstHallApproach, "正在接续东架交锋……", { conflict: true }],
  [31, FirstHallApproach, "正在接续整衣与靠近……", {  }],
  [32, FirstHallTalk, "正在接续东架会面……", {  }],
  [33, FirstHallMatch, "正在接续东架旁观……", {  }],
  [34, FirstHallMatch, "正在接续赛后东架……", { continuation: true }],
  [35, FirstHallReading, "正在接续东侧同一卷阅读……", {  }],
  [36, FirstHallEntry, "正在接续实际入堂……", {  }],
  [37, FirstRoadMeeting, "正在接续石路会面……", {  }],
  [38, FirstDeparture, "正在接续出门石路……", {  }],
  [39, FirstTechnique, "正在接续有限试瓶……", { continuation: true }],
  [40, FirstTechnique, "正在接续铁片研究……", {  }],
  [41, FirstTraining, "正在接续半月回顾……", { continuation: true }],
  [42, FirstTraining, "正在接续持续调息……", {  }],
  [43, EarlyRefining, "正在接续清水与主辅药……", {  }],
  [44, EarlyRefining, "正在接续魔核炼化与入水……", { continuation: true }],
  [45, EarlyIron, "正在接续铁片辨认……", {  }],
  [46, EarlyMarketDiscovery, "正在接续回族与房中准备……", { key: 'return', returning: true }],
  [47, EarlyMarketDiscovery, "正在接续询价与唯一成交……", { key: 'trade', trade: true }],
  [48, EarlyMarketDiscovery, "正在接续摊位发现与心中建议……", {  }],
  [49, EarlyMarketStandoff, "正在接续围堵与非战斗离场……", {  }],
  [50, EarlyMarketBracelets, "正在接续让路与两条手链……", {  }],
  [16, EarlyMarketSearch, "正在接续寻核与手链摊……", {  }],
  [15, EarlyMarketEscort, "正在接续南坊与巡卫……", {  }],
  [14, EarlyCityPharmacy, "正在接续实际同行与药铺采购……", {  }, true],
  [13, EarlyMorningCard, "正在接续晨间普通黑卡交接……", {  }, true],
  [12, EarlyMountainVisitor, "正在接续当晚来访与借资问答……", {  }],
  [11, EarlyPreparationBrief, "正在接续准备说明与老师返戒……", {  }, true],
  [10, EarlyMethodDiscussion, "正在打开青石前的功法说明……", {  }],
  [9, EarlyApprentice, "正在接续援助交涉与本人拜师……", {  }],
  [8, EarlyMountainRing, "正在走上后山，察看古戒……", {  }],
  [7, EarlyFamilyContract, "正在接续文书与双方离厅……", {  }],
  [6, EarlyFamilyCompensation, "正在接续补偿与本人发言……", {  }],
  [5, EarlyFamilyVisit, "正在回到拜师前的接待厅……", {  }],
  [1, EarlyQiBarrier, "正在进入火通道与四十三号门障……", {  }],
  [2, EarlyQiScroll, "正在打开卷轴保管记录……", {  }],
  [4, EarlyQiExchange, "正在回看双卷交接……", {  }],
  [3, EarlyQiAid, "正在打开同行与援助记录……", {  }],
  [0, EarlyQiPavilion, "正在前往五天后的功法阁……", {  }],
] as const

export default function EarlyTrainingPanel({ state, onContinue }: { state: GameState; onContinue?: () => void }) {
  const blocked = earlyTrainingBlock(state)
  const [walking, setWalking, entry, walkingBack] = useReturningScene()
  const routes = useSceneRoutes(53)
  const task = state.earlyTraining
  const herbsReady = task.receipts.bluegrass && task.receipts.boneflower
  const marketScene = earlyMarketScenes[task.market.stage]
  const liquidScene = earlyLiquidScenes[task.liquid.stage]
  for (const route of preparationRoutes) if (routes.active[route[0]]) {
    const [name, Scene, message, props] = route
    const extra = route.length > 4 ? { onRoute: () => { routes.set(name, false); setWalking(true) } } : {}
    return deferredRoute(Scene as ComponentType<{ state: GameState; onBack: () => void }>, message, state, routes.back(name), { ...props, ...extra })
  }
  if (walking && !blocked) return <EarlyWalk state={state} onContinue={onContinue} onBack={walkingBack} />
  return <>
    {!blocked && <BondSummary aria-label="拜师之前的来访">
      <b>拜师之前 · {task.familyVisit.stage === 17 ? '来访前半程已归档' : `来访 ${task.familyVisit.stage}/17`}</b>
      <p>回到家族接待厅，分别记录入席、来客身份、公开请求与玉匣展示，再接拜师后的准备。</p>
      {routes.button(5, "回到家族来访 · 入席与公开请求")}
      {task.familyVisit.stage === 17 && <>
        <p>{task.familyCompensation.stage === 15 ? task.familyContract.stage > 0 ? earlyFamilyContractSaveSummary(state, state.settings) : '补偿交涉前段已归档，文书与三年约定待续。' : `接续补偿与本人发言 ${task.familyCompensation.stage}/15`}</p>
        {routes.button(6, "接续补偿交涉 · 本人发言与追加条件")}
        {task.familyCompensation.stage === 15 && routes.button(7, "接续文书与离厅 · 三年约定和原物保管")}
        {task.familyContract.stage === 33 && <>
          <p>{earlyMountainRingSaveSummary(state, state.settings)}</p>
          {routes.button(8, "独自走上后山 · 声音与古戒归属")}
          {task.mountainRing.stage === 21 && <>
            <p>{earlyApprenticeSaveSummary(state, state.settings)}</p>
            {routes.button(9, "接续援助与拜师 · 许可边界和本人行礼")}
            {task.apprentice.stage === 25 && <>
              <p>{earlyMethodDiscussionSaveSummary(state, state.settings)}</p>
              {routes.button(10, "接续功法说明 · 前置与未授卷")}
              {task.methodDiscussion.stage === 28 && <>
                <p>{earlyPreparationBriefSaveSummary(state, state.settings)}</p>
                {routes.button(11, "接续准备与返戒 · 材料单和借资衔接")}
                {task.preparationBrief.stage === 20 && <>
                  <p>{earlyMountainVisitorSaveSummary(state, state.settings)}</p>
                  {routes.button(12, "接续薰儿来访 · 当晚问答与紫金卡")}
                  {task.mountainVisitor.stage === 26 && <><p>{earlyMorningCardSaveSummary(state, state.settings)}</p>
                    {routes.button(13, "接续晨间交卡 · 普通黑卡与采购账")}
                    {task.morningCard.stage === 14 && <><p>{earlyCityPharmacySaveSummary(state, state.settings)}</p>
                      {routes.button(14, "接续同行药铺 · 入城与两药原收据")}
                      {task.cityPharmacy.stage === 15 && <>{routes.button(15, "接续入坊巡卫 · 同行与三护卫")}
                        {task.marketEscort.stage === 24 && routes.button(16, "接续坊市寻核 · 分路与手链放回")}</>}</>}</>}
                </>}
              </>}
            </>}
          </>}
        </>}
      </>}
    </BondSummary>}
    <Eyebrow>重修往事 / 拜师之后</Eyebrow>
    <h2>从一份准备单，重新开始。</h2>
    {blocked ? <MutedParagraph>{blocked}</MutedParagraph> : <>
      <p>三年约定之后，药老在后山现身，萧炎拜师。重修的下一步，是筹措资金、找到指定药材，再由老师调制供修炼使用的药液。</p>
      <MutedParagraph>这段往事独立记录。任务资金和材料专用于重修，不与行囊金币、灵草或魔晶混用。</MutedParagraph>
      {isVisible(state, 2) && task.marketSearch.stage === 20 && <BondSummary aria-label="让路与两条手链接续">
        <b>寻核与放回归档 · 接续街角交谈</b><p>请求让路、分别核对两条手链的提议与交付，已有唯一赠礼记录保留。</p>
        {routes.button(50, "接续让路与两条手链")}
      </BondSummary>}
      {isVisible(state, 2) && task.marketBracelets.stage === 28 && <BondSummary aria-label="围堵与离场接续">
        <b>两手链归档 · 街角争执待续</b><p>本人呼叫、护卫到场、拒绝单挑与实际离场分别保存，再向深处寻找材料。</p>
        {routes.button(49, "接续围堵与非战斗离场")}
      </BondSummary>}
      {isVisible(state, 2) && task.marketStandoff.stage === 34 && <BondSummary aria-label="摊位发现接续">
        <b>非战斗离场归档 · 接续深处摊位</b><p>先实际走近，再分别发现绿核、感应黑铁片和听见心中建议，现有收据保留。</p>
        {routes.button(48, "接续摊位发现与心中建议")}
      </BondSummary>}
      {isVisible(state, 2) && task.marketDiscovery.stage === 10 && <BondSummary aria-label="询价与唯一成交接续">
        <b>发现与建议归档 · 接续摊主交涉</b><p>询问来源、议价、明确同意、实际付款与走离分存，沿同一折算60订单保留已购或耗尽材料。</p>
        {routes.button(47, "接续询价与唯一成交")}
      </BondSummary>}
      {isVisible(state, 2) && task.marketTrade.stage === 17 && <BondSummary aria-label="回族与房中准备接续">
        <b>成交离摊归档 · 接续回族准备</b><p>实际回族、分路、回房、锁门与摆材料分存，原已耗材料不补回。</p>
        {routes.button(46, "接续回族与房中准备")}
      </BondSummary>}
      {isVisible(state, 2) && task.marketReturn.stage === 9 && <BondSummary aria-label="铁片辨认接续">
        <b>房中准备归档 · 接续铁片辨认</b><p>老师和本人分别操作，取出、接过、放下、拾回与收好分存，不把名称当作掌握。</p>
        {routes.button(45, "接续铁片辨认与限制")}
      </BondSummary>}
      {isVisible(state, 2) && task.iron.stage === 18 && <BondSummary aria-label="主辅药调制接续">
        <b>铁片已归档 · 接续清水与主辅药</b><p>备水、白焰、三株主药与两株辅药依次保存，沿原材料账单次消耗。</p>
        {routes.button(43, "接续清水与主辅药调制")}
      </BondSummary>}
      {isVisible(state, 2) && task.refining.stage >= 11 && <BondSummary aria-label="魔核入水接续">
        <b>主辅药已归档 · 接续魔核入水</b><p>魔核柔化、熄焰、否决口服、实际入水与期限分存，不重复领取材料。</p>
        {routes.button(44, "接续魔核炼化与入水")}
      </BondSummary>}
      {isVisible(state, 2) && task.refining.stage === 22 && <BondSummary aria-label="持续调息接续">
        <b>魔核入水已归档 · 接续当前一轮</b><p>坐定、手动调息与收束分存，两个月五段仅为预计。</p>
        {routes.button(42, "接续当前一轮持续调息")}
      </BondSummary>}
      {isVisible(state, 2) && task.firstTraining.stage >= 10 && <BondSummary aria-label="半月修炼接续">
        <b>当前一轮归档 · 半月回顾</b><p>当时四段、老师反应、药色与衣着分存。</p>
        {routes.button(41, "接续半月回顾与当时四段")}
      </BondSummary>}
      {isVisible(state, 2) && task.firstTraining.stage === 17 && <BondSummary aria-label="首次铁片研究接续">
        <b>半月回顾归档 · 同一铁片研究</b><p>实际取片、研究回顾与本人感知分存。</p>
        {routes.button(40, "接续同一铁片研究与感知")}
      </BondSummary>}
      {isVisible(state, 2) && task.firstTechnique.stage >= 9 && <BondSummary aria-label="有限瓷瓶试招接续">
        <b>铁片研究归档 · 有限试招</b><p>留在床边面对瓷瓶，按当时功力记录转动、落离桌面与碎裂。</p>
        {routes.button(39, "接续有限瓷瓶试招")}
      </BondSummary>}
      {isVisible(state, 2) && task.firstTechnique.stage === 19 && <BondSummary aria-label="首次出门石路接续">
        <b>有限试招归档 · 本人出门</b><p>起身看戒、实际跨门、室外关门和进入石路分存。</p>
        {routes.button(38, "接续实际出门与石路")}
      </BondSummary>}
      {isVisible(state, 2) && task.firstDeparture.stage === 9 && <BondSummary aria-label="石路会面接续">
        <b>出门石路归档 · 转路与会面</b><p>实际转路、辨认来人、分别答话与分路分存。</p>
        {routes.button(37, "接续石路会面与分路")}
      </BondSummary>}
      {isVisible(state, 2) && task.firstRoadMeeting.stage === 12 && <BondSummary aria-label="实际入堂接续">
        <b>路口分路归档 · 实际入堂</b><p>转角、堂牌、门外声音、本人跨门与东西分区分存。</p>
        {routes.button(36, "接续实际入堂与东西分区")}
        {task.firstHallEntry.stage === 9 && routes.button(35, "接续东侧同一第一卷阅读")}
      </BondSummary>}
      {isVisible(state, 2) && task.firstHallReading.stage === 8 && routes.button(33, "接续东架旁观西侧比赛")}
      {isVisible(state, 2) && task.firstHallApproach.stage >= 14 && routes.button(17, "接续帮选交涉与同卷归架")}
      {isVisible(state, 2) && task.firstHallApproach.stage >= 19 && routes.button(30, "接续东架交锋与本人第二卷")}
      {isVisible(state, 2) && task.firstHallApproach.stage >= 31 && routes.button(18, "接续成人礼威胁与本人观察")}
      {isVisible(state, 2) && task.firstHallApproach.stage >= 40 && routes.button(19, "接续堂内移步与来年回应")}
      {isVisible(state, 2) && task.firstHallApproach.stage >= 46 && routes.button(20, "接续同卷管理者登记")}
      {isVisible(state, 2) && task.firstHallBody.stage === 7 && routes.button(51, "接续山后受击与身体反应")}
      {isVisible(state, 2) && task.firstExternalTraining.stage === 10 && routes.button(52, "接续限度说明与离林")}
      {isVisible(state, 2) && task.firstHallTransmission.stage === 6 && routes.button(21, "接续身体限制与增强问答")}
      {isVisible(state, 2) && task.firstHallGrant.stage === 7 && routes.button(22, "接续实际额前传授与知识")}
      {isVisible(state, 2) && task.firstHallScrollReview.stage === 9 && routes.button(23, "接续老师认可与使用条件")}
      {isVisible(state, 2) && task.firstHallTeacher.stage === 7 && routes.button(24, "接续同卷翻看与求技")}
      {task.firstHallEvening.stage === 9 && routes.button(25, "接续房中老师现身与有限背景")}
      {isVisible(state, 2) && task.firstHallAfternoon.stage === 10 && routes.button(26, "接续夜间回房与同卷放桌")}
      {isVisible(state, 2) && task.firstHallApproach.stage === 57 && routes.button(27, "接续整个午后同行与天黑")}
      {isVisible(state, 2) && task.firstHallApproach.stage >= 53 && routes.button(28, "接续离堂后萧宁独立反应")}
      {isVisible(state, 2) && task.firstHallApproach.stage >= 49 && routes.button(29, "接续同行与实际离堂")}
      {isVisible(state, 2) && task.firstHallTalk.stage === 20 && routes.button(31, "接续整衣靠近与同卷收起")}
      {isVisible(state, 2) && task.firstHallMatch.stage === 20 && routes.button(32, "接续东架会面与半月问答")}
      {isVisible(state, 2) && task.firstHallMatch.stage >= 12 && routes.button(34, "接续赛后返回与薰儿走向东架")}
      <SecondaryButton ref={entry} onClick={() => setWalking(true)}>漫步往事准备路线</SecondaryButton>
      {isVisible(state, 3) && task.ceremonyVerdict.stage === 16 && <BondSummary aria-label="礼后接续">
        <b>成人礼离场已归档 · 接续五天后的安排</b><p>前往功法阁测定属性，分别记录本人、薰儿与实际入阁。已有斗技堂借卷保留。</p>
        {routes.button(0, "前往功法阁 · 属性测定与入阁")}
      </BondSummary>}
      {isVisible(state, 3) && task.qiPavilionEntry.stage === 12 && <BondSummary aria-label="功法阁门障接续">
        <b>功法阁入阁已归档 · 火通道记录</b><p>沿第三支路核对三十七号与四十三号，再进行独立红幕测试。{task.qiPavilionScroll.family === 'held' ? '后续已取得家族卷，门障记录保留。' : '尚未取得卷轴。'}</p>
        {routes.button(1, "进入火通道 · 四十三号门障")}
      </BondSummary>}
      {isVisible(state, 3) && task.qiPavilionBarrier.stage === 10 && <BondSummary aria-label="功法阁卷轴保管接续">
        <b>四十三号房已入室 · {task.qiPavilionScroll.stage === 6 ? '简略保管已归档' : '卷轴保管待续'}</b><p>先保管唯一家族火属性卷，再分别记录薰儿的额外卷轴提议与婉拒。</p>
        {routes.button(2, "处理四十三号房卷轴")}
      </BondSummary>}
      {isVisible(state, 3) && task.qiPavilionScroll.stage === 6 && <BondSummary aria-label="功法阁同行援助接续">
        <b>简略保管已归档 · 双卷交接回看</b><p>回看薰儿拿看同一卷、展示自己的支持卷、萧炎取回与婉拒，原结局记录保留。</p>
        {routes.button(4, "回看双卷交接细节")}
      </BondSummary>}
      {isVisible(state, 3) && task.qiPavilionExchange.stage === 8 && <BondSummary aria-label="功法阁独自援助接续">
        <b>双卷交接已核 · {task.qiPavilionAid.stage === 10 ? '同行援助已归档' : '接续同行与援助'}</b><p>薰儿另选卷、近时限与萧媚风属性房门，先经过再独自回返。</p>
        {routes.button(3, "进入同行与援助记录")}
      </BondSummary>}
      {task.practice.phase === 4 && <MutedParagraph>初期尝试已归档。可在准备路线走近药老，接续前往斗技堂；堂内到访独立记录，正式传技另行继续。</MutedParagraph>}
      <BondSummary aria-label="重修准备记录">
        <b>{state.earlyTraining.started ? '准备单已记下' : '尚未接下准备'}</b>
        <p>两种指定草药，分别三株与两株；另需一枚一阶木属性魔核。药老负责调制，萧炎准备容器与水。药液用于修炼。</p>
        {!state.earlyTraining.started && <PrimaryButton onClick={() => gameStore.beginEarlyTraining()}>记下重修准备</PrimaryButton>}
      </BondSummary>
      {task.started && <>
        <BondSummary aria-label="重修采购资金">
          <b>采购余额 {task.purse.borrowed - task.purse.spent} · 已付 {task.purse.spent}</b>
          <p>薰儿：先把准备做齐。这笔采购资金，我借给你。</p>
          <MutedParagraph>借资{EARLY_LOAN}、药草30/20、魔核及附物60均为游戏折算单位，不是原著金钱数额；不计入行囊金币，也不发主线奖励。</MutedParagraph>
          {!task.purse.borrowed && <PrimaryButton onClick={() => gameStore.earlyTraining({ type: 'borrow', expectedSpent: task.purse.spent })}>向薰儿借采购资金</PrimaryButton>}
        </BondSummary>
        <BondSummary aria-label="药铺与坊市采购">
          <h3>{herbsReady ? '萧家坊市 · 寻找魔核' : '药铺 · 配齐药草'}</h3>
          <p>{herbsReady ? '药草已经齐备。萧炎与薰儿来到萧家坊市，在护卫照看的街道寻找一阶木属性魔核。' : '先按准备单买两种药草，两者可分别购买。买齐后，再去萧家坊市寻找指定魔核。'}</p>
          {(Object.keys(earlySupplies) as EarlySupplyId[]).filter(id => id !== 'woodCore' || herbsReady).map(id => {
            const item = earlySupplies[id]
            return <article className="recap-line" key={id}>
              <b>{item.label} · {item.price}采购资金</b>
              <p>{task.receipts[id] ? task.supplies[id] ? `已购入 · 任务袋${task.supplies[id]}` : '已购入并由老师使用 · 购买记录保留' : '由卖方交付到重修任务袋。普通行囊材料不能代替。'}</p>
              <SecondaryButton disabled={task.receipts[id] || task.purse.borrowed - task.purse.spent < item.price}
                onClick={() => gameStore.earlyTraining({ type: 'purchase', item: id, price: item.price, expectedSpent: task.purse.spent })}>
                {task.receipts[id] ? '已记购买记录' : `购买${item.label}`}
              </SecondaryButton>
            </article>
          })}
        </BondSummary>
        {herbsReady && <BondSummary aria-label="坊市往事与黑铁片">
          <Eyebrow>坊市往事 · {Math.min(task.market.stage + 1, 4)} / 4</Eyebrow>
          <MutedParagraph>回顾采购中的交涉。已付款的魔核记录保留，这里核对同一笔交易的黑铁片附物。</MutedParagraph>
          {marketScene ? <>
            <h3>{marketScene.title}</h3><b>{marketScene.speaker}</b><p>{marketScene.text}</p>
            <SecondaryButton disabled={task.market.stage === 3 && !task.receipts.woodCore}
              onClick={() => gameStore.earlyTraining({ type: 'market', step: task.market.stage, expectedSpent: task.purse.spent })}>{marketScene.action}</SecondaryButton>
            {task.market.stage === 3 && !task.receipts.woodCore && <MutedParagraph>先在上方付清魔核采购订单，再核对附物。</MutedParagraph>}
          </> : <><h3>黑铁片已收好</h3><p>护卫介入后，争执告一段落。魔核和黑铁片来自同一次采购，萧炎带着物品回家，准备请药老辨认。</p><p>任务袋：黑铁片 ×{task.market.blackIron}</p></>}
          <MutedParagraph>这是对白与交互的压缩改编；也可从上方进入准备路线，在地点进行同一笔交易。黑铁片尚未化为玩家的战斗技能。</MutedParagraph>
        </BondSummary>}
        {task.market.stage === 4 && <BondSummary aria-label="药老调制与稀释">
          <Eyebrow>重修药液 · {Math.min(task.liquid.stage + 1, 6)} / 6</Eyebrow>
          {liquidScene ? <>
            <h3>{liquidScene.title}</h3><b>{liquidScene.speaker}</b><p>{liquidScene.text}</p>
            <SecondaryButton onClick={() => gameStore.earlyTraining({ type: 'liquid',
              step: task.liquid.stage, operation: liquidScene.operation, expectedSpent: task.purse.spent })}>{liquidScene.action}</SecondaryButton>
          </> : <><h3>{task.recovery.energy === 'spent' ? '自用药液已耗尽' : task.recovery.energy === 'fading' ? '恢复中药色渐淡' : '修炼药液已备好'}</h3>
            <p>{task.recovery.energy === 'spent' ? '此前药老调制并加水的药液已用于恢复，现只余清水，后续需另筹材料。' : '药老已完成调制，药液加入水中。'}主药、辅药和魔核已依次使用，收据保留；黑铁片仍在任务袋中。</p></>}
          <MutedParagraph>玩家负责准备与观察，药老负责调制。药液不会进入口服丹药行囊；备好后可在下方进行初期练习。</MutedParagraph>
        </BondSummary>}
        <EarlyPractice state={state} onContinue={onContinue} />
        {task.receipts.woodCore && task.market.stage < 4 && <MutedParagraph>三种材料由任务袋保管。先完成坊市往事，带回黑铁片，再请药老调制；现在没有药液、丹药或新的修炼结果。</MutedParagraph>}
      </>}
    </>}
    <MutedParagraph>重修往事不会回退已完成主线，也不会重新发放章节奖励。</MutedParagraph>
  </>
}
