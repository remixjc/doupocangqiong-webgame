// Build-owned LZ words, grouped as two 16-bit words in five printable digits.
// Alphabet excludes quotes, backslash and backtick so emitted literals need no escapes.
const alphabet = Array.from({ length: 94 }, (_, i) => String.fromCharCode(i + 33))
  .filter(char => !['"', "'", '\\', '`'].includes(char)).slice(0, 85).join('')

export function encodeSceneWords(words) {
  let result = words.length % 2 ? '1' : '0'
  for (let i = 0; i < words.length; i += 2) {
    let value = words[i] * 65536 + (words[i + 1] ?? 0), digits = ''
    for (let j = 0; j < 5; j++) {
      digits = alphabet[value % 85] + digits
      value = Math.floor(value / 85)
    }
    result += digits
  }
  return result
}

export function decodeSceneWords(payload) {
  const odd = payload[0] === '1', words = []
  if (!/^[01]/.test(payload) || (payload.length - 1) % 5 || odd && payload.length === 1)
    throw new Error('Invalid packed scene words')
  for (let i = 1; i < payload.length; i += 5) {
    let value = 0
    for (let j = 0; j < 5; j++) {
      const digit = alphabet.indexOf(payload[i + j])
      if (digit < 0) throw new Error('Invalid packed scene words')
      value = value * 85 + digit
    }
    if (value > 0xffffffff) throw new Error('Invalid packed scene words')
    words.push(Math.floor(value / 65536), value % 65536)
  }
  if (odd && words.pop() !== 0) throw new Error('Invalid packed scene words')
  return words
}
