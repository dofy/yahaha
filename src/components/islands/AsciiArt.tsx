import * as React from 'react'
import figlet from 'figlet/browser'
import { Check, ChevronDown, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClipboard } from '@/lib/useClipboard'

const fontModules = import.meta.glob<{ default: string }>(
  '/node_modules/figlet/importable-fonts/*.js'
)
const fonts = Object.keys(fontModules)
  .map((path) => path.split('/').pop()!.replace(/\.js$/u, ''))
  .sort((a, b) => a.localeCompare(b))

export default function AsciiArt() {
  const [text, setText] = React.useState('Yahaha')
  const [font, setFont] = React.useState('Standard')
  const [result, setResult] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)
  const { copied, error, doCopy, reset } = useClipboard(result)
  const unsupported = /[^\x20-\x7e]/u.test(text)

  React.useEffect(() => {
    let active = true
    setLoading(true)
    setFailed(false)
    setResult('')
    const path = `/node_modules/figlet/importable-fonts/${font}.js`
    fontModules[path]()
      .then(({ default: data }) => {
        if (!active) return
        figlet.parseFont(font, data)
        setResult(
          figlet.textSync(text.replace(/[^\x20-\x7e]/gu, '?'), { font })
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
  }, [font, text])

  return (
    <div className='mt-8'>
      <label htmlFor='ascii-input' className='mb-2 block text-sm font-medium'>
        Text
      </label>
      <Input
        id='ascii-input'
        value={text}
        maxLength={100}
        onChange={(event) => {
          setText(event.target.value)
          reset()
        }}
        aria-describedby='ascii-help'
      />
      <p id='ascii-help' className='mt-2 text-xs text-muted-foreground'>
        Use English letters, numbers and punctuation. Other characters are shown
        as ?.
      </p>
      <label
        htmlFor='ascii-font'
        className='mb-2 mt-5 block text-sm font-medium'
      >
        Font
      </label>
      <div className='relative w-fit max-w-full'>
        <select
          id='ascii-font'
          value={font}
          onChange={(event) => {
            setFont(event.target.value)
            reset()
          }}
          className='chip block max-w-full appearance-none rounded-xl py-2 pl-4 pr-10 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring'
        >
          {fonts.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden='true'
          className='pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-foreground'
        />
      </div>
      <div className='mt-6'>
        <p className='mb-2 text-sm font-medium'>ASCII art</p>
        <div className='panel overflow-x-auto rounded-soft p-5'>
          <pre
            className='w-max min-w-full font-mono text-sm leading-tight text-accent-text'
            data-ascii-output
          >
            {result ||
              (loading
                ? 'Loading…'
                : failed
                  ? 'Could not load this font. Please try again.'
                  : '')}
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
      </div>
      <div aria-live='polite' className='mt-3 text-sm text-muted-foreground'>
        {unsupported && (
          <p>Unsupported characters are marked as ? in the result.</p>
        )}
        {copied && <p>Copied to clipboard.</p>}
        {error && (
          <p>Could not copy. Select the result and copy it manually.</p>
        )}
      </div>
    </div>
  )
}
