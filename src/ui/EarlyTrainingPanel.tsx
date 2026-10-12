import DeferredScene from './DeferredScene'
import { lazy } from 'react'
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
import { loadSceneModule } from './scene-load'
import { earlyFamilyContractSaveSummary, earlyMountainRingSaveSummary, earlyApprenticeSaveSummary, earlyMethodDiscussionSaveSummary, earlyPreparationBriefSaveSummary, earlyMountainVisitorSaveSummary, earlyMorningCardSaveSummary, earlyCityPharmacySaveSummary } from '../core/save-preview'
const EarlyQiPavilion = lazy(() => loadSceneModule(() => import('./EarlyQiPavilion')))
const EarlyQiBarrier = lazy(() => loadSceneModule(() => import('./EarlyQiBarrier')))
const EarlyQiScroll = lazy(() => loadSceneModule(() => import('./EarlyQiScroll')))
const EarlyQiAid = lazy(() => loadSceneModule(() => import('./EarlyQiAid')))
const EarlyQiExchange = lazy(() => loadSceneModule(() => import('./EarlyQiExchange')))
const EarlyFamilyVisit = lazy(() => loadSceneModule(() => import('./EarlyFamilyVisit')))
const EarlyFamilyCompensation = lazy(() => loadSceneModule(() => import('./EarlyFamilyCompensation')))
const EarlyFamilyContract = lazy(() => loadSceneModule(() => import('./EarlyFamilyContract')))
const EarlyMountainRing = lazy(() => loadSceneModule(() => import('./EarlyMountainRing')))
const EarlyApprentice = lazy(() => loadSceneModule(() => import('./EarlyApprentice')))
const EarlyMethodDiscussion = lazy(() => loadSceneModule(() => import('./EarlyMethodDiscussion')))
const EarlyPreparationBrief = lazy(() => loadSceneModule(() => import('./EarlyPreparationBrief')))
const EarlyMountainVisitor = lazy(() => loadSceneModule(() => import('./EarlyMountainVisitor')))
const EarlyMorningCard = lazy(() => loadSceneModule(() => import('./EarlyMorningCard')))
const EarlyCityPharmacy = lazy(() => loadSceneModule(() => import('./EarlyCityPharmacy')))
const EarlyMarketEscort = lazy(() => loadSceneModule(() => import('./EarlyMarketEscort')))
const EarlyMarketSearch = lazy(() => loadSceneModule(() => import('./EarlyMarketSearch')))
const EarlyMarketDiscovery = lazy(() => loadSceneModule(() => import('./EarlyMarketDiscovery')))
const EarlyMarketStandoff = lazy(() => loadSceneModule(() => import('./EarlyMarketStandoff')))
const EarlyMarketBracelets = lazy(() => loadSceneModule(() => import('./EarlyMarketBracelets')))

const FirstDeparture = lazy(() => loadSceneModule(() => import('./FirstDeparture')))
const FirstTechnique = lazy(() => loadSceneModule(() => import('./FirstTechnique')))
const FirstTraining = lazy(() => loadSceneModule(() => import('./FirstTraining')))
const EarlyRefining = lazy(() => loadSceneModule(() => import('./EarlyRefining')))
const EarlyIron = lazy(() => loadSceneModule(() => import('./EarlyIron')))

export default function EarlyTrainingPanel({ state, onContinue }: { state: GameState; onContinue?: () => void }) {
  const blocked = earlyTrainingBlock(state)
  const [walking, setWalking, entry, walkingBack] = useReturningScene()
  const [pavilion, setPavilion, pavilionEntry, pavilionBack] = useReturningScene()
  const [barrier, setBarrier, barrierEntry, barrierBack] = useReturningScene()
  const [scroll, setScroll, scrollEntry, scrollBack] = useReturningScene()
  const [aid, setAid, aidEntry, aidBack] = useReturningScene()
  const [exchange, setExchange, exchangeEntry, exchangeBack] = useReturningScene()
  const [familyVisit, setFamilyVisit, familyVisitEntry, familyVisitBack] = useReturningScene()
  const [familyCompensation, setFamilyCompensation, compensationEntry, familyCompensationBack] = useReturningScene()
  const [familyContract, setFamilyContract, contractEntry, familyContractBack] = useReturningScene()
  const [mountainRing, setMountainRing, mountainRingEntry, mountainRingBack] = useReturningScene()
  const [apprentice, setApprentice, apprenticeEntry, apprenticeBack] = useReturningScene()
  const [methodDiscussion, setMethodDiscussion, methodEntry, methodDiscussionBack] = useReturningScene()
  const [preparationBrief, setPreparationBrief, briefEntry, preparationBriefBack] = useReturningScene()
  const [mountainVisitor, setMountainVisitor, visitorEntry, mountainVisitorBack] = useReturningScene()
  const [morningCard, setMorningCard, morningEntry, morningCardBack] = useReturningScene()
  const [cityPharmacy, setCityPharmacy, cityEntry, cityPharmacyBack] = useReturningScene()
  const [marketEscort, setMarketEscort, escortEntry, marketEscortBack] = useReturningScene()
  const [marketSearch, setMarketSearch, searchEntry, marketSearchBack] = useReturningScene()
  const [firstDeparture, setFirstDeparture, departureEntry, departureBack] = useReturningScene()
  const [firstBottle, setFirstBottle, bottleEntry, bottleBack] = useReturningScene()
  const [firstTechnique, setFirstTechnique, techniqueEntry, techniqueBack] = useReturningScene()
  const [firstReview, setFirstReview, reviewEntry, reviewBack] = useReturningScene()
  const [firstTraining, setFirstTraining, trainingEntry, trainingBack] = useReturningScene()
  const [refining, setRefining, refiningEntry, refiningBack] = useReturningScene()
  const [infusion, setInfusion, infusionEntry, infusionBack] = useReturningScene()
  const [iron, setIron, ironEntry, ironBack] = useReturningScene()
  const [marketReturn, setMarketReturn, returnEntry, marketReturnBack] = useReturningScene()
  const [marketTrade, setMarketTrade, tradeEntry, marketTradeBack] = useReturningScene()
  const [marketDiscovery, setMarketDiscovery, discoveryEntry, marketDiscoveryBack] = useReturningScene()
  const [marketStandoff, setMarketStandoff, standoffEntry, marketStandoffBack] = useReturningScene()
  const [marketBracelets, setMarketBracelets, braceletsEntry, marketBraceletsBack] = useReturningScene()
  const task = state.earlyTraining
  const herbsReady = task.receipts.bluegrass && task.receipts.boneflower
  const marketScene = earlyMarketScenes[task.market.stage]
  const liquidScene = earlyLiquidScenes[task.liquid.stage]
  if (firstDeparture) return <DeferredScene message="正在接续出门石路……"><FirstDeparture state={state} onBack={departureBack} /></DeferredScene>
  if (firstBottle) return <DeferredScene message="正在接续有限试瓶……"><FirstTechnique continuation state={state} onBack={bottleBack} /></DeferredScene>
  if (firstTechnique) return <DeferredScene message="正在接续铁片研究……"><FirstTechnique state={state} onBack={techniqueBack} /></DeferredScene>
  if (firstReview) return <DeferredScene message="正在接续半月回顾……"><FirstTraining continuation state={state} onBack={reviewBack} /></DeferredScene>
  if (firstTraining) return <DeferredScene message="正在接续持续调息……"><FirstTraining state={state} onBack={trainingBack} /></DeferredScene>
  if (refining) return <DeferredScene message="正在接续清水与主辅药……"><EarlyRefining state={state} onBack={refiningBack} /></DeferredScene>
  if (infusion) return <DeferredScene message="正在接续魔核炼化与入水……"><EarlyRefining continuation state={state} onBack={infusionBack} /></DeferredScene>
  if (iron) return <DeferredScene message="正在接续铁片辨认……"><EarlyIron state={state} onBack={ironBack} /></DeferredScene>
  if (marketReturn) return <DeferredScene message="正在接续回族与房中准备……"><EarlyMarketDiscovery key="return" returning state={state}
    onBack={marketReturnBack} /></DeferredScene>
  if (marketTrade) return <DeferredScene message="正在接续询价与唯一成交……"><EarlyMarketDiscovery key="trade" trade state={state}
    onBack={marketTradeBack} /></DeferredScene>
  if (marketDiscovery) return <DeferredScene message="正在接续摊位发现与心中建议……"><EarlyMarketDiscovery state={state}
    onBack={marketDiscoveryBack} /></DeferredScene>
  if (marketStandoff) return <DeferredScene message="正在接续围堵与非战斗离场……"><EarlyMarketStandoff state={state}
    onBack={marketStandoffBack} /></DeferredScene>
  if (marketBracelets) return <DeferredScene message="正在接续让路与两条手链……"><EarlyMarketBracelets state={state}
    onBack={marketBraceletsBack} /></DeferredScene>
  if (marketSearch) return <DeferredScene message="正在接续寻核与手链摊……"><EarlyMarketSearch state={state}
    onBack={marketSearchBack} /></DeferredScene>
  if (marketEscort) return <DeferredScene message="正在接续南坊与巡卫……"><EarlyMarketEscort state={state}
    onBack={marketEscortBack} /></DeferredScene>
  if (cityPharmacy) return <DeferredScene message="正在接续实际同行与药铺采购……"><EarlyCityPharmacy state={state}
    onBack={cityPharmacyBack} onRoute={() => { setCityPharmacy(false); setWalking(true) }} /></DeferredScene>
  if (morningCard) return <DeferredScene message="正在接续晨间普通黑卡交接……"><EarlyMorningCard state={state}
    onBack={morningCardBack} onRoute={() => { setMorningCard(false); setWalking(true) }} /></DeferredScene>
  if (mountainVisitor) return <DeferredScene message="正在接续当晚来访与借资问答……"><EarlyMountainVisitor state={state} onBack={mountainVisitorBack} /></DeferredScene>
  if (preparationBrief) return <DeferredScene message="正在接续准备说明与老师返戒……"><EarlyPreparationBrief state={state}
    onBack={preparationBriefBack}
    onRoute={() => { setPreparationBrief(false); setWalking(true) }} /></DeferredScene>
  if (methodDiscussion) return <DeferredScene message="正在打开青石前的功法说明……"><EarlyMethodDiscussion state={state} onBack={methodDiscussionBack} /></DeferredScene>
  if (apprentice) return <DeferredScene message="正在接续援助交涉与本人拜师……"><EarlyApprentice state={state} onBack={apprenticeBack} /></DeferredScene>
  if (mountainRing) return <DeferredScene message="正在走上后山，察看古戒……"><EarlyMountainRing state={state} onBack={mountainRingBack} /></DeferredScene>
  if (familyContract) return <DeferredScene message="正在接续文书与双方离厅……"><EarlyFamilyContract state={state} onBack={familyContractBack} /></DeferredScene>
  if (familyCompensation) return <DeferredScene message="正在接续补偿与本人发言……"><EarlyFamilyCompensation state={state} onBack={familyCompensationBack} /></DeferredScene>
  if (familyVisit) return <DeferredScene message="正在回到拜师前的接待厅……"><EarlyFamilyVisit state={state} onBack={familyVisitBack} /></DeferredScene>
  if (barrier) return <DeferredScene message="正在进入火通道与四十三号门障……"><EarlyQiBarrier state={state} onBack={barrierBack} /></DeferredScene>
  if (scroll) return <DeferredScene message="正在打开卷轴保管记录……"><EarlyQiScroll state={state} onBack={scrollBack} /></DeferredScene>
  if (exchange) return <DeferredScene message="正在回看双卷交接……"><EarlyQiExchange state={state} onBack={exchangeBack} /></DeferredScene>
  if (aid) return <DeferredScene message="正在打开同行与援助记录……"><EarlyQiAid state={state} onBack={aidBack} /></DeferredScene>
  if (pavilion) return <DeferredScene message="正在前往五天后的功法阁……"><EarlyQiPavilion state={state} onBack={pavilionBack} /></DeferredScene>
  if (walking && !blocked) return <EarlyWalk state={state} onContinue={onContinue} onBack={walkingBack} />
  return <>
    {!blocked && <section className="bond-summary" aria-label="拜师之前的来访">
      <b>拜师之前 · {task.familyVisit.stage === 17 ? '来访前半程已归档' : `来访 ${task.familyVisit.stage}/17`}</b>
      <p>回到家族接待厅，分别记录入席、来客身份、公开请求与玉匣展示，再接拜师后的准备。</p>
      <button ref={familyVisitEntry} className="secondary" onClick={() => setFamilyVisit(true)}>回到家族来访 · 入席与公开请求</button>
      {task.familyVisit.stage === 17 && <>
        <p>{task.familyCompensation.stage === 15 ? task.familyContract.stage > 0 ? earlyFamilyContractSaveSummary(state, state.settings) : '补偿交涉前段已归档，文书与三年约定待续。' : `接续补偿与本人发言 ${task.familyCompensation.stage}/15`}</p>
        <button ref={compensationEntry} className="secondary" onClick={() => setFamilyCompensation(true)}>接续补偿交涉 · 本人发言与追加条件</button>
        {task.familyCompensation.stage === 15 && <button ref={contractEntry} className="secondary" onClick={() => setFamilyContract(true)}>接续文书与离厅 · 三年约定和原物保管</button>}
        {task.familyContract.stage === 33 && <>
          <p>{earlyMountainRingSaveSummary(state, state.settings)}</p>
          <button ref={mountainRingEntry} className="secondary" onClick={() => setMountainRing(true)}>独自走上后山 · 声音与古戒归属</button>
          {task.mountainRing.stage === 21 && <>
            <p>{earlyApprenticeSaveSummary(state, state.settings)}</p>
            <button ref={apprenticeEntry} className="secondary" onClick={() => setApprentice(true)}>接续援助与拜师 · 许可边界和本人行礼</button>
            {task.apprentice.stage === 25 && <>
              <p>{earlyMethodDiscussionSaveSummary(state, state.settings)}</p>
              <button ref={methodEntry} className="secondary" onClick={() => setMethodDiscussion(true)}>接续功法说明 · 前置与未授卷</button>
              {task.methodDiscussion.stage === 28 && <>
                <p>{earlyPreparationBriefSaveSummary(state, state.settings)}</p>
                <button ref={briefEntry} className="secondary" onClick={() => setPreparationBrief(true)}>接续准备与返戒 · 材料单和借资衔接</button>
                {task.preparationBrief.stage === 20 && <>
                  <p>{earlyMountainVisitorSaveSummary(state, state.settings)}</p>
                  <button ref={visitorEntry} className="secondary" onClick={() => setMountainVisitor(true)}>接续薰儿来访 · 当晚问答与紫金卡</button>
                  {task.mountainVisitor.stage === 26 && <><p>{earlyMorningCardSaveSummary(state, state.settings)}</p>
                    <button ref={morningEntry} className="secondary" onClick={() => setMorningCard(true)}>接续晨间交卡 · 普通黑卡与采购账</button>
                    {task.morningCard.stage === 14 && <><p>{earlyCityPharmacySaveSummary(state, state.settings)}</p>
                      <button ref={cityEntry} className="secondary" onClick={() => setCityPharmacy(true)}>接续同行药铺 · 入城与两药原收据</button>
                      {task.cityPharmacy.stage === 15 && <><button ref={escortEntry} className="secondary" onClick={() => setMarketEscort(true)}>接续入坊巡卫 · 同行与三护卫</button>
                        {task.marketEscort.stage === 24 && <button ref={searchEntry} className="secondary" onClick={() => setMarketSearch(true)}>接续坊市寻核 · 分路与手链放回</button>}</>}</>}</>}
                </>}
              </>}
            </>}
          </>}
        </>}
      </>}
    </section>}
    <span className="eyebrow">重修往事 / 拜师之后</span>
    <h2>从一份准备单，重新开始。</h2>
    {blocked ? <p className="muted">{blocked}</p> : <>
      <p>三年约定之后，药老在后山现身，萧炎拜师。重修的下一步，是筹措资金、找到指定药材，再由老师调制供修炼使用的药液。</p>
      <p className="muted">这段往事独立记录。任务资金和材料专用于重修，不与行囊金币、灵草或魔晶混用。</p>
      {isVisible(state, 2) && task.marketSearch.stage === 20 && <section className="bond-summary" aria-label="让路与两条手链接续">
        <b>寻核与放回归档 · 接续街角交谈</b><p>请求让路、分别核对两条手链的提议与交付，已有唯一赠礼记录保留。</p>
        <button ref={braceletsEntry} className="secondary" onClick={() => setMarketBracelets(true)}>接续让路与两条手链</button>
      </section>}
      {isVisible(state, 2) && task.marketBracelets.stage === 28 && <section className="bond-summary" aria-label="围堵与离场接续">
        <b>两手链归档 · 街角争执待续</b><p>本人呼叫、护卫到场、拒绝单挑与实际离场分别保存，再向深处寻找材料。</p>
        <button ref={standoffEntry} className="secondary" onClick={() => setMarketStandoff(true)}>接续围堵与非战斗离场</button>
      </section>}
      {isVisible(state, 2) && task.marketStandoff.stage === 34 && <section className="bond-summary" aria-label="摊位发现接续">
        <b>非战斗离场归档 · 接续深处摊位</b><p>先实际走近，再分别发现绿核、感应黑铁片和听见心中建议，现有收据保留。</p>
        <button ref={discoveryEntry} className="secondary" onClick={() => setMarketDiscovery(true)}>接续摊位发现与心中建议</button>
      </section>}
      {isVisible(state, 2) && task.marketDiscovery.stage === 10 && <section className="bond-summary" aria-label="询价与唯一成交接续">
        <b>发现与建议归档 · 接续摊主交涉</b><p>询问来源、议价、明确同意、实际付款与走离分存，沿同一折算60订单保留已购或耗尽材料。</p>
        <button ref={tradeEntry} className="secondary" onClick={() => setMarketTrade(true)}>接续询价与唯一成交</button>
      </section>}
      {isVisible(state, 2) && task.marketTrade.stage === 17 && <section className="bond-summary" aria-label="回族与房中准备接续">
        <b>成交离摊归档 · 接续回族准备</b><p>实际回族、分路、回房、锁门与摆材料分存，原已耗材料不补回。</p>
        <button ref={returnEntry} className="secondary" onClick={() => setMarketReturn(true)}>接续回族与房中准备</button>
      </section>}
      {isVisible(state, 2) && task.marketReturn.stage === 9 && <section className="bond-summary" aria-label="铁片辨认接续">
        <b>房中准备归档 · 接续铁片辨认</b><p>老师和本人分别操作，取出、接过、放下、拾回与收好分存，不把名称当作掌握。</p>
        <button ref={ironEntry} className="secondary" onClick={() => setIron(true)}>接续铁片辨认与限制</button>
      </section>}
      {isVisible(state, 2) && task.iron.stage === 18 && <section className="bond-summary" aria-label="主辅药调制接续">
        <b>铁片已归档 · 接续清水与主辅药</b><p>备水、白焰、三株主药与两株辅药依次保存，沿原材料账单次消耗。</p>
        <button ref={refiningEntry} className="secondary" onClick={() => setRefining(true)}>接续清水与主辅药调制</button>
      </section>}
      {isVisible(state, 2) && task.refining.stage >= 11 && <section className="bond-summary" aria-label="魔核入水接续">
        <b>主辅药已归档 · 接续魔核入水</b><p>魔核柔化、熄焰、否决口服、实际入水与期限分存，不重复领取材料。</p>
        <button ref={infusionEntry} className="secondary" onClick={() => setInfusion(true)}>接续魔核炼化与入水</button>
      </section>}
      {isVisible(state, 2) && task.refining.stage === 22 && <section className="bond-summary" aria-label="持续调息接续">
        <b>魔核入水已归档 · 接续当前一轮</b><p>坐定、手动调息与收束分存，两个月五段仅为预计。</p>
        <button ref={trainingEntry} className="secondary" onClick={() => setFirstTraining(true)}>接续当前一轮持续调息</button>
      </section>}
      {isVisible(state, 2) && task.firstTraining.stage >= 10 && <section className="bond-summary" aria-label="半月修炼接续">
        <b>当前一轮归档 · 半月回顾</b><p>当时四段、老师反应、药色与衣着分存。</p>
        <button ref={reviewEntry} className="secondary" onClick={() => setFirstReview(true)}>接续半月回顾与当时四段</button>
      </section>}
      {isVisible(state, 2) && task.firstTraining.stage === 17 && <section className="bond-summary" aria-label="首次铁片研究接续">
        <b>半月回顾归档 · 同一铁片研究</b><p>实际取片、研究回顾与本人感知分存。</p>
        <button ref={techniqueEntry} className="secondary" onClick={() => setFirstTechnique(true)}>接续同一铁片研究与感知</button>
      </section>}
      {isVisible(state, 2) && task.firstTechnique.stage >= 9 && <section className="bond-summary" aria-label="有限瓷瓶试招接续">
        <b>铁片研究归档 · 有限试招</b><p>留在床边面对瓷瓶，按当时功力记录转动、落离桌面与碎裂。</p>
        <button ref={bottleEntry} className="secondary" onClick={() => setFirstBottle(true)}>接续有限瓷瓶试招</button>
      </section>}
      {isVisible(state, 2) && task.firstTechnique.stage === 19 && <section className="bond-summary" aria-label="首次出门石路接续">
        <b>有限试招归档 · 本人出门</b><p>起身看戒、实际跨门、室外关门和进入石路分存。</p>
        <button ref={departureEntry} className="secondary" onClick={() => setFirstDeparture(true)}>接续实际出门与石路</button>
      </section>}
      <button ref={entry} className="secondary" onClick={() => setWalking(true)}>漫步往事准备路线</button>
      {isVisible(state, 3) && task.ceremonyVerdict.stage === 16 && <section className="bond-summary" aria-label="礼后接续">
        <b>成人礼离场已归档 · 接续五天后的安排</b><p>前往功法阁测定属性，分别记录本人、薰儿与实际入阁。已有斗技堂借卷保留。</p>
        <button ref={pavilionEntry} className="secondary" onClick={() => setPavilion(true)}>前往功法阁 · 属性测定与入阁</button>
      </section>}
      {isVisible(state, 3) && task.qiPavilionEntry.stage === 12 && <section className="bond-summary" aria-label="功法阁门障接续">
        <b>功法阁入阁已归档 · 火通道记录</b><p>沿第三支路核对三十七号与四十三号，再进行独立红幕测试。{task.qiPavilionScroll.family === 'held' ? '后续已取得家族卷，门障记录保留。' : '尚未取得卷轴。'}</p>
        <button ref={barrierEntry} className="secondary" onClick={() => setBarrier(true)}>进入火通道 · 四十三号门障</button>
      </section>}
      {isVisible(state, 3) && task.qiPavilionBarrier.stage === 10 && <section className="bond-summary" aria-label="功法阁卷轴保管接续">
        <b>四十三号房已入室 · {task.qiPavilionScroll.stage === 6 ? '简略保管已归档' : '卷轴保管待续'}</b><p>先保管唯一家族火属性卷，再分别记录薰儿的额外卷轴提议与婉拒。</p>
        <button ref={scrollEntry} className="secondary" onClick={() => setScroll(true)}>处理四十三号房卷轴</button>
      </section>}
      {isVisible(state, 3) && task.qiPavilionScroll.stage === 6 && <section className="bond-summary" aria-label="功法阁同行援助接续">
        <b>简略保管已归档 · 双卷交接回看</b><p>回看薰儿拿看同一卷、展示自己的支持卷、萧炎取回与婉拒，原结局记录保留。</p>
        <button ref={exchangeEntry} className="secondary" onClick={() => setExchange(true)}>回看双卷交接细节</button>
      </section>}
      {isVisible(state, 3) && task.qiPavilionExchange.stage === 8 && <section className="bond-summary" aria-label="功法阁独自援助接续">
        <b>双卷交接已核 · {task.qiPavilionAid.stage === 10 ? '同行援助已归档' : '接续同行与援助'}</b><p>薰儿另选卷、近时限与萧媚风属性房门，先经过再独自回返。</p>
        <button ref={aidEntry} className="secondary" onClick={() => setAid(true)}>进入同行与援助记录</button>
      </section>}
      {task.practice.phase === 4 && <p className="muted">初期尝试已归档。可在准备路线走近药老，接续前往斗技堂；堂内到访独立记录，正式传技另行继续。</p>}
      <section className="bond-summary" aria-label="重修准备记录">
        <b>{state.earlyTraining.started ? '准备单已记下' : '尚未接下准备'}</b>
        <p>两种指定草药，分别三株与两株；另需一枚一阶木属性魔核。药老负责调制，萧炎准备容器与水。药液用于修炼。</p>
        {!state.earlyTraining.started && <button className="primary" onClick={() => gameStore.beginEarlyTraining()}>记下重修准备</button>}
      </section>
      {task.started && <>
        <section className="bond-summary" aria-label="重修采购资金">
          <b>采购余额 {task.purse.borrowed - task.purse.spent} · 已付 {task.purse.spent}</b>
          <p>薰儿：先把准备做齐。这笔采购资金，我借给你。</p>
          <p className="muted">借资{EARLY_LOAN}、药草30/20、魔核及附物60均为游戏折算单位，不是原著金钱数额；不计入行囊金币，也不发主线奖励。</p>
          {!task.purse.borrowed && <button className="primary" onClick={() => gameStore.earlyTraining({ type: 'borrow', expectedSpent: task.purse.spent })}>向薰儿借采购资金</button>}
        </section>
        <section className="bond-summary" aria-label="药铺与坊市采购">
          <h3>{herbsReady ? '萧家坊市 · 寻找魔核' : '药铺 · 配齐药草'}</h3>
          <p>{herbsReady ? '药草已经齐备。萧炎与薰儿来到萧家坊市，在护卫照看的街道寻找一阶木属性魔核。' : '先按准备单买两种药草，两者可分别购买。买齐后，再去萧家坊市寻找指定魔核。'}</p>
          {(Object.keys(earlySupplies) as EarlySupplyId[]).filter(id => id !== 'woodCore' || herbsReady).map(id => {
            const item = earlySupplies[id]
            return <article className="recap-line" key={id}>
              <b>{item.label} · {item.price}采购资金</b>
              <p>{task.receipts[id] ? task.supplies[id] ? `已购入 · 任务袋${task.supplies[id]}` : '已购入并由老师使用 · 购买记录保留' : '由卖方交付到重修任务袋。普通行囊材料不能代替。'}</p>
              <button className="secondary" disabled={task.receipts[id] || task.purse.borrowed - task.purse.spent < item.price}
                onClick={() => gameStore.earlyTraining({ type: 'purchase', item: id, price: item.price, expectedSpent: task.purse.spent })}>
                {task.receipts[id] ? '已记购买记录' : `购买${item.label}`}
              </button>
            </article>
          })}
        </section>
        {herbsReady && <section className="bond-summary" aria-label="坊市往事与黑铁片">
          <span className="eyebrow">坊市往事 · {Math.min(task.market.stage + 1, 4)} / 4</span>
          <p className="muted">回顾采购中的交涉。已付款的魔核记录保留，这里核对同一笔交易的黑铁片附物。</p>
          {marketScene ? <>
            <h3>{marketScene.title}</h3><b>{marketScene.speaker}</b><p>{marketScene.text}</p>
            <button className="secondary" disabled={task.market.stage === 3 && !task.receipts.woodCore}
              onClick={() => gameStore.earlyTraining({ type: 'market', step: task.market.stage, expectedSpent: task.purse.spent })}>{marketScene.action}</button>
            {task.market.stage === 3 && !task.receipts.woodCore && <p className="muted">先在上方付清魔核采购订单，再核对附物。</p>}
          </> : <><h3>黑铁片已收好</h3><p>护卫介入后，争执告一段落。魔核和黑铁片来自同一次采购，萧炎带着物品回家，准备请药老辨认。</p><p>任务袋：黑铁片 ×{task.market.blackIron}</p></>}
          <p className="muted">这是对白与交互的压缩改编；也可从上方进入准备路线，在地点进行同一笔交易。黑铁片尚未化为玩家的战斗技能。</p>
        </section>}
        {task.market.stage === 4 && <section className="bond-summary" aria-label="药老调制与稀释">
          <span className="eyebrow">重修药液 · {Math.min(task.liquid.stage + 1, 6)} / 6</span>
          {liquidScene ? <>
            <h3>{liquidScene.title}</h3><b>{liquidScene.speaker}</b><p>{liquidScene.text}</p>
            <button className="secondary" onClick={() => gameStore.earlyTraining({ type: 'liquid',
              step: task.liquid.stage, operation: liquidScene.operation, expectedSpent: task.purse.spent })}>{liquidScene.action}</button>
          </> : <><h3>{task.recovery.energy === 'spent' ? '自用药液已耗尽' : task.recovery.energy === 'fading' ? '恢复中药色渐淡' : '修炼药液已备好'}</h3>
            <p>{task.recovery.energy === 'spent' ? '此前药老调制并加水的药液已用于恢复，现只余清水，后续需另筹材料。' : '药老已完成调制，药液加入水中。'}主药、辅药和魔核已依次使用，收据保留；黑铁片仍在任务袋中。</p></>}
          <p className="muted">玩家负责准备与观察，药老负责调制。药液不会进入口服丹药行囊；备好后可在下方进行初期练习。</p>
        </section>}
        <EarlyPractice state={state} onContinue={onContinue} />
        {task.receipts.woodCore && task.market.stage < 4 && <p className="muted">三种材料由任务袋保管。先完成坊市往事，带回黑铁片，再请药老调制；现在没有药液、丹药或新的修炼结果。</p>}
      </>}
    </>}
    <p className="muted">重修往事不会回退已完成主线，也不会重新发放章节奖励。</p>
  </>
}
