import * as React from 'react'
import { Check, Copy } from 'lucide-react'
import copy from 'clipboard-copy'
import MorseData from '@/data/morse.json'
import type { Dict } from '@/types'
import { Input } from '@/components/ui/input'

const morseDict = MorseData as Dict

export default function MorseCode() {
  const [text, setText] = React.useState('')
  const [copied, setCopied] = React.useState(false)

  const words = text.trim() ? text.trim().split(/\s+/) : []

  const flatCode = text
    .replace(/\s+/g, ' ')
    .split('')
    .map((l) => morseDict[l.toUpperCase()] ?? '')
    .join(' ')
    .trim()

  const doCopy = async () => {
    if (!flatCode) return
    await copy(flatCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mt-8">
      <Input
        placeholder="Enter text here…"
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {words.length > 0 && (
        <div
          onClick={doCopy}
          title="Click to copy"
          className="glass rounded-soft tx group mt-6 cursor-pointer p-5 hover:border-accent"
        >
          <div className="flex flex-wrap gap-x-6 gap-y-3 font-mono text-lg text-card-foreground">
            {words.map((word, wi) => (
              <span key={wi} className="flex flex-wrap gap-x-3">
                {word.split('').map((letter, li) => (
                  <span key={li} className="text-accent-text">
                    {morseDict[letter.toUpperCase()] ?? '?'}
                  </span>
                ))}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied' : 'Click to copy'}
          </div>
        </div>
      )}
    </div>
  )
}
