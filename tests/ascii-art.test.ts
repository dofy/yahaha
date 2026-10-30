import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  availableFonts,
  matchesFont,
  normalizeAsciiInput
} from '../src/lib/ascii-art.ts'

test('font search matches case-insensitive subsequences', () => {
  assert.equal(matchesFont('Small Slant', 'sml slnt'), true)
  assert.equal(matchesFont('Standard', 'STD'), true)
  assert.equal(matchesFont('Standard', 'slant'), false)
  assert.equal(matchesFont('Standard', ''), true)
})

test('ASCII input preserves line breaks and replaces unsupported characters', () => {
  assert.equal(normalizeAsciiInput('Hello\r\n世界\n😀'), 'Hello\n??\n?')
})

test('random font candidates exclude every font in use', () => {
  assert.deepEqual(availableFonts(['A', 'B', 'C'], ['A', 'C', 'A']), ['B'])
  assert.deepEqual(availableFonts(['A', 'B'], ['A', 'B']), [])
})
