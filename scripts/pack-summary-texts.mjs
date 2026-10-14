import { parseAst } from 'rolldown/parseAst'
import LZString from 'lz-string'
import { createHash } from 'node:crypto'
import { encodeSceneWords, decodeSceneWords } from '../src/content/scene-radix85.js'

export const summaryTextModules = ['core/save-preview.ts', 'content/chapters.ts']
// Two explicit owned modules; leave readable source, templates and control flow intact.
// Never parse saves or remote text. Use AST token boundaries, not source regexes.
export function packSummaryTexts(source, id) {
  const module = summaryTextModules.find(file=>id.replaceAll('\\', '/').endsWith('/src/'+file))
  if (!module) return null
  const tree = parseAst(source,{lang:'ts'},id)
  if (/\b__st\b/.test(source)) throw new Error('Summary pool identifier collision')
  const rows = [], edits = []
  function visit(node,parent) {
    if (node.type==='Literal' && typeof node.value==='string' && /[\u3400-\u9fff]/.test(node.value)) {
      if (parent?.type==='ImportDeclaration' || parent?.type==='ExportNamedDeclaration' || parent?.type==='TSLiteralType'
        || ['Property','PropertyDefinition','MethodDefinition'].includes(parent?.type) && parent.key===node)
        throw new Error('Summary literal is not a runtime value')
      let index = rows.findIndex(row => row[0] === node.value)
      if (index < 0) { index = rows.length; rows.push([node.value]) }
      edits.push({ start:node.start, end:node.end, replacement:`__st[${index}]` })
    }
    for (const value of Object.values(node))
      if (Array.isArray(value)) { for (const child of value) if (child?.type) visit(child,node) }
      else if (value?.type) visit(value,node)
  }
  visit(tree)
  if (!rows.length) return null
  const json = JSON.stringify(rows), compressed = LZString.compress(json)
  const payload = encodeSceneWords(compressed.split('').map(char => char.charCodeAt(0)))
  if (LZString.decompress(decodeSceneWords(payload).map(word => String.fromCharCode(word)).join('')) !== json)
    throw new Error('Summary text roundtrip failed')
  let code = source
  for (const edit of edits.sort((a,b)=>b.start-a.start)) code = code.slice(0,edit.start)+edit.replacement+code.slice(edit.end)
  const decoder = module.startsWith('core/') ? '../content/decode-scene-rows' : './decode-scene-rows'
  code = `import { decodeSceneRows85 } from '${decoder}'\nconst __st = decodeSceneRows85(${JSON.stringify(payload)}).map(row=>row[0])\n`+code
  if (Buffer.byteLength(source)-Buffer.byteLength(code)<300) return null
  return { code, payload, rows, module, report:{ encoding:'lz-string-1.5.0-words-radix85', literals:edits.length, rows:rows.length,
    sourceBytes:Buffer.byteLength(source), packedBytes:Buffer.byteLength(code),
    sha256:createHash('sha256').update(json).digest('hex') } }
}

export function packedSummaryTextsPlugin() {
  const modules = new Map()
  return { name:'pack-owned-summary-runtime-literals', apply:'build', enforce:'pre',
    buildStart() { modules.clear() },
    transform(source,id) {
      const packed=packSummaryTexts(source,id)
      if (!packed) return null
      modules.set(packed.module,packed.report)
      return {code:packed.code,map:null}
    },
    generateBundle() {
      if (modules.size!==summaryTextModules.length) this.error('Owned summary literals were not packed')
      this.emitFile({type:'asset',fileName:'summary-text-pack-report.json',source:JSON.stringify(Object.fromEntries([...modules].sort()),null,2)+'\n'})
    },
  }
}
