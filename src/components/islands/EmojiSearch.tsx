import * as React from 'react'
import { Check, Copy, Search, X } from 'lucide-react'
import catalogueUrl from '@/data/emoji/catalogue.json?url'
import {
  createEmojiSearch,
  type EmojiEntry,
  type EmojiMatch
} from '@/lib/emoji'
import { useClipboard } from '@/lib/useClipboard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const PAGE_SIZE = 60
const examples = ['开心', '收到', '粉心', '浴火重生']

function EmojiCandidate({ entry, matchedTerm }: EmojiMatch) {
  const { copied, error, doCopy } = useClipboard(entry.emoji)
  return (
    <li className='min-w-0'>
      <button
        type='button'
        onClick={doCopy}
        aria-label={`Copy ${entry.emoji} ${entry.name}`}
        className='tx flex min-h-20 w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left hover:bg-mint-wash focus-visible:outline-2 focus-visible:outline-ring'
      >
        <span aria-hidden='true' className='w-12 shrink-0 text-center text-3xl'>
          {entry.emoji}
        </span>
        <span className='min-w-0 flex-1'>
          <span
            lang='zh-Hans'
            className='block break-words text-sm font-semibold text-foreground'
          >
            {entry.name}
          </span>
          <span className='mt-1 block break-words text-xs text-muted-foreground'>
            {copied
              ? 'Copied'
              : error
                ? 'Could not copy. Select the emoji and copy it manually.'
                : matchedTerm !== entry.name
                  ? matchedTerm
                  : entry.nameHant}
          </span>
        </span>
        {copied ? (
          <Check
            aria-hidden='true'
            className='size-4 shrink-0 text-accent-text'
          />
        ) : (
          <Copy
            aria-hidden='true'
            className='size-4 shrink-0 text-muted-foreground'
          />
        )}
      </button>
      <span role='status' className='sr-only'>
        {copied
          ? `${entry.emoji} copied.`
          : error
            ? 'Could not copy. Select the emoji and copy it manually.'
            : ''}
      </span>
    </li>
  )
}

export default function EmojiSearch() {
  const [input, setInput] = React.useState('')
  const [query, setQuery] = React.useState('')
  const [limit, setLimit] = React.useState(PAGE_SIZE)
  const [search, setSearch] = React.useState<ReturnType<
    typeof createEmojiSearch
  > | null>(null)
  const [loadError, setLoadError] = React.useState(false)
  const [attempt, setAttempt] = React.useState(0)
  const composing = React.useRef(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    async function load() {
      try {
        const response = await fetch(catalogueUrl, {
          signal: controller.signal
        })
        if (!response.ok) throw new Error('Could not load emoji data')
        const catalogue = (await response.json()) as EmojiEntry[]
        const prepared = createEmojiSearch(catalogue)
        if (!cancelled) setSearch(() => prepared)
      } catch {
        if (!cancelled) setLoadError(true)
      }
    }
    void load()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [attempt])
  const entries = React.useMemo(() => search?.(query) || [], [query, search])
  const active = Boolean(query.trim())
  const commitQuery = (value: string) => {
    setQuery(value)
    setLimit(PAGE_SIZE)
  }

  return (
    <div className='mt-8'>
      <label htmlFor='emoji-search' className='mb-2 block text-sm font-medium'>
        Search emoji
      </label>
      <div className='relative'>
        <Search
          aria-hidden='true'
          className='pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
        />
        <Input
          ref={inputRef}
          id='emoji-search'
          type='text'
          placeholder='输入中文、關鍵字 or emoji…'
          aria-describedby='emoji-help'
          value={input}
          onCompositionStart={() => {
            composing.current = true
          }}
          onCompositionEnd={(e) => {
            composing.current = false
            commitQuery(e.currentTarget.value)
          }}
          onChange={(e) => {
            setInput(e.target.value)
            if (!composing.current) commitQuery(e.target.value)
          }}
          className='pl-11 pr-11'
        />
        {input && (
          <button
            type='button'
            aria-label='Clear search'
            onClick={() => {
              composing.current = false
              setInput('')
              commitQuery('')
              inputRef.current?.focus()
            }}
            className='absolute right-1 top-0 flex size-10 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring'
          >
            <X aria-hidden='true' className='size-4' />
          </button>
        )}
      </div>
      <p id='emoji-help' className='mt-2 text-xs text-muted-foreground'>
        Search in 简体中文, 繁體中文 or English. Select an emoji to copy it.
      </p>
      {!active && (
        <div className='mt-5 flex flex-wrap items-center gap-2'>
          <span className='mr-1 text-xs text-muted-foreground'>Try</span>
          {examples.map((example) => (
            <Button
              key={example}
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                setInput(example)
                commitQuery(example)
                inputRef.current?.focus()
              }}
            >
              {example}
            </Button>
          ))}
        </div>
      )}
      <p role='status' className='mt-5 text-sm text-muted-foreground'>
        {loadError
          ? 'Could not load the emoji dictionary.'
          : !search
            ? 'Loading emoji dictionary…'
            : active
              ? entries.length
                ? `${entries.length} emoji found. Showing ${Math.min(limit, entries.length)}.`
                : 'No match. Try another keyword.'
              : ''}
      </p>
      {loadError && (
        <Button
          type='button'
          variant='outline'
          className='mt-3'
          onClick={() => {
            setLoadError(false)
            setAttempt((count) => count + 1)
          }}
        >
          Retry
        </Button>
      )}
      {active && entries.length > 0 && (
        <>
          <ul
            aria-label='Search results'
            className='glass mt-3 grid grid-cols-1 gap-1 rounded-soft p-2 sm:grid-cols-2'
          >
            {entries.slice(0, limit).map((match) => (
              <EmojiCandidate
                key={`${query}:${match.entry.emoji}`}
                {...match}
              />
            ))}
          </ul>
          {entries.length > limit && (
            <Button
              type='button'
              variant='outline'
              className='mt-4'
              onClick={() => setLimit((count) => count + PAGE_SIZE)}
            >
              Show more
            </Button>
          )}
        </>
      )}
    </div>
  )
}
