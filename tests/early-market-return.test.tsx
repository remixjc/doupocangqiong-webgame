import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { marketReturnAt, type MarketReturnState } from '../src/core/early-market-return-state'
import { marketTradeAt } from '../src/core/early-market-trade-state'
import { advanceEarlyMarketReturn, marketReturnPlaces, marketReturnStart, submitEarlyMarketReturn, type MarketReturnAction } from '../src/core/early-market-return'
import { marketReturnScenes } from '../src/content/early-market-return'
import { returnEligible, returnInput, returnStep } from './helpers/market-return-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { GameStore } from '../src/core/store'
import { earlyMarketReturnSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import EarlyMarketDiscovery from '../src/ui/EarlyMarketDiscovery'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('C1g-4d1 回族、分路、锁门和桌上材料历史', () => {
  it('9断点全存档槽/上一备份；只有新历史变化，旧账/物资/奖励/技能保持', async () => {
    let state = returnEligible(); const before = structuredClone(state)
    await saveSlot(0,state)
    while (state.earlyTraining.marketReturn.stage < 9) {
      const prior=state; state=returnStep(state);await saveSlot(0,state);await saveSlot(1,state)
      const slots=await listSlots()
      for(const slot of [0,1])expect(parseSave(slots.find(s=>s.slot===slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s=>s.slot===-1)!.text)).toEqual(prior)
      const compare=structuredClone(state);compare.earlyTraining.marketReturn=before.earlyTraining.marketReturn;expect(compare).toEqual(before)
      expect(state.earlyTraining.marketReturn).toEqual(marketReturnAt(state.earlyTraining.marketReturn.stage))
    }
  })
  it('0.53.1新订单/旧已购与耗尽迁移只补空，全部历史回补不恢复库存或液', () => {
    const fresh=returnEligible()
    const consumed=returnEligible(replayEarlyTraining(morningEligible(),false,undefined,true,true,true,true,true,true))
    expect(consumed.earlyTraining.supplies.woodCore).toBe(0)
    for(const input of [fresh,consumed]) {
      const old=JSON.parse(JSON.stringify(input));old.contentVersion='0.53.1';delete old.earlyTraining.marketReturn
      let state=validateState(old);expect(state).toEqual(input)
      while(state.earlyTraining.marketReturn.stage<9)state=returnStep(state)
      const compare=structuredClone(state);compare.earlyTraining.marketReturn=input.earlyTraining.marketReturn;expect(compare).toEqual(input)
    }
  })
  it('每一步完整任务/旧账快照与地点、演员、顺序/三错误/重复拒绝，未走到不签', () => {
    let state=returnEligible()
    while(state.earlyTraining.marketReturn.stage<9) {
      const task=state.earlyTraining.marketReturn,action=returnInput(state),p=marketReturnPlaces[marketReturnScenes[task.stage].place]
      for(const key of Object.keys(task) as (keyof MarketReturnState)[])
        expect(advanceEarlyMarketReturn(state,p,{...action,[key]:'stale'} as MarketReturnAction).state).toBe(state)
      for(const key of Object.keys(action.expectedLedger) as (keyof typeof action.expectedLedger)[])
        expect(advanceEarlyMarketReturn(state,p,{...action,expectedLedger:{...action.expectedLedger,[key]:'stale'}} as MarketReturnAction).state).toBe(state)
      for(const operation of ['restore','learn','refine'] as const)expect(advanceEarlyMarketReturn(state,p,{...action,operation}).state).toBe(state)
      expect(advanceEarlyMarketReturn(state,p,{...action,actor:'xuner'} as unknown as MarketReturnAction).state).toBe(state)
      for(const position of [{x:620,y:230},{x:380,y:100},{x:NaN,y:370},{x:800,y:370}])
        expect(advanceEarlyMarketReturn(state,position,action).state).toBe(state)
      if(task.stage===0||task.stage===1||task.stage===3)
        expect(advanceEarlyMarketReturn(state,marketReturnStart(task.stage),action).state).toBe(state)
      state=returnStep(state);expect(advanceEarlyMarketReturn(state,p,action).state).toBe(state)
    }
  })
  it('当前缺字段、所有派生篡改、坏阶段、成交前置交叉校验拒绝', () => {
    let state=returnEligible()
    const missing=JSON.parse(JSON.stringify(state));delete missing.earlyTraining.marketReturn;expect(()=>validateState(missing)).toThrow()
    for(;;) {
      expect(parseSave(serializeSave(state))).toEqual(state)
      for(const key of Object.keys(state.earlyTraining.marketReturn) as (keyof MarketReturnState)[])if(key!=='stage'){
        const bad=JSON.parse(JSON.stringify(state));bad.earlyTraining.marketReturn[key]=!bad.earlyTraining.marketReturn[key];expect(()=>validateState(bad)).toThrow()
      }
      if(state.earlyTraining.marketReturn.stage){
        const bad=structuredClone(state);bad.earlyTraining.marketTrade=marketTradeAt(16,'new-order');expect(()=>validateState(bad)).toThrow()
      }
      if(state.earlyTraining.marketReturn.stage===9)break
      state=returnStep(state)
    }
    for(const stage of [-1,10,.5,NaN,Infinity]){const bad=structuredClone(state);bad.earlyTraining.marketReturn.stage=stage;expect(()=>validateState(bad)).toThrow()}
  })
  it('分路后不画同行薰儿，锁门/老师/桌面不提前显示，防剧透1入口与摘要封存', () => {
    let state=returnEligible()
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state}/>)).toContain('接续回族与房中准备')
    for(;;){
      const t=state.earlyTraining.marketReturn,html=renderToStaticMarkup(<EarlyMarketDiscovery returning state={state} onBack={()=>{}}/>)
      expect(html.includes('aria-label="薰儿同行位置"')).toBe(!t.parted)
      expect(html.includes('aria-label="锁门转身后看见的老师"')).toBe(t.teacher)
      expect(html.includes('aria-label="当时材料桌面历史，旧耗材不补回"')).toBe(t.materials)
      if(t.stage===9)break
      state=returnStep(state)
    }
    const limited=structuredClone(state);limited.settings.spoiler='anime';limited.settings.animeLimit=1
    expect(renderToStaticMarkup(<EarlyMarketDiscovery returning state={limited} onBack={()=>{}}/>)).not.toMatch(/薰儿|材料|锁门|老师|黑铁/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited}/>)).not.toContain('接续回族与房中准备')
    expect(savePreviewSummary(state,limited.settings)).not.toMatch(/锁门|黑铁|摆桌/)
    expect(earlyMarketReturnSaveSummary(state,limited.settings)).toContain('封存')
    expect(advanceEarlyMarketReturn(limited,marketReturnPlaces.room,returnInput(limited)).state).toBe(limited)
  })
  it('桌上历史成功仅一写，完整原材料/药液与runtime保持，失败与双击零写', async () => {
    let state=returnEligible();while(state.earlyTraining.marketReturn.stage<6)state=returnStep(state)
    let writes=0
    const store=new GameStore({load:async()=>state,write:async saved=>{
      writes++;expect(saved.earlyTraining.marketReturn.materials).toBe(true)
      const compare=structuredClone(saved);compare.earlyTraining.marketReturn=state.earlyTraining.marketReturn;expect(compare).toEqual(state)
    }})
    await store.initialize();const runtime=store.getSnapshot().runtime,input=returnInput(state)
    expect(submitEarlyMarketReturn(store,marketReturnPlaces.gate,input)).toBe(false)
    expect(submitEarlyMarketReturn(store,marketReturnPlaces.room,input)).toBe(true)
    expect(submitEarlyMarketReturn(store,marketReturnPlaces.room,input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true);expect(writes).toBe(1);expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
