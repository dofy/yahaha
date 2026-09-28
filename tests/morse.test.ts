import assert from 'node:assert/strict'
import test from 'node:test'
import alphabet from '../src/data/morse.json' with { type: 'json' }
import { encodeMorse, decodeMorse } from '../src/lib/morse.ts'

test('encodes letters, punctuation and word boundaries', () => {
  assert.deepEqual(encodeMorse('  Hello\nworld! '), {
    output: '.... . .-.. .-.. --- / .-- --- .-. .-.. -.. -.-.--',
    unsupported: []
  })
  assert.equal(encodeMorse('SOS').output, '... --- ...')
  assert.equal(encodeMorse('A B').output, '.- / -...')
})

test('preserves unsupported Unicode characters as one placeholder each', () => {
  assert.deepEqual(encodeMorse('A中😀B中'), {
    output: '.- ? ? -... ?',
    unsupported: ['中', '😀']
  })
})

test('decodes common separators and typographic dots/dashes', () => {
  assert.deepEqual(decodeMorse('... --- ... / .- -...'), {
    output: 'SOS AB',
    unsupported: []
  })
  assert.equal(decodeMorse('... --- ...   .- -...').output, 'SOS AB')
  assert.equal(decodeMorse('··· ——— •••').output, 'SOS')
})

test('reports unknown codes without silently dropping them', () => {
  assert.deepEqual(decodeMorse('.- ........ -...'), {
    output: 'A?B',
    unsupported: ['........']
  })
  assert.deepEqual(decodeMorse('hello'), {
    output: '?',
    unsupported: ['hello']
  })
})

test('empty input stays empty', () => {
  for (const input of ['', '   ', '\n\t']) {
    assert.deepEqual(encodeMorse(input), { output: '', unsupported: [] })
    assert.deepEqual(decodeMorse(input), { output: '', unsupported: [] })
  }
})

test('every supported character round-trips without collisions', () => {
  const codes = new Set<string>()
  for (const [letter, code] of Object.entries(alphabet)) {
    if (letter === ' ') continue
    assert.ok(!codes.has(code), `Duplicate code for ${letter}`)
    codes.add(code)
    assert.equal(decodeMorse(encodeMorse(letter).output).output, letter)
  }
})
