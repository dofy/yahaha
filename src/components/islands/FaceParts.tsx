import * as React from 'react'
import { ChevronDown, Pin } from 'lucide-react'
import FaceSvg from '@/components/islands/FaceSvg'
import {
  faceLayers,
  facePalettes,
  variantOf,
  type FaceFrame,
  type FaceSelection
} from '@/lib/face'

/**
 * Part picker. Every option is the face itself with that one part swapped in,
 * so a choice is read from the drawing rather than from its name. Only the open
 * layer renders its options, which keeps the page from drawing all 78 of them.
 */
/** Layers an extra can cover; their previews drop the extra. */
const OCCLUDED = new Set(['eye', 'brow'])

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
  const [open, setOpen] = React.useState<string | null>(null)

  const rows: {
    name: string
    label: string
    current: string
    count: number
    preview: (index: number) => FaceSelection
  }[] = [
    ...faceLayers.map((layer) => ({
      name: layer.name,
      label: layer.label,
      current: variantOf(selection, layer).id,
      count: layer.variants.length,
      preview: (index: number) => ({
        ...selection,
        parts: {
          ...selection.parts,
          // Glasses and the like sit over the eyes, so they step aside while
          // the part under them is the one being chosen.
          ...(OCCLUDED.has(layer.name) ? { extra: 0 } : {}),
          [layer.name]: index
        }
      })
    })),
    {
      name: 'palette',
      label: 'Palette',
      current: facePalettes[selection.palette].id,
      count: facePalettes.length,
      preview: (index: number) => ({ ...selection, palette: index })
    }
  ]

  const optionLabel = (name: string, index: number) =>
    name === 'palette'
      ? facePalettes[index].id
      : faceLayers.find((layer) => layer.name === name)!.variants[index].id

  return (
    <div className='space-y-2'>
      {rows.map((row) => {
        const pinned = overrides[row.name] !== undefined
        const expanded = open === row.name
        return (
          <div key={row.name} className='chip rounded-xl'>
            <button
              type='button'
              aria-expanded={expanded}
              aria-controls={`face-options-${row.name}`}
              onClick={() => setOpen(expanded ? null : row.name)}
              className='flex w-full items-center gap-3 p-2 text-left'
            >
              <FaceSvg
                selection={selection}
                frame={frame}
                className='size-10 shrink-0'
              />
              <span className='min-w-0 flex-1'>
                <span className='block text-sm font-medium'>{row.label}</span>
                <span className='text-muted-foreground block truncate font-mono text-xs'>
                  {pinned ? row.current : `auto · ${row.current}`}
                </span>
              </span>
              {pinned && (
                <Pin
                  aria-label='Pinned'
                  className='text-accent-text size-3.5 shrink-0'
                />
              )}
              <ChevronDown
                aria-hidden='true'
                className={`size-4 shrink-0 transition-transform duration-200 ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expanded && (
              <ul
                id={`face-options-${row.name}`}
                className='grid grid-cols-4 gap-2 p-2 pt-0 sm:grid-cols-6 lg:grid-cols-8'
              >
                <li>
                  <button
                    type='button'
                    aria-pressed={!pinned}
                    onClick={() => onPick(row.name, 'auto')}
                    className={`panel-solid w-full rounded-lg p-1.5 ${
                      pinned ? '' : 'border-accent text-accent-text'
                    }`}
                  >
                    <FaceSvg
                      selection={selection}
                      frame={frame}
                      className='h-auto w-full'
                    />
                    <span className='mt-1 block truncate text-[11px]'>
                      auto
                    </span>
                  </button>
                </li>
                {Array.from({ length: row.count }, (_, index) => {
                  const active = overrides[row.name] === index
                  return (
                    <li key={optionLabel(row.name, index)}>
                      <button
                        type='button'
                        aria-pressed={active}
                        onClick={() => onPick(row.name, index)}
                        className={`panel-solid hover:border-accent w-full rounded-lg p-1.5 ${
                          active ? 'border-accent text-accent-text' : ''
                        }`}
                      >
                        <FaceSvg
                          selection={row.preview(index)}
                          frame={frame}
                          className='h-auto w-full'
                        />
                        <span className='mt-1 block truncate font-mono text-[11px]'>
                          {optionLabel(row.name, index)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
