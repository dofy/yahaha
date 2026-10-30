/** Match case-insensitive, non-contiguous characters in a font name. */
export function matchesFont(name: string, query: string): boolean {
  const needle = query.toLowerCase().replace(/\s+/gu, '')
  const haystack = name.toLowerCase().replace(/\s+/gu, '')
  let index = 0
  for (const char of haystack) {
    if (char === needle[index]) index += 1
    if (index === needle.length) return true
  }
  return needle.length === 0
}

/** Keep line breaks while replacing unsupported characters with placeholders. */
export function normalizeAsciiInput(text: string): string {
  return text.replace(/\r\n?/gu, '\n').replace(/[^\x20-\x7e\n]/gu, '?')
}

export function availableFonts(fonts: string[], used: string[]): string[] {
  const selected = new Set(used)
  return fonts.filter((font) => !selected.has(font))
}
