import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import LZString from 'lz-string'
import { decompressFromBase64 } from '../src/content/lz-base64'
import { decodeSceneRows } from '../src/content/decode-scene-rows'

describe('场景专用Base64解码器与固定上游算法相等', () => {
  it('算法体逐字来自已固定1.5.0包且包含完整许可与版权，删去未用压缩/其他编码API', () => {
    const upstream = readFileSync('node_modules/lz-string/libs/lz-string.js','utf8')
    const current = readFileSync('src/content/lz-base64.js','utf8')
    const start = upstream.indexOf('  _decompress: function ('), end = upstream.indexOf('\n};\n  return LZString;',start)
    expect(current).toContain(upstream.slice(start,end).replace('  _decompress: function (','function decompress('))
    expect(current).toContain(readFileSync('node_modules/lz-string/LICENSE','utf8').trim())
    expect(current).toContain('Copyright (c) 2013 Pieroxy')
    expect(current).not.toContain('_compress')
    expect(JSON.parse(readFileSync('node_modules/lz-string/package.json','utf8')).version).toBe('1.5.0')
  })
  it('空值、字典扩展、重复词、所有UTF16单元及多类Unicode与上游完整相等', () => {
    const examples = ['', 'aaaaaaa', 'abababab', '先走到床边。', '药老 · 古戒\\n\\t"房中"', '😀𠮷', '\0\u0001\u2028\u2029',
      String.fromCharCode(...Array.from({length:65536},(_,i)=>i)), '一'.repeat(100000)]
    for (const input of examples) {
      const packed = LZString.compressToBase64(input)
      expect(decompressFromBase64(packed)).toBe(input)
      expect(decompressFromBase64(packed)).toBe(LZString.decompressFromBase64(packed))
    }
    for (const input of [null,undefined,'']) expect(decompressFromBase64(input)).toBe(LZString.decompressFromBase64(input as string))
    let seed = 47391
    for (let count=0;count<512;count++) {
      const input = Array.from({length:count},() => {
        seed = (Math.imul(seed,1664525)+1013904223)>>>0
        return String.fromCharCode(seed&65535)
      }).join('')
      expect(decompressFromBase64(LZString.compressToBase64(input))).toBe(input)
    }
  })
  it('58场景的调用边界和非法/截短解码返回沿上游，空或无效行继续报错', () => {
    const packed = LZString.compressToBase64(JSON.stringify([['yan',true,0,'同一古戒'],['teacher',false,900,'幼株弱效']]))
    expect(decodeSceneRows(packed)).toEqual([['yan',true,0,'同一古戒'],['teacher',false,900,'幼株弱效']])
    const cases = ['!','~','null',' ','++++','====',...Array.from({length:packed.length},(_,i)=>packed.slice(0,i)),
      ...Array.from({length:packed.length},(_,i)=>packed.slice(0,i)+'!'+packed.slice(i+1))]
    for (const input of cases) expect(decompressFromBase64(input)).toBe(LZString.decompressFromBase64(input))
    expect(() => decodeSceneRows('')).toThrow('Scene rows could not be decoded')
    expect(() => decodeSceneRows(LZString.compressToBase64('unparseable'))).toThrow()
  })
})
