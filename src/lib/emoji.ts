export type EmojiEntry = {
  emoji: string
  name: string
  nameHant: string
  englishName: string
  keywords: string[]
  appleKeywords?: [string, number][]
}

export type EmojiMatch = { entry: EmojiEntry; matchedTerm: string }

export function normalizeEmojiQuery(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[\uFE0E\uFE0F]/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/gu, ' ')
}

function compareRank(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return 0
}

export function createEmojiSearch(entries: EmojiEntry[]) {
  const seen = new Set<string>()
  const index = entries.flatMap((entry, order) => {
    const emoji = normalizeEmojiQuery(entry.emoji)
    if (seen.has(emoji)) return []
    seen.add(emoji)
    const terms = new Map<
      string,
      { display: string; name: boolean; weight: number }
    >()
    const add = (display: string, name = false, weight = 0) => {
      const text = normalizeEmojiQuery(display)
      if (!text) return
      const previous = terms.get(text)
      terms.set(text, {
        display,
        name: name || previous?.name || false,
        weight: Math.max(weight, previous?.weight || 0)
      })
    }
    for (const term of entry.keywords) add(term)
    // Apple's per-document relative weight breaks ties within a match tier.
    // This does not reproduce the private system search engine.
    const maxWeight = Math.max(
      1,
      ...(entry.appleKeywords || []).map(([, w]) => w)
    )
    for (const [term, weight] of entry.appleKeywords || [])
      add(term, false, weight / maxWeight)
    for (const name of [
      entry.name,
      entry.nameHant,
      entry.englishName,
      entry.emoji
    ])
      add(name, true)
    return [
      {
        entry,
        order,
        terms,
        variant: /[\u{1F3FB}-\u{1F3FF}]/u.test(entry.emoji) ? 1 : 0
      }
    ]
  })
  const byEmoji = new Map(
    index.map(({ entry }) => [normalizeEmojiQuery(entry.emoji), entry])
  )

  return (query: string): EmojiMatch[] => {
    const q = normalizeEmojiQuery(query)
    if (!q) return []
    const exactEmoji = byEmoji.get(q)
    if (exactEmoji)
      return [{ entry: exactEmoji, matchedTerm: exactEmoji.emoji }]
    const tokens = q.split(' ')
    const matches: {
      entry: EmojiEntry
      matchedTerm: string
      rank: number[]
    }[] = []
    for (const item of index) {
      let best: { display: string; rank: number[] } | undefined
      const tokenMatches = new Set<string>()
      for (const [text, term] of item.terms) {
        for (const token of tokens)
          if (text.includes(token)) tokenMatches.add(token)
        const tier =
          text === q
            ? term.name
              ? 0
              : 1
            : text.startsWith(q)
              ? 2
              : text.includes(q)
                ? 3
                : -1
        if (tier < 0) continue
        const rank = [
          tier,
          item.variant,
          -term.weight,
          text.length - q.length,
          item.order
        ]
        if (!best || compareRank(rank, best.rank) < 0)
          best = { display: term.display, rank }
      }
      if (best)
        matches.push({
          entry: item.entry,
          matchedTerm: best.display,
          rank: best.rank
        })
      else if (
        tokens.length > 1 &&
        tokens.every((token) => tokenMatches.has(token))
      ) {
        matches.push({
          entry: item.entry,
          matchedTerm: item.entry.name,
          rank: [4, item.variant, 0, 0, item.order]
        })
      }
    }
    matches.sort((a, b) => compareRank(a.rank, b.rank))
    return matches.map(({ entry, matchedTerm }) => ({ entry, matchedTerm }))
  }
}
