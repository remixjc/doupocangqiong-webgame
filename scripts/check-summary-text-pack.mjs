import fs from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import assert from 'node:assert/strict'
import {packSummaryTexts,summaryTextModules} from './pack-summary-texts.mjs'
export async function verifySummaryTexts(directory='dist') {
  const modules={},matches=[]
  const assets=await Promise.all((await fs.readdir(resolve(directory,'assets'))).filter(name=>name.endsWith('.js'))
    .map(async name=>[name,await fs.readFile(resolve(directory,'assets',name),'utf8')]))
  for (const file of summaryTextModules) {
    const source=await fs.readFile('src/'+file,'utf8'),packed=packSummaryTexts(source,resolve('src/'+file))
    assert(packed)
    const chunks=assets.filter(([,code])=>['"', "'", '`'].some(quote=>code.includes(quote+packed.payload+quote))).map(([name])=>name)
    assert(chunks.length>0,`Owned summary payload missing from production JS: ${file}`)
    modules[file]=packed.report;matches.push({file,chunks})
  }
  assert.deepEqual(JSON.parse(await fs.readFile(resolve(directory,'summary-text-pack-report.json'),'utf8')),modules)
  return {modules,matches}
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))
  verifySummaryTexts().then(result=>console.log(`Summary text pack verified: ${Object.keys(result.modules).length} complete owned modules`))
    .catch(error=>{console.error(error);process.exitCode=1})
