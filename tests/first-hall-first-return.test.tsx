import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallApproach, submitFirstHallApproach } from '../src/core/first-hall-approach'
import { firstHallApproachAt } from '../src/core/first-hall-approach-state'
import { hallReadingPlaces } from '../src/core/first-hall-reading'
import { firstHallApproachInput } from './helpers/first-hall-approach-replay'
import { firstHallFirstReturnEligible, firstHallFirstReturnInput, firstHallFirstReturnStep } from './helpers/first-hall-first-return-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { firstHallApproachSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import FirstHallApproach from '../src/ui/FirstHallApproach'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import type { GameState } from '../src/core/model'

describe('C1h-3b2 同一第一卷实际归架', () => {
  let base: GameState
  beforeAll(()=>{base=firstHallFirstReturnEligible()})
  it('五断点四槽/备份，第18才原子归架hall6none，其他整state保持',async()=>{
    let state=structuredClone(base);await saveSlot(0,state)
    while(state.earlyTraining.firstHallApproach.stage<19){
      const previous=state,action=firstHallFirstReturnInput(state);state=firstHallFirstReturnStep(state)
      const stage=state.earlyTraining.firstHallApproach.stage
      expect(state.earlyTraining.hall).toEqual(stage>=18?{stage:6,scroll:'none'}:base.earlyTraining.hall)
      expect(state.earlyTraining.firstHallApproach.returnRecord).toBe(stage>=18?'current':'none')
      const same=structuredClone(state);same.earlyTraining.firstHallApproach=base.earlyTraining.firstHallApproach;same.earlyTraining.hall=base.earlyTraining.hall
      expect(same).toEqual(base)
      expect(advanceFirstHallApproach(state,hallReadingPlaces.shelf,'hall',action).state).toBe(state)
      for(const slot of [0,1,2,3])await saveSlot(slot,state)
      const slots=await listSlots();for(const slot of [0,1,2,3])expect(parseSave(slots.find(s=>s.slot===slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s=>s.slot===-1)!.text)).toEqual(previous)
      expect(renderToStaticMarkup(<FirstHallApproach continuation state={state} onBack={()=>{}} />).includes('同一第一卷实际放回书架')).toBe(stage>=18)
    }
    expect(firstHallApproachSaveSummary(state,state.settings)).toContain('第二卷待续')
    const original=renderToStaticMarkup(<FirstHallApproach state={state} onBack={()=>{}} />)
    expect(original).toContain('整衣靠近 14/14');expect(original).toContain('明确回顾当时第一卷')
    expect(advanceFirstHallApproach(state,hallReadingPlaces.shelf,'hall',firstHallApproachInput(state)).state).toBe(state)
  })
  it('旧0.69的14只补none，不补后段；新版本缺字段与旧版本伪造15+拒绝',()=>{
    for(const version of ['0.69.0','0.69.1']){
      const old=structuredClone(base) as unknown as {contentVersion:string;earlyTraining:{firstHallApproach:Record<string,unknown>}}
      old.contentVersion=version;delete old.earlyTraining.firstHallApproach.returnRecord
      expect(validateState(old)).toEqual(base)
      const forged=firstHallFirstReturnStep(base);forged.contentVersion=version
      expect(()=>validateState(forged)).toThrow('同一第一卷归架')
    }
    const missing=structuredClone(base) as unknown as {earlyTraining:{firstHallApproach:Record<string,unknown>}}
    delete missing.earlyTraining.firstHallApproach.returnRecord;expect(()=>validateState(missing)).toThrow()
    for(const stage of [14,15,16,17]){
      const bad=structuredClone(base);bad.earlyTraining.firstHallApproach=firstHallApproachAt(stage);bad.earlyTraining.hall={stage:6,scroll:'none'}
      expect(()=>validateState(bad)).toThrow()
    }
    const below=structuredClone(base);below.earlyTraining.firstHallApproach=firstHallApproachAt(18,'current');expect(()=>validateState(below)).toThrow()
    const wrong=structuredClone(below);wrong.earlyTraining.hall={stage:6,scroll:'reading-first'};expect(()=>validateState(wrong)).toThrow()
  })
  it('前段未归档、错人物/顺序/全快照、旧入口/第二卷并发拒绝',()=>{
    const incomplete=structuredClone(base);incomplete.earlyTraining.firstHallApproach=firstHallApproachAt(13)
    expect(advanceFirstHallApproach(incomplete,hallReadingPlaces.shelf,'hall',firstHallFirstReturnInput(incomplete)).state).toBe(incomplete)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={incomplete} />)).not.toContain('接续帮选交涉与同卷归架')
    let state=structuredClone(base)
    while(state.earlyTraining.firstHallApproach.stage<19){
      const action=firstHallFirstReturnInput(state)
      for(const field of ['expectedTalk','expectedReading','expectedMatch','expectedEntry','expectedMeeting','expectedDeparture','expectedTechnique','expectedTraining','expectedIron','expectedLedger','expectedPractice','expectedRecovery','expectedHall'] as const){
        expect(advanceFirstHallApproach(state,hallReadingPlaces.shelf,'hall',{...action,[field]:undefined}).state).toBe(state)
        for(const key of Object.keys(action[field]))expect(advanceFirstHallApproach(state,hallReadingPlaces.shelf,'hall',{...action,[field]:{...action[field],[key]:'stale'}}).state).toBe(state)
      }
      for(const operation of ['return','second','win','learn','leave','repay'])expect(advanceFirstHallApproach(state,hallReadingPlaces.shelf,'hall',{...action,operation}).state).toBe(state)
      expect(advanceFirstHallApproach(state,hallReadingPlaces.shelf,'hall',{...action,continuation:false}).state).toBe(state)
      expect(advanceFirstHallApproach(state,{x:235,y:244},'hall',action).state).toBe(state)
      expect(advanceFirstHallApproach(state,hallReadingPlaces.shelf,'outside',action).state).toBe(state)
      expect(advanceFirstHallApproach(state,hallReadingPlaces.shelf,'hall',{...action,actor:action.actor==='yan'?'ning':'yan'}).state).toBe(state)
      state=firstHallFirstReturnStep(state)
    }
  })
  it('旧hall6/7/8/9与spent五段显式recalled且整state仅历史改变',()=>{
    const branches=new Map<number,GameState>(),old=replayEarlyTraining(morningEligible(),false,s=>{
      if(s.earlyTraining.hall.stage>=6)branches.set(s.earlyTraining.hall.stage,structuredClone(s))
    },true,true,true,true,true,true)
    for(const input of [...[6,7,8,9].map(n=>firstHallFirstReturnEligible(branches.get(n)!)),firstHallFirstReturnEligible(old)]){
      let state=structuredClone(input);while(state.earlyTraining.firstHallApproach.stage<19)state=firstHallFirstReturnStep(state)
      expect(state.earlyTraining.firstHallApproach.returnRecord).toBe('recalled')
      const same=structuredClone(state);same.earlyTraining.firstHallApproach=input.earlyTraining.firstHallApproach;expect(same).toEqual(input)
      expect(renderToStaticMarkup(<FirstHallApproach continuation state={state} onBack={()=>{}} />)).toContain('明确回顾当时第一卷')
    }
  })
  it('actual18一次事务，旧hall动作并发拒绝，防剧透与临时卷保持',async()=>{
    let state=structuredClone(base);while(state.earlyTraining.firstHallApproach.stage<17)state=firstHallFirstReturnStep(state)
    let writes=0;const store=new GameStore({load:async()=>state,write:async saved=>{
      writes++;expect(saved.earlyTraining.firstHallApproach).toEqual(firstHallApproachAt(18,'current'))
      expect(saved.earlyTraining.hall).toEqual({stage:6,scroll:'none'});expect(validateState(saved)).toEqual(saved)
    }})
    await store.initialize();const action=firstHallFirstReturnInput(state),runtime=store.getSnapshot().runtime
    expect(submitFirstHallApproach(store,hallReadingPlaces.shelf,'hall',action)).toBe(true)
    expect(submitFirstHallApproach(store,hallReadingPlaces.shelf,'hall',action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true);expect(writes).toBe(1);expect(store.getSnapshot().runtime).toBe(runtime)
    expect(store.getSnapshot().state.earlyTraining.firstHallTalk.ownScroll).toBe('xuner')
    const hidden={...state.settings,spoiler:'anime' as const,animeLimit:1},sealed={...state,settings:hidden}
    expect(advanceFirstHallApproach(sealed,hallReadingPlaces.shelf,'hall',action).state).toBe(sealed)
    expect(savePreviewSummary(state,hidden)).not.toContain('同卷归架')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续帮选交涉与同卷归架')
  })
})
