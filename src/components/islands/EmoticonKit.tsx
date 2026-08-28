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
    <div className="mt-8 flex flex-col items-center gap-4">
      <div
        onClick={doCopy}
        title="Click to copy"
        className="glass rounded-soft tx flex min-h-16 w-full cursor-pointer items-center justify-center px-4 py-5 font-mono text-2xl select-all hover:border-accent"
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
