import * as React from 'react'
import {
  Check,
  Copy,
  Dices,
  Download,
  RefreshCw,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FaceParts from '@/components/islands/FaceParts'
import FaceSvg from '@/components/islands/FaceSvg'
import {
  codeOf,
  describeFace,
  faceCombinations,
  faceToSvg,
  layerNames,
  randomSeed,
  selectFace,
  type FaceFrame
} from '@/lib/face'
import { useClipboard } from '@/lib/useClipboard'

const frames: { id: FaceFrame; label: string }[] = [
  { id: 'rounded', label: 'Rounded' },
  { id: 'circle', label: 'Circle' },
  { id: 'square', label: 'Square' }
]

const GALLERY_SIZE = 12
const EXPORT_SIZE = 512

type Overrides = Record<string, number>

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

/** Paints the standalone SVG onto a canvas, for a raster avatar. */
async function svgToPng(svg: string, size: number): Promise<Blob | null> {
  const source = URL.createObjectURL(
    new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  )
  try {
    const image = new Image()
    image.decoding = 'sync'
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Could not rasterise the avatar'))
      image.src = source
    })
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(image, 0, 0, size, size)
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  } finally {
    URL.revokeObjectURL(source)
  }
}

function fileStem(seed: string): string {
  const slug = seed
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
  return `face-${slug || codeOf(seed)}`
}

export default function FaceKit() {
  const [seed, setSeed] = React.useState('Seven')
  const [overrides, setOverrides] = React.useState<Overrides>({})
  const [frame, setFrame] = React.useState<FaceFrame>('rounded')
  const [gallery, setGallery] = React.useState<string[]>([])
  const [pngError, setPngError] = React.useState(false)

  const selection = React.useMemo(
    () => selectFace(seed, overrides),
    [seed, overrides]
  )
  const svg = React.useMemo(
    () => faceToSvg(selection, { size: EXPORT_SIZE, frame, seed }),
    [selection, frame, seed]
  )
  const { copied, error: copyError, doCopy } = useClipboard(svg)
  const description = describeFace(selection)

  // Read the shared face out of the URL once the island is live.
  React.useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const shared = query.get('seed')
    if (shared) setSeed(shared)
    const restored: Overrides = {}
    for (const name of [...layerNames, 'palette']) {
      const value = Number(query.get(name))
      if (query.has(name) && Number.isInteger(value)) restored[name] = value
    }
    if (Object.keys(restored).length > 0) setOverrides(restored)
    setGallery(Array.from({ length: GALLERY_SIZE }, () => randomSeed()))
  }, [])

  // Keep the address bar in step, so a face stays shareable after tweaks.
  React.useEffect(() => {
    const query = new URLSearchParams()
    query.set('seed', seed)
    for (const [name, value] of Object.entries(overrides)) {
      query.set(name, String(value))
    }
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${query.toString()}`
    )
  }, [seed, overrides])

  const shuffle = () => {
    setSeed(randomSeed())
    setOverrides({})
  }

  const setLayer = (name: string, value: string) => {
    setOverrides((current) => {
      const next = { ...current }
      if (value === 'auto') delete next[name]
      else next[name] = Number(value)
      return next
    })
  }

  const savePng = async () => {
    setPngError(false)
    try {
      const blob = await svgToPng(svg, EXPORT_SIZE)
      if (!blob) throw new Error('No canvas')
      downloadBlob(blob, `${fileStem(seed)}.png`)
    } catch {
      setPngError(true)
    }
  }

  return (
    <div className='mt-8 space-y-6'>
      <section className='panel rounded-soft p-4 sm:p-5' aria-label='Avatar'>
        <div className='flex flex-col gap-5 sm:flex-row sm:items-start'>
          <FaceSvg
            selection={selection}
            frame={frame}
            label={description}
            className='h-44 w-44 shrink-0 self-center sm:h-52 sm:w-52'
          />
          <div className='min-w-0 flex-1'>
            <label
              htmlFor='face-seed'
              className='mb-2 block text-sm font-medium'
            >
              Seed
              <span className='text-muted-foreground ml-2 text-xs font-normal'>
                名字、邮箱或任意文本
              </span>
            </label>
            <div className='flex flex-wrap gap-2'>
              <Input
                id='face-seed'
                value={seed}
                placeholder='Anything at all'
                onChange={(event) => setSeed(event.target.value)}
                className='min-w-40 flex-1'
              />
              <Button type='button' variant='outline' onClick={shuffle}>
                <Dices /> Random
              </Button>
            </div>
            <p className='text-muted-foreground mt-2 text-xs'>
              Hash <span className='font-mono'>{codeOf(seed)}</span> · the same
              seed always draws the same face.
            </p>

            <fieldset className='mt-4'>
              <legend className='sr-only'>Frame</legend>
              <div className='flex flex-wrap gap-2'>
                {frames.map((option) => (
                  <Button
                    key={option.id}
                    type='button'
                    size='sm'
                    variant={frame === option.id ? 'default' : 'outline'}
                    aria-pressed={frame === option.id}
                    onClick={() => setFrame(option.id)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </fieldset>

            <div className='mt-4 flex flex-wrap gap-2'>
              <Button type='button' variant='outline' onClick={doCopy}>
                {copied ? <Check /> : <Copy />}
                {copied ? 'Copied' : 'Copy SVG'}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() =>
                  downloadBlob(
                    new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
                    `${fileStem(seed)}.svg`
                  )
                }
              >
                <Download /> SVG
              </Button>
              <Button type='button' variant='outline' onClick={savePng}>
                <Download /> PNG {EXPORT_SIZE}px
              </Button>
            </div>
            <div
              aria-live='polite'
              className='text-muted-foreground mt-2 text-xs'
            >
              {copyError && <p>Could not copy. Download the file instead.</p>}
              {pngError && (
                <p>Could not render the PNG. The SVG still works.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className='panel rounded-soft p-4 sm:p-5' aria-label='Parts'>
        <h2 className='text-sm font-semibold'>Parts</h2>
        <p className='text-muted-foreground mt-1 mb-4 text-xs'>
          Pick a layer, then pick the part you want drawn. A pinned layer stops
          following the seed and travels in the address bar with it.
        </p>
        <FaceParts
          selection={selection}
          overrides={overrides}
          frame={frame}
          onPick={(name, value) => setLayer(name, String(value))}
        />
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={Object.keys(overrides).length === 0}
            onClick={() => setOverrides({})}
          >
            <RotateCcw /> Back to the seed
          </Button>
          <p className='text-muted-foreground text-xs'>
            {faceCombinations().toLocaleString('en-US')} faces in the catalogue.
          </p>
        </div>
      </section>

      <section aria-label='Random faces' className='space-y-3'>
        <div className='flex flex-wrap items-center gap-3'>
          <h2 className='text-sm font-semibold'>Random faces</h2>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() =>
              setGallery(
                Array.from({ length: GALLERY_SIZE }, () => randomSeed())
              )
            }
          >
            <RefreshCw /> Reshuffle
          </Button>
          <p className='text-muted-foreground text-xs'>
            Pick one to load its seed.
          </p>
        </div>
        <ul className='grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6'>
          {gallery.map((item) => (
            <li key={item}>
              <button
                type='button'
                onClick={() => {
                  setSeed(item)
                  setOverrides({})
                }}
                className='chip hover:border-accent w-full rounded-xl p-2'
              >
                <FaceSvg
                  selection={selectFace(item)}
                  frame={frame}
                  className='h-auto w-full'
                />
                <span className='text-muted-foreground mt-1 block truncate font-mono text-xs'>
                  {item}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
