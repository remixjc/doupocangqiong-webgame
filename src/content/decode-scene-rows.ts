import LZString from 'lz-string'

// Build-owned literal rows only. This never reads a save or remote payload.
export function decodeSceneRows(payload: string): readonly (readonly (string | number | boolean)[])[] {
  const text = LZString.decompressFromBase64(payload)
  if (!text) throw new Error('Scene rows could not be decoded')
  return JSON.parse(text)
}
