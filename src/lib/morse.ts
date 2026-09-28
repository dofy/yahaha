import morseData from '../data/morse.json' with { type: 'json' }

const alphabet: Record<string, string> = morseData
const reverse = new Map(
  Object.entries(alphabet)
    .filter(([letter]) => letter !== ' ')
    .map(([letter, code]) => [code, letter])
)

export type MorseResult = { output: string; unsupported: string[] }

/** Letters use one space; words use a slash. Unknown input stays visible. */
export function encodeMorse(text: string): MorseResult {
  const unsupported = new Set<string>()
  const output = text
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .map((word) =>
      Array.from(word)
        .map((letter) => {
          const code = alphabet[letter.toUpperCase()]
          if (code) return code
          unsupported.add(letter)
          return '?'
        })
        .join(' ')
    )
    .join(' / ')
  return { output, unsupported: [...unsupported] }
}

/** Accept slash-separated words and the conventional three-space separator. */
export function decodeMorse(code: string): MorseResult {
  const unsupported = new Set<string>()
  const normalized = code.trim().replace(/[·•]/gu, '.').replace(/[−–—]/gu, '-')
  const output = normalized
    .split(/\s*\/\s*|\s{3,}/u)
    .filter(Boolean)
    .map((word) =>
      word
        .trim()
        .split(/\s+/u)
        .map((token) => {
          const letter = reverse.get(token)
          if (letter) return letter
          unsupported.add(token)
          return '?'
        })
        .join('')
    )
    .join(' ')
  return { output, unsupported: [...unsupported] }
}
