import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {resolve} from 'node:path'
import {createServer} from 'vite'
import LZString from 'lz-string'
import {parseAst} from 'rolldown/parseAst'
import {packSummaryTexts} from './pack-summary-texts.mjs'
import {decodeSceneWords} from '../src/content/scene-radix85.js'
const id='/project/src/core/save-preview.ts'
const long='当前历史未归档，保留原有材料、款项与同一人物。\n'.repeat(30)
test('owned AST text packing preserves quotes, comments, Unicode and runtime literal ordering',()=>{
  const source=`// '注释不压缩'\nconst a=${JSON.stringify(long)};const b='quote\\'中\\u6587\\\\';const c=\`模板中文 \${a}\`;export const value=[a,b,${JSON.stringify(long)}]`
  const packed=packSummaryTexts(source,id);assert(packed)
  const text=LZString.decompress(decodeSceneWords(packed.payload).map(w=>String.fromCharCode(w)).join(''))
  assert.deepEqual(JSON.parse(text),[[long],["quote'中文\\"]])
  assert(packed.code.includes('// \'注释不压缩\''))
  assert(packed.code.includes('`模板中文 ${a}`'))
  assert.equal(packed.report.literals,3);assert.equal(packed.report.rows,2)
  assert.equal(packSummaryTexts(source,'/project/src/core/store.ts'),null)
  assert.equal(packSummaryTexts("const small='中文';",id),null)
})
test('syntax errors, identifier collision, module/type strings and literal property keys fail closed',()=>{
  for(const source of ["const a='未结束","const __st=1;const a='中文'","import a from '中文'","type T='中文'","const o={'中文':1}"])
    assert.throws(()=>packSummaryTexts(source,id))
})
test('entire packed chapter exports and summary function branches equal readable originals',async()=>{
  // SSR proof servers do not serve browser dependencies. Parallel optimizer
  // workers otherwise race to rename the shared .vite/deps cache on Windows.
  const options={configFile:false,optimizeDeps:{noDiscovery:true,include:[]},
    server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'}
  const plain=await createServer(options),packed=await createServer({...options,plugins:[{name:'production-owned-summary-transform',enforce:'pre',
    transform(source,id){const result=packSummaryTexts(source,id);return result?{code:result.code,map:null}:null}}]})
  try{
    const a=await packed.ssrLoadModule('/src/content/chapters.ts'),b=await plain.ssrLoadModule('/src/content/chapters.ts')
    assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort())
    for(const key of Object.keys(b)){
      if(typeof b[key]==='function'){
        assert.equal(key,'chapterById')
        for(let id=-1;id<=30;id++){
          const call=fn=>{try{return {value:fn(id)}}catch(error){return {error:{name:error.name,message:error.message}}}}
          assert.deepEqual(call(a[key]),call(b[key]))
        }
      }else assert.deepEqual(a[key],b[key])
    }
    const packedEvents=await packed.ssrLoadModule('/src/content/events.ts'),plainEvents=await plain.ssrLoadModule('/src/content/events.ts')
    const packedStory=await packed.ssrLoadModule('/src/content/story.ts'),plainStory=await plain.ssrLoadModule('/src/content/story.ts')
    assert.deepEqual(packedStory,plainStory)
    assert.deepEqual(Object.keys(packedEvents).sort(),Object.keys(plainEvents).sort())
    for(const key of Object.keys(plainEvents))if(typeof plainEvents[key]!=='function')assert.deepEqual(packedEvents[key],plainEvents[key])
    for(let chapter=-1;chapter<=30;chapter++){
      assert.deepEqual(packedEvents.eventForChapter(chapter),plainEvents.eventForChapter(chapter))
      const events=plainEvents.eventsForChapter(chapter)
      assert.deepEqual(packedEvents.eventsForChapter(chapter),events)
      for(const id of [undefined,'missing-event',...events.map(event=>event.id)])
        assert.deepEqual(packedEvents.findEvent(chapter,id),plainEvents.findEvent(chapter,id))
      for(const event of events)assert.deepEqual(packedEvents.mindTargets(event),plainEvents.mindTargets(event))
    }
    assert.deepEqual(packedEvents.mindTargets({mindTargets:[.2,.9]}),plainEvents.mindTargets({mindTargets:[.2,.9]}))
    for(let step=-10;step<=100;step++)assert.deepEqual(packedEvents.tournamentRound(step),plainEvents.tournamentRound(step))
    const next=await packed.ssrLoadModule('/src/core/save-preview.ts'),old=await plain.ssrLoadModule('/src/core/save-preview.ts')
    assert.deepEqual(Object.keys(next).sort(),Object.keys(old).sort())
    const {initialState}=await plain.ssrLoadModule('/src/core/model.ts'),base=initialState()
    base.completed=[1,2,3];base.earlyTraining.started=true
    const keys=Object.keys(old).filter(k=>k!=='compactSaveSummaries')
    const settings=[base.settings,{...base.settings,spoiler:'anime',animeLimit:1},{...base.settings,spoiler:'anime',animeLimit:2},{...base.settings,spoiler:'anime',animeLimit:3}]
    function compare(state){
      for(const viewing of settings)for(const key of keys)assert.deepEqual(next[key](state,viewing),old[key](state,viewing),key)
    }
    compare(base)
    // Full thresholds and follow-on-stage interactions, including recursive summaries.
    for(let stage=0;stage<=50;stage++){
      const state=structuredClone(base)
      for(const t of Object.values(state.earlyTraining))if(t&&typeof t==='object'&&'stage'in t)t.stage=stage
      compare(state)
    }
    const source=await fs.readFile('src/core/save-preview.ts','utf8'),tree=parseAst(source,{lang:'ts'}),literals=new Set()
    function visit(node){
      if(node.type==='Literal'&&typeof node.value==='string'&&!/[\u3400-\u9fff]/.test(node.value))literals.add(node.value)
      for(const value of Object.values(node))if(Array.isArray(value)){for(const child of value)if(child?.type)visit(child)}else if(value?.type)visit(value)
    }
    visit(tree)
    // Enumerate declared state fields with all enum literals used by the summaries.
    for(const [taskName,task] of Object.entries(base.earlyTraining)){
      if(!task||typeof task!=='object')continue
      for(const [field,value] of Object.entries(task)){
        if(typeof value!=='string'&&typeof value!=='boolean')continue
        for(const candidate of typeof value==='boolean'?[false,true]:[...literals]){
          const state=structuredClone(base);state.earlyTraining[taskName][field]=candidate;compare(state)
        }
      }
    }
    for(const input of [[],['中文'],['中文','中文','中文续段'],['甲','乙'],['药液','同一药液归档','归档']])
      assert.equal(next.compactSaveSummaries(input),old.compactSaveSummaries(input))
  }finally{await plain.close();await packed.close()}
})
