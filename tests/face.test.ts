import assert from 'node:assert/strict'
import test from 'node:test'
import {
  codeOf,
  describeFace,
  faceCombinations,
  faceLayers,
  facePalettes,
  faceShapes,
  faceToSvg,
  hashSeed,
  layerNames,
  paletteOf,
  selectFace,
  shapeAttributes,
  variantOf
} from '../src/lib/face.ts'

const tokens = new Set([...Object.keys(facePalettes[0]), 'none'])

test('the part data only uses known shapes and palette tokens', () => {
  for (const layer of faceLayers) {
    const ids = layer.variants.map((variant) => variant.id)
    assert.equal(new Set(ids).size, ids.length, `${layer.name}: unique ids`)
    assert.ok(layer.variants.length >= 6, `${layer.name}: enough variants`)
    for (const variant of layer.variants) {
      for (const shape of variant.shapes) {
        assert.ok(
          ['path', 'circle', 'ellipse', 'rect'].includes(shape.t),
          `${layer.name}/${variant.id}: shape type ${shape.t}`
        )
        for (const token of [shape.f, shape.s]) {
          if (token !== undefined) {
            assert.ok(
              tokens.has(token),
              `${layer.name}/${variant.id}: ${token}`
            )
          }
        }
        if (shape.t === 'path') assert.ok(shape.d, 'paths need a d')
        if (shape.t === 'circle') assert.ok(shape.r, 'circles need r')
        if (shape.t === 'rect') assert.ok(shape.w && shape.h, 'rects need size')
      }
    }
  }
})

test('every face silhouette is outlined, so skin never merges into the backdrop', () => {
  const face = faceLayers.find((layer) => layer.name === 'face')!
  for (const variant of face.variants) {
    for (const shape of variant.shapes) {
      assert.equal(shape.s, 'outline', `${variant.id}: silhouette stroke`)
      assert.ok((shape.sw ?? 0) > 0, `${variant.id}: stroke width`)
    }
  }
})

test('the outline token separates the head from every background', () => {
  const channel = (value: number) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((index) =>
      channel(Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    )
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contrast = (a: string, b: string) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (high + 0.05) / (low + 0.05)
  }
  for (const palette of facePalettes) {
    for (const against of ['bg', 'bgAlt', 'skin'] as const) {
      assert.ok(
        contrast(palette.outline, palette[against]) >= 3,
        `${palette.id}: outline against ${against}`
      )
    }
  }
})

test('every palette defines the same tokens', () => {
  const keys = Object.keys(facePalettes[0]).sort()
  for (const palette of facePalettes) {
    assert.deepEqual(Object.keys(palette).sort(), keys, palette.id)
    for (const [key, value] of Object.entries(palette)) {
      if (key === 'id') continue
      assert.match(value, /^#[0-9a-f]{6}$/u, `${palette.id}.${key}`)
    }
  }
})

test('a seed always draws the same face', () => {
  const first = selectFace('Seven')
  assert.deepEqual(selectFace('Seven'), first)
  assert.notDeepEqual(selectFace('seven'), first)
  assert.notDeepEqual(selectFace('Seven '), first)
  assert.equal(codeOf('Seven'), codeOf('Seven'))
  assert.match(codeOf('Seven'), /^[0-9a-f]{8}$/u)
  assert.equal(hashSeed(''), 0x811c9dc5)
})

test('selections stay inside the data', () => {
  for (let index = 0; index < 500; index += 1) {
    const selection = selectFace(`seed-${index}`)
    assert.ok(selection.palette >= 0 && selection.palette < facePalettes.length)
    assert.deepEqual(
      Object.keys(selection.parts).sort(),
      [...layerNames].sort()
    )
    for (const layer of faceLayers) {
      const value = selection.parts[layer.name]
      assert.ok(
        Number.isInteger(value) && value >= 0 && value < layer.variants.length,
        `${layer.name}: ${value}`
      )
    }
  }
})

test('variants are drawn uniformly, unlike the 2012 character-sum version', () => {
  const samples = 20_000
  const counts = new Map<string, number[]>(
    faceLayers.map((layer) => [
      layer.name,
      new Array(layer.variants.length).fill(0)
    ])
  )
  for (let index = 0; index < samples; index += 1) {
    const selection = selectFace(`user-${index}`)
    for (const layer of faceLayers) {
      counts.get(layer.name)![selection.parts[layer.name]] += 1
    }
  }
  for (const layer of faceLayers) {
    const hits = counts.get(layer.name)!
    const expected = samples / layer.variants.length
    for (const [index, hit] of hits.entries()) {
      const drift = Math.abs(hit - expected) / expected
      assert.ok(
        drift < 0.12,
        `${layer.name}/${layer.variants[index].id} drifts ${(drift * 100).toFixed(1)}% from uniform`
      )
    }
  }
})

test('overrides replace one layer and leave the others alone', () => {
  const base = selectFace('Seven')
  const eyeIndex = (base.parts.eye + 3) % faceLayers[4].variants.length
  const forced = selectFace('Seven', { eye: eyeIndex })
  assert.equal(forced.parts.eye, eyeIndex)
  assert.equal(forced.palette, base.palette)
  for (const layer of faceLayers) {
    if (layer.name === 'eye') continue
    assert.equal(forced.parts[layer.name], base.parts[layer.name], layer.name)
  }
  assert.equal(selectFace('Seven', { palette: 2 }).palette, 2)
  // Out-of-range overrides wrap instead of producing an empty layer.
  assert.equal(selectFace('Seven', { eye: -1 }).parts.eye, 9)
  assert.equal(
    selectFace('Seven', { palette: 99 }).palette,
    99 % facePalettes.length
  )
})

test('shape attributes resolve palette tokens to colours', () => {
  const palette = facePalettes[0]
  const attributes = shapeAttributes(
    {
      t: 'circle',
      cx: 1,
      cy: 2,
      r: 3,
      f: 'ink',
      s: 'accent',
      sw: 2,
      cap: 'round'
    },
    palette
  )
  assert.equal(attributes.fill, palette.ink)
  assert.equal(attributes.stroke, palette.accent)
  assert.equal(attributes['stroke-width'], 2)
  assert.equal(attributes['stroke-linecap'], 'round')
  assert.equal(
    shapeAttributes({ t: 'path', d: 'M0 0', f: 'none' }, palette).fill,
    'none'
  )
  assert.equal(shapeAttributes({ t: 'path', d: 'M0 0' }, palette).fill, 'none')
})

test('mirrored shapes are drawn twice', () => {
  const selection = selectFace('mirror', { eye: 0, face: 0, extra: 0, hair: 0 })
  const shapes = faceShapes(selection)
  const mirrored = shapes.filter((entry) => entry.mirrored)
  assert.ok(mirrored.length >= 2, 'ears and eyes mirror')
  for (const entry of mirrored) {
    assert.equal(entry.shape.m, true)
    assert.ok(
      shapes.some((other) => other.shape === entry.shape && !other.mirrored),
      'every mirrored copy has an original'
    )
  }
})

test('faceToSvg renders standalone, framed markup', () => {
  const selection = selectFace('Seven')
  const svg = faceToSvg(selection, { size: 128, seed: 'Seven' })
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'))
  assert.ok(svg.includes('viewBox="0 0 100 100"'))
  assert.ok(svg.includes('width="128" height="128"'))
  assert.ok(svg.includes('<title>Face Kit avatar for Seven</title>'))
  assert.ok(svg.includes('clip-path="url(#face-frame)"'))
  assert.ok(svg.includes(paletteOf(selection).skin))
  assert.ok(!svg.includes('undefined'))
  assert.ok(svg.endsWith('</svg>'))

  const square = faceToSvg(selection, { frame: 'square' })
  assert.ok(!square.includes('clip-path'))
  assert.ok(faceToSvg(selection, { frame: 'circle' }).includes('rx="50"'))

  const mirrors = faceShapes(selection).filter((entry) => entry.mirrored).length
  assert.equal(svg.split('translate(100,0) scale(-1,1)').length - 1, mirrors)
})

test('faceToSvg escapes the seed it prints', () => {
  const svg = faceToSvg(selectFace('x'), { seed: '<script>&"' })
  assert.ok(svg.includes('&lt;script&gt;&amp;&quot;'))
  assert.ok(!svg.includes('<script>'))
})

test('describeFace names the palette and every visible layer', () => {
  const selection = selectFace('Seven')
  const description = describeFace(selection)
  assert.ok(description.includes(paletteOf(selection).id))
  for (const layer of faceLayers) {
    if (layer.name === 'bg') continue
    assert.ok(
      description.includes(variantOf(selection, layer).id),
      `${layer.name} missing from the description`
    )
  }
})

test('the catalogue is large enough to be worth seeding', () => {
  assert.equal(faceCombinations(), 245_760_000)
})
