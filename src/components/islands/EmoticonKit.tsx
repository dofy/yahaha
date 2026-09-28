import * as React from 'react'
import { Check, Copy, Sparkles } from 'lucide-react'
import { useClipboard } from '@/lib/useClipboard'
import EKit from '@/lib/Emoticon'
import { Button } from '@/components/ui/button'

export default function EmoticonKit() {
  const [emoticon, setEmoticon] = React.useState('')
  const { copied, error, doCopy, reset } = useClipboard(emoticon)

  React.useEffect(() => {
    setEmoticon(EKit())
  }, [])

  const create = () => {
    setEmoticon(EKit())
    reset()
  }

  return (
    <div className='mt-8 flex flex-col items-center gap-4'>
      <button
        type='button'
        onClick={doCopy}
        aria-label='Copy emoticon'
        disabled={!emoticon}
        title='Click to copy'
        className='glass rounded-soft tx flex min-h-16 w-full cursor-pointer items-center justify-center px-4 py-5 font-mono text-2xl select-all hover:border-accent focus-visible:outline-2 focus-visible:outline-ring'
      >
        {emoticon || '…'}
      </button>
      <div className='flex gap-3'>
        <Button onClick={create}>
          <Sparkles />
          CREATE
        </Button>
        <Button variant='outline' onClick={doCopy} disabled={!emoticon}>
          {copied ? <Check /> : <Copy />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <p role='status' className='text-sm text-muted-foreground'>
        {error
          ? 'Could not copy. Select the emoticon and copy it manually.'
          : copied
            ? 'Copied to clipboard.'
            : ''}
      </p>
    </div>
  )
}
