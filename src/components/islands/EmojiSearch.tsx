import * as React from 'react'
import { Search } from 'lucide-react'
import emojiListData from '@/data/emoji/emoji.json'
import keyListData from '@/data/emoji/key.json'
import type { ArrayDict } from '@/types'
import { Input } from '@/components/ui/input'

const keyList = keyListData as ArrayDict
const emojiList = emojiListData as ArrayDict
const allData: ArrayDict = { ...keyList, ...emojiList }

export default function EmojiSearch() {
  const [query, setQuery] = React.useState('')

  const entries = React.useMemo(() => {
    const q = query.trim()
    if (!q) return []
    return Object.keys(allData)
      .filter((key) => key.includes(q))
      .slice(0, 200)
      .map((key) => [key, allData[key]] as const)
  }, [query])

  return (
    <div className="mt-8">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          autoFocus
          placeholder="Search key or emoji…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {query.trim() && (
        <ul className="mt-6 space-y-2">
          {entries.length ? (
            entries.map(([key, vals]) => (
              <li
                key={key}
                className="flex flex-wrap items-baseline gap-x-2 border-b border-border/60 pb-2 text-sm"
              >
                <span className="font-mono text-base text-foreground">
                  {key}
                </span>
                <span className="text-muted-foreground">
                  {vals.join(', ')}
                </span>
              </li>
            ))
          ) : (
            <li className="font-mono text-sm text-muted-foreground">
              No match.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
