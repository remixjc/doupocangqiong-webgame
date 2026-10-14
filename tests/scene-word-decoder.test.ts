import { describe, expect, it } from 'vitest'
import LZString from 'lz-string'
import { encodeSceneWords, decodeSceneWords } from '../src/content/scene-radix85'
import { decompress } from '../src/content/lz-base64'
import { decodeSceneRows85 } from '../src/content/decode-scene-rows'

function wordsOf(text: string) {
  return text.split('').map(char => char.charCodeAt(0))
}

describe('自有场景16位压缩字的无转义编码', () => {
  it('完整16位范围、代理对字值、32位边界、奇偶尾组全部无损且无JS转义字符', () => {
    const samples = [[], [0], [65535], [0, 0], [65535, 65535], [0xd800, 0xdc00, 1],
      Array.from({ length: 65536 }, (_, i) => i)]
    for (const words of samples) {
      const payload = encodeSceneWords(words)
      expect(payload).not.toMatch(/["'\\`\s]/)
      expect(decodeSceneWords(payload)).toEqual(words)
      expect(encodeSceneWords(decodeSceneWords(payload))).toBe(payload)
    }
  })
  it('沿固定上游原算法还原所有UTF16、Unicode、长重复与确定性随机压缩文本', () => {
    const texts = ['', '先拿物再离房。', '\0\u2028\u2029😀𠮷', '同一白玉瓶'.repeat(20000),
      String.fromCharCode(...Array.from({ length: 65536 }, (_, i) => i))]
    let seed = 91321
    for (let length = 0; length < 512; length++) {
      texts.push(Array.from({ length }, () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        return String.fromCharCode(seed & 65535)
      }).join(''))
    }
    for (const text of texts) {
      const compressed = LZString.compress(text), words = decodeSceneWords(encodeSceneWords(wordsOf(compressed)))
      expect(words).toEqual(wordsOf(compressed))
      expect(decompress(words.length, 32768, i => words[i])).toBe(text)
      expect(LZString.decompress(words.map(word => String.fromCharCode(word)).join(''))).toBe(text)
    }
  })
  it('错误字符、截断、溢出、非零补字拒绝；行解析与原JSON内容一致', () => {
    const rows = [['yan', true, 900, '取物'], ['teacher', false, 0, '古戒声']]
    expect(decodeSceneRows85(encodeSceneWords(wordsOf(LZString.compress(JSON.stringify(rows)))))).toEqual(rows)
    for (const payload of ['', '2', '1', '0!', '0~~~~~', '0yyyyy', '0"""""', '0\\\\\\\\\\',
      '1!!!!#', '0     ']) expect(() => decodeSceneWords(payload)).toThrow('Invalid packed scene words')
    expect(() => decodeSceneRows85('0')).toThrow()
    expect(() => decodeSceneRows85(encodeSceneWords(wordsOf(LZString.compress('unparseable'))))).toThrow()
  })
})
