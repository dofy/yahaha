import * as React from 'react'
import figlet from 'figlet/browser'
import { Check, Copy, Plus, Shuffle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  availableFonts,
  matchesFont,
  normalizeAsciiInput
} from '@/lib/ascii-art'
import { useClipboard } from '@/lib/useClipboard'

const fontModules = import.meta.glob<{ default: string }>(
  '/node_modules/figlet/importable-fonts/*.js'
)
const fonts = Object.keys(fontModules)
  .map((path) => path.split('/').pop()!.replace(/\.js$/u, ''))
  .sort((a, b) => a.localeCompare(b))

type Preview = { id: number; font: string }

function FontPreview({
  text,
  preview,
  canRemove,
  unusedFonts,
  onFontChange,
  onRemove
}: {
  text: string
  preview: Preview
  canRemove: boolean
  unusedFonts: string[]
  onFontChange: (font: string) => void
  onRemove: () => void
}) {
  const [query, setQuery] = React.useState('')
  const [result, setResult] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const { copied, error, doCopy, reset } = useClipboard(result)
  const matches = fonts.filter((font) => matchesFont(font, query))
  const options = matches.includes(preview.font)
    ? matches
    : [preview.font, ...matches]

  React.useEffect(() => {
    if (preview.id === 1) return
    const input = searchRef.current
    input?.focus({ preventScroll: true })
    input?.scrollIntoView({ block: 'center', behavior: 'instant' })
  }, [preview.id])

  React.useEffect(() => {
    let active = true
    setLoading(true)
    setFailed(false)
    setResult('')
    const path = `/node_modules/figlet/importable-fonts/${preview.font}.js`
    fontModules[path]()
      .then(({ default: data }) => {
        if (!active) return
        figlet.parseFont(preview.font, data)
        setResult(
          figlet.textSync(normalizeAsciiInput(text), { font: preview.font })
        )
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setFailed(true)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [preview.font, text])

  return (
    <section
      className='panel rounded-soft p-4 sm:p-5'
      aria-label={`Preview ${preview.id}`}
    >
      <div className='flex flex-wrap items-end gap-3'>
        <div className='min-w-40 flex-1'>
          <label
            htmlFor={`font-search-${preview.id}`}
            className='mb-2 block text-sm font-medium'
          >
            Search fonts
          </label>
          <Input
            ref={searchRef}
            id={`font-search-${preview.id}`}
            placeholder='Search by font name…'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className='min-w-40 flex-1'>
          <label
            htmlFor={`font-select-${preview.id}`}
            className='mb-2 block text-sm font-medium'
          >
            Font
          </label>
          <Select
            id={`font-select-${preview.id}`}
            value={preview.font}
            onChange={(event) => {
              onFontChange(event.target.value)
              reset()
            }}
          >
            {options.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant='outline'
          disabled={unusedFonts.length === 0}
          aria-label={`Random font for preview ${preview.id}`}
          title={
            unusedFonts.length
              ? 'Choose an unused font'
              : 'All fonts are in use'
          }
          onClick={() => {
            onFontChange(
              unusedFonts[Math.floor(Math.random() * unusedFonts.length)]
            )
            setQuery('')
            reset()
          }}
        >
          <Shuffle /> Random
        </Button>
        <Button
          variant='outline'
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove preview ${preview.id}`}
          title={canRemove ? 'Remove preview' : 'Keep at least one preview'}
        >
          <Trash2 /> Remove
        </Button>
      </div>
      <p className='mt-2 text-xs text-muted-foreground' aria-live='polite'>
        {query
          ? `${matches.length} matching fonts${matches.includes(preview.font) ? '' : ' (current font also shown)'}`
          : `${fonts.length} fonts available`}
      </p>
      <div className='panel-solid mt-4 overflow-x-auto rounded-xl p-4'>
        <pre
          className='w-max min-w-full font-mono text-sm leading-tight text-accent-text'
          data-ascii-output
        >
          {loading
            ? 'Loading…'
            : failed
              ? 'Could not load this font. Please try again.'
              : result}
        </pre>
      </div>
      <Button
        variant='outline'
        onClick={doCopy}
        disabled={!result || loading}
        className='mt-3'
      >
        {copied ? <Check /> : <Copy />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <div aria-live='polite' className='mt-2 text-sm text-muted-foreground'>
        {copied && <p>Copied to clipboard.</p>}
        {error && (
          <p>Could not copy. Select the result and copy it manually.</p>
        )}
      </div>
    </section>
  )
}

export default function AsciiArt() {
  const [text, setText] = React.useState('Yahaha')
  const [previews, setPreviews] = React.useState<Preview[]>([
    { id: 1, font: 'Standard' }
  ])
  const nextId = React.useRef(2)
  const unsupported = /[^\x20-\x7e\n\r]/u.test(text)

  return (
    <div className='mt-8'>
      <label htmlFor='ascii-input' className='mb-2 block text-sm font-medium'>
        Text
      </label>
      <textarea
        id='ascii-input'
        rows={3}
        maxLength={500}
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-describedby='ascii-help'
        className='chip tx block w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-coral-wash focus-visible:outline-none'
      />
      <p id='ascii-help' className='mt-2 text-xs text-muted-foreground'>
        Use English letters, numbers and punctuation. Line breaks are supported;
        other characters are shown as ?.
      </p>
      {unsupported && (
        <p className='mt-2 text-sm text-muted-foreground' role='status'>
          Unsupported characters are marked as ? in the result.
        </p>
      )}
      <div className='mb-3 mt-6 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-base font-medium'>Previews</h2>
        <Button
          variant='outline'
          onClick={() => {
            const id = nextId.current++
            setPreviews((items) => {
              const unused = availableFonts(
                fonts,
                items.map((item) => item.font)
              )
              const font = unused.includes('Slant')
                ? 'Slant'
                : (unused[0] ?? 'Slant')
              return [...items, { id, font }]
            })
          }}
        >
          <Plus /> Add preview
        </Button>
      </div>
      <div className='space-y-4'>
        {previews.map((preview) => (
          <FontPreview
            key={preview.id}
            text={text}
            preview={preview}
            unusedFonts={availableFonts(
              fonts,
              previews.map((item) => item.font)
            )}
            canRemove={previews.length > 1}
            onFontChange={(font) =>
              setPreviews((items) =>
                items.map((item) =>
                  item.id === preview.id ? { ...item, font } : item
                )
              )
            }
            onRemove={() =>
              setPreviews((items) =>
                items.length > 1
                  ? items.filter((item) => item.id !== preview.id)
                  : items
              )
            }
          />
        ))}
      </div>
    </div>
  )
}
