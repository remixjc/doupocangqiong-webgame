import { lazy, Suspense, useEffect, useRef, useState } from 'react'
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
const EarlyMarketBracelets = lazy(() => loadSceneModule(() => import('./EarlyMarketBracelets')))

export default function EarlyTrainingPanel({ state, onContinue }: { state: GameState; onContinue?: () => void }) {
  const blocked = earlyTrainingBlock(state)
  const [walking, setWalking] = useState(false)
  const [pavilion, setPavilion] = useState(false)
  const [barrier, setBarrier] = useState(false)
  const [scroll, setScroll] = useState(false)
  const [aid, setAid] = useState(false)
  const [exchange, setExchange] = useState(false)
  const [familyVisit, setFamilyVisit] = useState(false)
  const [familyCompensation, setFamilyCompensation] = useState(false)
  const [familyContract, setFamilyContract] = useState(false)
  const [mountainRing, setMountainRing] = useState(false)
  const [apprentice, setApprentice] = useState(false)
  const [methodDiscussion, setMethodDiscussion] = useState(false)
  const [preparationBrief, setPreparationBrief] = useState(false)
  const [mountainVisitor, setMountainVisitor] = useState(false)
  const [morningCard, setMorningCard] = useState(false)
  const [cityPharmacy, setCityPharmacy] = useState(false)
  const [marketEscort, setMarketEscort] = useState(false)
  const [marketSearch, setMarketSearch] = useState(false)
  const [marketBracelets, setMarketBracelets] = useState(false)
  const braceletsEntry = useRef<HTMLButtonElement>(null), returningBracelets = useRef(false)
  const searchEntry = useRef<HTMLButtonElement>(null), returningSearch = useRef(false)
  const escortEntry = useRef<HTMLButtonElement>(null), returningEscort = useRef(false)
  const cityEntry = useRef<HTMLButtonElement>(null), returningCity = useRef(false)
  const morningEntry = useRef<HTMLButtonElement>(null), returningMorning = useRef(false)
  const visitorEntry = useRef<HTMLButtonElement>(null), returningVisitor = useRef(false)
  const briefEntry = useRef<HTMLButtonElement>(null), returningBrief = useRef(false)
  const methodEntry = useRef<HTMLButtonElement>(null), returningMethod = useRef(false)
  const apprenticeEntry = useRef<HTMLButtonElement>(null), returningApprentice = useRef(false)
  const mountainRingEntry = useRef<HTMLButtonElement>(null), returningMountainRing = useRef(false)
  const contractEntry = useRef<HTMLButtonElement>(null), returningContract = useRef(false)
  const compensationEntry = useRef<HTMLButtonElement>(null), returningCompensation = useRef(false)
  const familyVisitEntry = useRef<HTMLButtonElement>(null), returningFamilyVisit = useRef(false)
  const scrollEntry = useRef<HTMLButtonElement>(null), aidEntry = useRef<HTMLButtonElement>(null), exchangeEntry = useRef<HTMLButtonElement>(null)
  const returningScroll = useRef(false), returningAid = useRef(false), returningExchange = useRef(false)
  const pavilionEntry = useRef<HTMLButtonElement>(null)
  const returningPavilion = useRef(false)
  const barrierEntry = useRef<HTMLButtonElement>(null)
  const returningBarrier = useRef(false)
  const entry = useRef<HTMLButtonElement>(null)
  const returning = useRef(false)
  useEffect(() => {
    if (!walking && returning.current) { returning.current = false; entry.current?.focus() }
  }, [walking])
  useEffect(() => {
    if (!pavilion && returningPavilion.current) { returningPavilion.current = false; pavilionEntry.current?.focus() }
  }, [pavilion])
  useEffect(() => {
    if (!barrier && returningBarrier.current) { returningBarrier.current = false; barrierEntry.current?.focus() }
  }, [barrier])
  useEffect(() => { if (!scroll && returningScroll.current) { returningScroll.current = false; scrollEntry.current?.focus() } }, [scroll])
  useEffect(() => { if (!exchange && returningExchange.current) { returningExchange.current = false; exchangeEntry.current?.focus() } }, [exchange])
  useEffect(() => { if (!aid && returningAid.current) { returningAid.current = false; aidEntry.current?.focus() } }, [aid])
  useEffect(() => { if (!familyVisit && returningFamilyVisit.current) { returningFamilyVisit.current = false; familyVisitEntry.current?.focus() } }, [familyVisit])
  useEffect(() => { if (!familyCompensation && returningCompensation.current) { returningCompensation.current = false; compensationEntry.current?.focus() } }, [familyCompensation])
  useEffect(() => { if (!familyContract && returningContract.current) { returningContract.current = false; contractEntry.current?.focus() } }, [familyContract])
  useEffect(() => { if (!mountainRing && returningMountainRing.current) { returningMountainRing.current = false; mountainRingEntry.current?.focus() } }, [mountainRing])
  useEffect(() => { if (!apprentice && returningApprentice.current) { returningApprentice.current = false; apprenticeEntry.current?.focus() } }, [apprentice])
  useEffect(() => { if (!methodDiscussion && returningMethod.current) { returningMethod.current = false; methodEntry.current?.focus() } }, [methodDiscussion])
  useEffect(() => { if (!preparationBrief && returningBrief.current) { returningBrief.current = false; briefEntry.current?.focus() } }, [preparationBrief])
  useEffect(() => { if (!mountainVisitor && returningVisitor.current) { returningVisitor.current = false; visitorEntry.current?.focus() } }, [mountainVisitor])
  useEffect(() => { if (!morningCard && returningMorning.current) { returningMorning.current = false; morningEntry.current?.focus() } }, [morningCard])
  useEffect(() => { if (!cityPharmacy && returningCity.current) { returningCity.current = false; cityEntry.current?.focus() } }, [cityPharmacy])
  useEffect(() => { if (!marketEscort && returningEscort.current) { returningEscort.current = false; escortEntry.current?.focus() } }, [marketEscort])
  useEffect(() => { if (!marketSearch && returningSearch.current) { returningSearch.current = false; searchEntry.current?.focus() } }, [marketSearch])
  useEffect(() => { if (!marketBracelets && returningBracelets.current) { returningBracelets.current = false; braceletsEntry.current?.focus() } }, [marketBracelets])
  const task = state.earlyTraining
  const herbsReady = task.receipts.bluegrass && task.receipts.boneflower
  const marketScene = earlyMarketScenes[task.market.stage]
  const liquidScene = earlyLiquidScenes[task.liquid.stage]
  if (marketBracelets) return <Suspense fallback={<p role="status">正在接续让路与两条手链……</p>}><EarlyMarketBracelets state={state}
    onBack={() => { returningBracelets.current = true; setMarketBracelets(false) }} /></Suspense>
  if (marketSearch) return <Suspense fallback={<p role="status">正在接续寻核与手链摊……</p>}><EarlyMarketSearch state={state}
    onBack={() => { returningSearch.current = true; setMarketSearch(false) }} /></Suspense>
  if (marketEscort) return <Suspense fallback={<p role="status">正在接续南坊与巡卫……</p>}><EarlyMarketEscort state={state}
    onBack={() => { returningEscort.current = true; setMarketEscort(false) }} /></Suspense>
  if (cityPharmacy) return <Suspense fallback={<p role="status">正在接续实际同行与药铺采购……</p>}><EarlyCityPharmacy state={state}
    onBack={() => { returningCity.current = true; setCityPharmacy(false) }} onRoute={() => { setCityPharmacy(false); setWalking(true) }} /></Suspense>
  if (morningCard) return <Suspense fallback={<p role="status">正在接续晨间普通黑卡交接……</p>}><EarlyMorningCard state={state}
    onBack={() => { returningMorning.current = true; setMorningCard(false) }} onRoute={() => { setMorningCard(false); setWalking(true) }} /></Suspense>
  if (mountainVisitor) return <Suspense fallback={<p role="status">正在接续当晚来访与借资问答……</p>}><EarlyMountainVisitor state={state} onBack={() => { returningVisitor.current = true; setMountainVisitor(false) }} /></Suspense>
  if (preparationBrief) return <Suspense fallback={<p role="status">正在接续准备说明与老师返戒……</p>}><EarlyPreparationBrief state={state}
    onBack={() => { returningBrief.current = true; setPreparationBrief(false) }}
    onRoute={() => { setPreparationBrief(false); setWalking(true) }} /></Suspense>
  if (methodDiscussion) return <Suspense fallback={<p role="status">正在打开青石前的功法说明……</p>}><EarlyMethodDiscussion state={state} onBack={() => { returningMethod.current = true; setMethodDiscussion(false) }} /></Suspense>
  if (apprentice) return <Suspense fallback={<p role="status">正在接续援助交涉与本人拜师……</p>}><EarlyApprentice state={state} onBack={() => { returningApprentice.current = true; setApprentice(false) }} /></Suspense>
  if (mountainRing) return <Suspense fallback={<p role="status">正在走上后山，察看古戒……</p>}><EarlyMountainRing state={state} onBack={() => { returningMountainRing.current = true; setMountainRing(false) }} /></Suspense>
  if (familyContract) return <Suspense fallback={<p role="status">正在接续文书与双方离厅……</p>}><EarlyFamilyContract state={state} onBack={() => { returningContract.current = true; setFamilyContract(false) }} /></Suspense>
  if (familyCompensation) return <Suspense fallback={<p role="status">正在接续补偿与本人发言……</p>}><EarlyFamilyCompensation state={state} onBack={() => { returningCompensation.current = true; setFamilyCompensation(false) }} /></Suspense>
  if (familyVisit) return <Suspense fallback={<p role="status">正在回到拜师前的接待厅……</p>}><EarlyFamilyVisit state={state} onBack={() => { returningFamilyVisit.current = true; setFamilyVisit(false) }} /></Suspense>
  if (barrier) return <Suspense fallback={<p role="status">正在进入火通道与四十三号门障……</p>}><EarlyQiBarrier state={state} onBack={() => { returningBarrier.current = true; setBarrier(false) }} /></Suspense>
  if (scroll) return <Suspense fallback={<p role="status">正在打开卷轴保管记录……</p>}><EarlyQiScroll state={state} onBack={() => { returningScroll.current = true; setScroll(false) }} /></Suspense>
  if (exchange) return <Suspense fallback={<p role="status">正在回看双卷交接……</p>}><EarlyQiExchange state={state} onBack={() => { returningExchange.current = true; setExchange(false) }} /></Suspense>
  if (aid) return <Suspense fallback={<p role="status">正在打开同行与援助记录……</p>}><EarlyQiAid state={state} onBack={() => { returningAid.current = true; setAid(false) }} /></Suspense>
  if (pavilion) return <Suspense fallback={<p role="status">正在前往五天后的功法阁……</p>}><EarlyQiPavilion state={state} onBack={() => { returningPavilion.current = true; setPavilion(false) }} /></Suspense>
  if (walking && !blocked) return <EarlyWalk state={state} onContinue={onContinue} onBack={() => { returning.current = true; setWalking(false) }} />
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
