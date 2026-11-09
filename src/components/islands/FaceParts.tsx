import * as React from 'react'
import { Pin } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FaceSvg from '@/components/islands/FaceSvg'
import {
  faceLayers,
  facePalettes,
  variantOf,
  type FaceFrame,
  type FaceSelection
} from '@/lib/face'

/**
 * Part picker. One layer is open at a time, so the options themselves get the
 * space instead of nine collapsed rows. Every option is the face with that one
 * part swapped in, which reads faster than a variant name.
 */

/** Layers an extra can cover; their previews drop the extra. */
const OCCLUDED = new Set(['eye', 'brow'])

type Row = {
  name: string
  label: string
  current: string
  count: number
  optionLabel: (index: number) => string
  preview: (index: number) => FaceSelection
}

export default function FaceParts({
  selection,
  overrides,
  frame,
  onPick
}: {
  selection: FaceSelection
  /** Pinned layers, keyed by layer name plus `palette`. */
  overrides: Record<string, number>
  frame: FaceFrame
  onPick: (name: string, value: number | 'auto') => void
}) {
  const [layer, setLayer] = React.useState('hair')

  const rows: Row[] = [
    ...faceLayers.map((entry) => ({
      name: entry.name,
      label: entry.label,
      current: variantOf(selection, entry).id,
      count: entry.variants.length,
      optionLabel: (index: number) => entry.variants[index].id,
      preview: (index: number) => ({
        ...selection,
        parts: {
          ...selection.parts,
          // Glasses and the like sit over the eyes, so they step aside while
          // the part under them is the one being chosen.
          ...(OCCLUDED.has(entry.name) ? { extra: 0 } : {}),
          [entry.name]: index
        }
      })
    })),
    {
      name: 'palette',
      label: 'Palette',
      current: facePalettes[selection.palette].id,
      count: facePalettes.length,
      optionLabel: (index: number) => facePalettes[index].id,
      preview: (index: number) => ({ ...selection, palette: index })
    }
  ]

  return (
    <Tabs value={layer} onValueChange={setLayer}>
      <TabsList className='h-auto flex-wrap justify-start gap-1'>
        {rows.map((row) => (
          <TabsTrigger key={row.name} value={row.name} className='gap-1.5'>
            {row.label}
            {overrides[row.name] !== undefined && (
              <Pin aria-label='Pinned' className='size-3' />
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {rows.map((row) => (
        <TabsContent key={row.name} value={row.name} className='mt-3'>
          <p className='text-muted-foreground mb-2 text-xs'>
            {overrides[row.name] === undefined
              ? 'Follows the seed · '
              : 'Pinned · '}
            <span className='font-mono'>{row.current}</span>
          </p>
          <ul className='grid grid-cols-[repeat(auto-fill,minmax(68px,1fr))] gap-2'>
            <li>
              <button
                type='button'
                aria-pressed={overrides[row.name] === undefined}
                onClick={() => onPick(row.name, 'auto')}
                className={`chip hover:border-accent w-full rounded-lg p-1.5 ${
                  overrides[row.name] === undefined
                    ? 'border-accent text-accent-text'
                    : ''
                }`}
              >
                <FaceSvg
                  selection={selection}
                  frame={frame}
                  className='h-auto w-full'
                />
                <span className='mt-1 block truncate text-[11px]'>auto</span>
              </button>
            </li>
            {Array.from({ length: row.count }, (_, index) => {
              const active = overrides[row.name] === index
              return (
                <li key={row.optionLabel(index)}>
                  <button
                    type='button'
                    aria-pressed={active}
                    onClick={() => onPick(row.name, index)}
                    className={`chip hover:border-accent w-full rounded-lg p-1.5 ${
                      active ? 'border-accent text-accent-text' : ''
                    }`}
                  >
                    <FaceSvg
                      selection={row.preview(index)}
                      frame={frame}
                      className='h-auto w-full'
                    />
                    <span className='mt-1 block truncate font-mono text-[11px]'>
                      {row.optionLabel(index)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </TabsContent>
      ))}
    </Tabs>
  )
}
