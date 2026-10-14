import { decompress, decompressFromBase64 } from './lz-base64'
import { decodeSceneWords } from './scene-radix85'

// Build-owned literal rows only. This never reads a save or remote payload.
export function decodeSceneRows(payload: string): readonly (readonly (string | number | boolean)[])[] {
  const text = decompressFromBase64(payload)
  if (!text) throw new Error('Scene rows could not be decoded')
  return JSON.parse(text)
}

export function decodeSceneRows85(payload: string): readonly (readonly (string | number | boolean)[])[] {
  const words = decodeSceneWords(payload)
  const text = decompress(words.length, 32768, index => words[index])
  if (!text) throw new Error('Scene rows could not be decoded')
  return JSON.parse(text)
}
