import data from '../data/face.json' with { type: 'json' }

/**
 * Deterministic SVG avatars (Face Kit).
 *
 * A seed string picks one variant per layer and one palette, so the same seed
 * always draws the same face. Parts live in `src/data/face.json` as a small
 * shape vocabulary — path, circle, ellipse and rect, each filled with a palette
 * token — which keeps the artwork as data instead of as bitmaps.
 *
 * This replaces the 2012 PHP/GD version of the tool, which summed the ASCII
 * codes of every five hex characters of an MD5 and took that modulo the part
 * count. That sum has a bell-shaped distribution over 271 values, so the middle
 * parts came up far more often than the rest; the seed is now hashed with
 * FNV-1a and expanded with mulberry32, which draws uniformly.
 */

export type FillToken =
  | 'bg'
  | 'bgAlt'
  | 'skin'
  | 'skinShade'
  | 'hair'
  | 'hairShade'
  | 'ink'
  | 'white'
  | 'accent'
  | 'none'

export type FaceShape = {
  t: 'path' | 'circle' | 'ellipse' | 'rect'
  d?: string
  cx?: number
  cy?: number
  r?: number
  rx?: number
  ry?: number
  x?: number
  y?: number
  w?: number
  h?: number
  /** Fill token; shapes without one are not filled. */
  f?: FillToken
  /** Stroke token. */
  s?: FillToken
  sw?: number
  o?: number
  cap?: 'round' | 'butt'
  /** Draw a second copy mirrored across the vertical centre line. */
  m?: boolean
}

export type FaceVariant = { id: string; shapes: FaceShape[] }
export type FaceLayer = { name: string; label: string; variants: FaceVariant[] }
export type FacePalette = Record<string, string>

export const faceViewBox = data.viewBox
export const faceLayers = data.layers as FaceLayer[]
export const facePalettes = data.palettes as unknown as FacePalette[]
export const layerNames = faceLayers.map((layer) => layer.name)

export type FaceSelection = {
  /** Index into `facePalettes`. */
  palette: number
  /** Variant index per layer, keyed by layer name. */
  parts: Record<string, number>
}

export type FaceFrame = 'square' | 'rounded' | 'circle'

export type ResolvedShape = { shape: FaceShape; mirrored: boolean }

/** FNV-1a, 32 bit. Mixes every character, unlike a sum of character codes. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Short, shareable form of a seed's hash. */
export function codeOf(seed: string): string {
  return hashSeed(seed).toString(16).padStart(8, '0')
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Picks a palette and one variant per layer. Overrides replace a draw without
 * shifting the others, so locking one layer leaves the rest of the face alone.
 */
export function selectFace(
  seed: string,
  overrides: Partial<Record<string, number>> = {}
): FaceSelection {
  const next = mulberry32(hashSeed(seed))
  const pick = (count: number) => Math.floor(next() * count) % count
  const palette = pick(facePalettes.length)
  const parts: Record<string, number> = {}
  for (const layer of faceLayers) {
    parts[layer.name] = pick(layer.variants.length)
  }

  const paletteOverride = overrides.palette
  return {
    palette:
      paletteOverride === undefined
        ? palette
        : clamp(paletteOverride, facePalettes.length),
    parts: Object.fromEntries(
      faceLayers.map((layer) => {
        const override = overrides[layer.name]
        return [
          layer.name,
          override === undefined
            ? parts[layer.name]
            : clamp(override, layer.variants.length)
        ]
      })
    )
  }
}

function clamp(value: number, count: number): number {
  if (!Number.isInteger(value)) return 0
  return ((value % count) + count) % count
}

export function paletteOf(selection: FaceSelection): FacePalette {
  return facePalettes[clamp(selection.palette, facePalettes.length)]
}

export function variantOf(
  selection: FaceSelection,
  layer: FaceLayer
): FaceVariant {
  return layer.variants[
    clamp(selection.parts[layer.name] ?? 0, layer.variants.length)
  ]
}

/** Every shape to draw, bottom layer first, with mirrored copies expanded. */
export function faceShapes(selection: FaceSelection): ResolvedShape[] {
  const shapes: ResolvedShape[] = []
  for (const layer of faceLayers) {
    for (const shape of variantOf(selection, layer).shapes) {
      shapes.push({ shape, mirrored: false })
      if (shape.m) shapes.push({ shape, mirrored: true })
    }
  }
  return shapes
}

/** Attribute pairs for one shape, with palette tokens resolved to colours. */
export function shapeAttributes(
  shape: FaceShape,
  palette: FacePalette
): Record<string, string | number> {
  const colour = (token?: FillToken) =>
    token === undefined || token === 'none' ? 'none' : palette[token]
  const attributes: Record<string, string | number> = {}
  if (shape.d !== undefined) attributes.d = shape.d
  if (shape.cx !== undefined) attributes.cx = shape.cx
  if (shape.cy !== undefined) attributes.cy = shape.cy
  if (shape.r !== undefined) attributes.r = shape.r
  if (shape.rx !== undefined) attributes.rx = shape.rx
  if (shape.ry !== undefined) attributes.ry = shape.ry
  if (shape.x !== undefined) attributes.x = shape.x
  if (shape.y !== undefined) attributes.y = shape.y
  if (shape.w !== undefined) attributes.width = shape.w
  if (shape.h !== undefined) attributes.height = shape.h
  attributes.fill = colour(shape.f)
  if (shape.s !== undefined) {
    attributes.stroke = colour(shape.s)
    attributes['stroke-width'] = shape.sw ?? 2
    if (shape.cap) attributes['stroke-linecap'] = shape.cap
    attributes['stroke-linejoin'] = 'round'
  }
  if (shape.o !== undefined) attributes.opacity = shape.o
  return attributes
}

export const MIRROR_TRANSFORM = 'translate(100,0) scale(-1,1)'

export function frameRadius(frame: FaceFrame): number {
  if (frame === 'circle') return 50
  return frame === 'rounded' ? 22 : 0
}

/** Standalone SVG markup, for copying or downloading a face. */
export function faceToSvg(
  selection: FaceSelection,
  options: { size?: number; frame?: FaceFrame; seed?: string } = {}
): string {
  const size = options.size ?? 256
  const frame = options.frame ?? 'rounded'
  const palette = paletteOf(selection)
  const radius = frameRadius(frame)
  const body = faceShapes(selection)
    .map(({ shape, mirrored }) => {
      const tag = shape.t === 'path' ? 'path' : shape.t
      const attributes = Object.entries(shapeAttributes(shape, palette))
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ')
      const element = `<${tag} ${attributes} />`
      return mirrored
        ? `<g transform="${MIRROR_TRANSFORM}">${element}</g>`
        : element
    })
    .join('')
  const title = options.seed
    ? `<title>Face Kit avatar for ${escapeXml(options.seed)}</title>`
    : `<title>${escapeXml(describeFace(selection))}</title>`
  const clip =
    radius === 0
      ? ''
      : `<defs><clipPath id="face-frame"><rect x="0" y="0" width="100" height="100" rx="${radius}" ry="${radius}" /></clipPath></defs>`
  const group =
    radius === 0 ? body : `<g clip-path="url(#face-frame)">${body}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${faceViewBox}" width="${size}" height="${size}" role="img">${title}${clip}${group}</svg>`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
}

/** Plain-language summary, used as the image label. */
export function describeFace(selection: FaceSelection): string {
  const parts = faceLayers
    .filter((layer) => layer.name !== 'bg')
    .map(
      (layer) =>
        `${layer.label.toLowerCase()} ${variantOf(selection, layer).id}`
    )
  return `Avatar in the ${paletteOf(selection).id} palette: ${parts.join(', ')}.`
}

/** Total number of distinct faces the data can produce. */
export function faceCombinations(): number {
  return faceLayers.reduce(
    (total, layer) => total * layer.variants.length,
    facePalettes.length
  )
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8)
}
