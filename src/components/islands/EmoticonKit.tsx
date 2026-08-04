import * as React from 'react'
import { Check, Copy, Sparkles } from 'lucide-react'
import copy from 'clipboard-copy'
import EKit from '@/lib/Emoticon'
import { Button } from '@/components/ui/button'

export default function EmoticonKit() {
  const [emoticon, setEmoticon] = React.useState('')
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    setEmoticon(EKit())
  }, [])

  const create = () => {
    setEmoticon(EKit())
    setCopied(false)
  }

  const doCopy = async () => {
    if (!emoticon) return
    await copy(emoticon)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mt-8 flex flex-col items-start gap-4">
      <div
        onClick={doCopy}
        title="Click to copy"
        className="flex min-h-16 w-full cursor-pointer select-all items-center justify-center rounded-lg border border-border bg-card px-4 py-5 font-mono text-2xl text-card-foreground transition-colors hover:border-accent/50"
      >
        {emoticon || '…'}
      </div>
      <div className="flex gap-3">
        <Button onClick={create}>
          <Sparkles />
          CREATE
        </Button>
        <Button variant="outline" onClick={doCopy}>
          {copied ? <Check /> : <Copy />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}
