import * as React from 'react'
import Solver from '@/lib/24points'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function Points24() {
  const [nums, setNums] = React.useState<string[]>(['', '', '', ''])
  const [results, setResults] = React.useState<string[]>([])
  const [solved, setSolved] = React.useState(false)

  const solve = (e: React.FormEvent) => {
    e.preventDefault()
    let result = Solver.methodA(...nums)
    if (result.length === 0) result = Solver.methodB(...nums)
    setResults([...new Set(result)])
    setSolved(true)
  }

  const setAt = (i: number, v: string) => {
    const next = [...nums]
    next[i] = v
    setNums(next)
  }

  const complete = nums.every((n) => n.trim() !== '')

  return (
    <div>
      <form onSubmit={solve} className="mt-8 flex flex-wrap items-center gap-3">
        {nums.map((n, i) => (
          <Input
            key={i}
            type="number"
            min={1}
            max={13}
            inputMode="numeric"
            placeholder="XX"
            value={n}
            onChange={(e) => setAt(i, e.target.value)}
            className="w-20 text-center font-mono text-base"
          />
        ))}
        <Button type="submit" disabled={!complete}>
          Calculate
        </Button>
      </form>

      {solved &&
        (results.length ? (
          <ul className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {results.map((r, i) => (
              <li
                key={i}
                className="rounded-md border border-border bg-card px-3 py-2 font-mono text-sm text-card-foreground"
              >
                {r} = 24
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 font-mono text-sm text-muted-foreground">
            No result !!!
          </p>
        ))}
    </div>
  )
}
