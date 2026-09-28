import * as React from 'react'
import { solve24 } from '@/lib/24points'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function Points24() {
  const [nums, setNums] = React.useState<string[]>(['', '', '', ''])
  const [results, setResults] = React.useState<string[]>([])
  const [solved, setSolved] = React.useState(false)

  const solve: React.ComponentProps<'form'>['onSubmit'] = (e) => {
    e.preventDefault()
    if (!valid) return
    setResults(solve24(nums.map(Number)))
    setSolved(true)
  }

  const setAt = (i: number, v: string) => {
    const next = [...nums]
    next[i] = v
    setNums(next)
    setResults([])
    setSolved(false)
  }

  const valid = nums.every(
    (n) =>
      n.trim() !== '' &&
      Number.isInteger(Number(n)) &&
      Number(n) >= 1 &&
      Number(n) <= 13
  )

  return (
    <div>
      <form onSubmit={solve} className='mt-8 flex flex-wrap items-center gap-3'>
        {nums.map((n, i) => (
          <Input
            key={i}
            type='number'
            min={1}
            max={13}
            step={1}
            required
            aria-label={`Number ${i + 1}`}
            inputMode='numeric'
            placeholder='XX'
            value={n}
            onChange={(e) => setAt(i, e.target.value)}
            className='w-20 text-center font-mono text-base'
          />
        ))}
        <Button type='submit' disabled={!valid}>
          Calculate
        </Button>
      </form>

      <div role='status' aria-live='polite' aria-atomic='true'>
        {solved &&
          (results.length ? (
            <p className='mt-8 text-sm text-muted-foreground'>
              {results.length} {results.length === 1 ? 'solution' : 'solutions'}
            </p>
          ) : (
            <p className='mt-8 font-mono text-sm text-muted-foreground'>
              No solution for these numbers.
            </p>
          ))}
      </div>
      {solved && results.length > 0 && (
        <ul className='mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2'>
          {results.map((r, i) => (
            <li key={i} className='chip rounded-lg px-3 py-2 font-mono text-sm'>
              {r} = 24
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
