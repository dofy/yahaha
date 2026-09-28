import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import catalogue from '../src/data/emoji/catalogue.json' with { type: 'json' }
import sources from '../src/data/emoji/sources.json' with { type: 'json' }
import {
  createEmojiSearch,
  normalizeEmojiQuery,
  type EmojiEntry
} from '../src/lib/emoji.ts'

const entries = catalogue as EmojiEntry[]
const search = createEmojiSearch(entries)
const emojiFor = (query: string) =>
  search(query).map(({ entry }) => entry.emoji)

test('complete Emoji 17.0 catalogue has translated names and unique qualified sequences', () => {
  assert.equal(entries.length, 3944)
  assert.equal(sources.emojiCount, 3944)
  assert.equal(sources.cldrVersion, '48.2')
  assert.equal(
    new Set(entries.map((entry) => normalizeEmojiQuery(entry.emoji))).size,
    3944
  )
  for (const entry of entries) {
    assert.ok(entry.name && entry.nameHant && entry.englishName, entry.emoji)
    assert.ok(entry.keywords.length > 0)
    assert.equal(new Set(entry.keywords).size, entry.keywords.length)
    for (const [term, weight] of entry.appleKeywords || []) {
      assert.ok(term && Number.isFinite(weight) && weight >= 0, entry.emoji)
    }
  }
  for (const [file, expected] of [
    ['catalogue.json', sources.catalogueSha256],
    ['apple-zh.json', sources.appleSnapshotSha256]
  ]) {
    const actual = createHash('sha256')
      .update(
        readFileSync(new URL(`../src/data/emoji/${file}`, import.meta.url))
      )
      .digest('hex')
    assert.equal(actual, expected, file)
  }
})

test('both modern Apple Chinese document indexes are completely mapped', () => {
  for (const locale of ['zh_CN', 'zh_TW'] as const) {
    assert.equal(sources.apple.counts[locale].documents, 1878)
    assert.equal(sources.apple.counts[locale].mappedDocuments, 1878)
  }
  for (const [query, expected] of [
    ['收到', '🫡'],
    ['粉心', '🩷'],
    ['浴火重生', '🐦‍🔥'],
    ['热瘫', '🫠'],
    ['眼袋', '🫩'],
    ['指紋', '🫆']
  ] as const) {
    assert.equal(emojiFor(query)[0], expected, query)
  }
})

test('new emoji, skin tones, flags and joined sequences can be searched directly', () => {
  for (const emoji of [
    '🫠',
    '🫡',
    '🩷',
    '🪿',
    '🐦‍🔥',
    '🫩',
    '🫆',
    '🫪',
    '🫱🏽‍🫲🏼',
    '🇨🇳',
    '👨‍👩‍👧‍👦'
  ]) {
    assert.equal(emojiFor(emoji)[0], emoji)
  }
  assert.equal(emojiFor('♥')[0], '♥️')
  assert.equal(emojiFor('0⃣️')[0], '0️⃣')
})

test('all catalogue sequences round-trip as the top search result', () => {
  // This checks every sequence and catches VS16/ZWJ/keycap collisions.
  for (const { emoji } of entries) assert.equal(emojiFor(emoji)[0], emoji)
})

test('Simplified, Traditional, English and old Apple aliases remain searchable', () => {
  for (const query of ['熊猫', '熊貓', '  ＰＡＮＤＡ  '])
    assert.equal(emojiFor(query)[0], '🐼')
  assert.equal(emojiFor('SALUTING FACE')[0], '🫡')
  assert.equal(emojiFor('天狗')[0], '👺')
  assert.deepEqual(emojiFor(''), [])
  assert.deepEqual(emojiFor('  \n '), [])
  assert.deepEqual(emojiFor('this term cannot exist 93874293'), [])
})

test('happy exact synonyms rank ahead of negated substring matches without duplicate emoji', () => {
  const result = search('开心')
  assert.equal(result[0].matchedTerm, '开心')
  assert.notEqual(result[0].entry.emoji, '😞')
  assert.ok(
    result.findIndex(({ entry }) => entry.emoji === '😃') <
      result.findIndex(({ entry }) => entry.emoji === '😞')
  )
  assert.equal(
    new Set(result.map(({ entry }) => entry.emoji)).size,
    result.length
  )
})

test('names, exact synonyms, prefixes and substrings keep a stable priority', () => {
  const entry = (
    emoji: string,
    name: string,
    keywords: string[],
    appleKeywords?: [string, number][]
  ): EmojiEntry => ({
    emoji,
    name,
    nameHant: name,
    englishName: emoji,
    keywords,
    appleKeywords
  })
  const local = createEmojiSearch([
    entry('😞', 'not happy', ['不开心'], [['不开心', 1000]]),
    entry('😄', 'happy prefix', ['开心笑脸']),
    entry('😃', 'happy synonym', ['开心']),
    entry('😀', '开心', [])
  ])
  assert.deepEqual(
    local('开心').map(({ entry }) => entry.emoji),
    ['😀', '😃', '😄', '😞']
  )
  const weighted = createEmojiSearch([
    entry(
      '😀',
      'one',
      [],
      [
        ['收到', 10],
        ['其他', 100]
      ]
    ),
    entry(
      '🫡',
      'two',
      [],
      [
        ['收到', 90],
        ['其他', 100]
      ]
    )
  ])
  assert.deepEqual(
    weighted('收到').map(({ entry }) => entry.emoji),
    ['🫡', '😀']
  )
})

test('presentation variants deduplicate and English multiword search matches across terms', () => {
  const base: EmojiEntry = {
    emoji: '♥️',
    name: '红心',
    nameHant: '紅心',
    englishName: 'heart',
    keywords: ['red', 'love']
  }
  const local = createEmojiSearch([base, { ...base, emoji: '♥' }])
  assert.equal(local('heart').length, 1)
  assert.equal(local('love red')[0].entry.emoji, '♥️')
  assert.equal(local('love banana').length, 0)
})
