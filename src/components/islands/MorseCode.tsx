import * as React from 'react'
import { Check, ChevronDown, Copy } from 'lucide-react'
import { encodeMorse, decodeMorse } from '@/lib/morse'
import { useClipboard } from '@/lib/useClipboard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function MorseCode() {
  const [text, setText] = React.useState('')
  const [mode, setMode] = React.useState<'encode' | 'decode'>('encode')
  const result = mode === 'encode' ? encodeMorse(text) : decodeMorse(text)
  const { copied, error, doCopy, reset } = useClipboard(result.output)

  return (
    <div className='mt-8'>
      <label htmlFor='morse-mode' className='mb-2 block text-sm font-medium'>
        Conversion
      </label>
      <div className='relative mb-5 w-fit'>
        <select
          id='morse-mode'
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as 'encode' | 'decode')
            setText('')
            reset()
          }}
          className='chip block appearance-none rounded-xl py-2 pl-4 pr-10 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring'
        >
          <option value='encode'>Text to Morse</option>
          <option value='decode'>Morse to Text</option>
        </select>
        <ChevronDown
          aria-hidden='true'
          className='pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-foreground'
        />
      </div>
      <label htmlFor='morse-input' className='mb-2 block text-sm font-medium'>
        {mode === 'encode' ? 'Text to encode' : 'Morse code to decode'}
      </label>
      <Input
        id='morse-input'
        placeholder={
          mode === 'encode' ? 'Enter text here…' : '... --- ... / .- -...'
        }
        aria-describedby='morse-help'
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          reset()
        }}
      />
      <p id='morse-help' className='mt-2 text-xs text-muted-foreground'>
        {mode === 'encode'
          ? 'Supports Latin letters, numbers and punctuation.'
          : 'Separate letters with spaces and words with / or three spaces.'}
      </p>
      {result.output && (
        <div className='mt-6'>
          <button
            type='button'
            onClick={doCopy}
            aria-label='Copy result'
            title='Click to copy'
            className='panel rounded-soft tx w-full cursor-pointer p-5 text-left hover:border-accent focus-visible:outline-2 focus-visible:outline-ring'
          >
            <span
              className='block whitespace-pre-wrap break-words font-mono text-lg text-accent-text'
              data-morse-output
            >
              {result.output}
            </span>
          </button>
          <Button variant='outline' onClick={doCopy} className='mt-3'>
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      )}
      <div aria-live='polite' className='mt-3 text-sm text-muted-foreground'>
        {result.unsupported.length > 0 && (
          <p>
            Unsupported {mode === 'encode' ? 'characters' : 'codes'}:{' '}
            {result.unsupported.join(', ')}. Marked as ? in the result.
          </p>
        )}
        {copied && <p>Copied to clipboard.</p>}
        {error && (
          <p>Could not copy. Select the result and copy it manually.</p>
        )}
      </div>
    </div>
  )
}
