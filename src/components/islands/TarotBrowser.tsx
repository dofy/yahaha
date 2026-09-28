import * as React from 'react'
import tarotData from '@/data/tarot.json'
import type { Tarot } from '@/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const cards = tarotData as Tarot[]

const TABS = [
  { key: 'summary', label: '概述' },
  { key: 'up', label: '正位' },
  { key: 'down', label: '逆位' }
] as const

function Detail({ tarot }: { tarot: Tarot }) {
  const [tab, setTab] = React.useState<string>('summary')
  const [zh] = tarot.name.split(' / ')

  return (
    <div>
      <div className='mb-5 flex justify-center'>
        <img
          width={237}
          height={340}
          src={`/images/tarot/${tarot.index}.jpg`}
          alt={tarot.name}
          className={cn(
            'rounded-lg border border-border shadow-md transition-transform duration-500',
            tab === 'down' && 'rotate-180'
          )}
          style={{ height: 'auto' }}
        />
      </div>

      <h2 className='text-center text-lg font-semibold text-foreground'>
        {tarot.name}
      </h2>

      <div className='mt-3 flex flex-wrap justify-center gap-1.5'>
        {tarot.keywords.map((kw) => (
          <Badge key={kw} variant='accent'>
            {kw}
          </Badge>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab} className='mt-5'>
        <TabsList className='w-full'>
          {TABS.map(({ key, label }) => (
            <TabsTrigger key={key} value={key} className='flex-1'>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value='summary'>
          <p className='text-sm leading-relaxed text-muted-foreground'>
            {tarot.summary}
          </p>
        </TabsContent>

        {(['up', 'down'] as const).map((key) => (
          <TabsContent key={key} value={key}>
            <dl className='space-y-3'>
              {Object.entries(tarot[key]).map(([k, v]) => (
                <div key={k}>
                  <dt className='text-xs font-medium uppercase tracking-wide text-accent-text'>
                    {k}
                  </dt>
                  <dd className='mt-0.5 text-sm leading-relaxed text-muted-foreground'>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </TabsContent>
        ))}
      </Tabs>
      <span className='sr-only'>{zh}</span>
    </div>
  )
}

export default function TarotBrowser() {
  const [selected, setSelected] = React.useState<Tarot | null>(null)

  const select = (t: Tarot) => {
    setSelected((cur) => (cur?.index === t.index ? null : t))
  }

  return (
    <div className='mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]'>
      {/* List */}
      <div className='flex flex-col divide-y divide-border/60'>
        {cards.map((tarot) => {
          const active = selected?.index === tarot.index
          const [zh, en] = tarot.name.split(' / ')
          return (
            <div key={tarot.index}>
              <button
                onClick={() => select(tarot)}
                aria-expanded={active}
                className={cn(
                  'flex w-full items-center justify-between gap-4 py-3 text-left transition-colors',
                  active
                    ? 'text-accent-text'
                    : 'text-foreground hover:text-accent-text'
                )}
              >
                <span className='flex flex-wrap items-baseline gap-x-2'>
                  <span className='font-medium'>{zh}</span>
                  {en && (
                    <span className='text-sm text-muted-foreground'>{en}</span>
                  )}
                </span>
                <span className='flex shrink-0 items-center gap-3 text-xs text-muted-foreground'>
                  <span>{tarot.element}</span>
                  <span className='font-mono'>{tarot.index.toUpperCase()}</span>
                </span>
              </button>

              {/* Inline detail on mobile */}
              {active && (
                <div className='pb-6 pt-2 lg:hidden'>
                  <Detail tarot={tarot} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Sticky panel on desktop */}
      <aside className='hidden lg:block'>
        <div className='glass rounded-soft sticky top-8 p-6'>
          {selected ? (
            <Detail key={selected.index} tarot={selected} />
          ) : (
            <p className='py-16 text-center text-sm text-muted-foreground'>
              ← 选择一张牌
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}
