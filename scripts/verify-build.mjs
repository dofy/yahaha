import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { parse } from 'parse5'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const files = readdirSync(dist, { recursive: true }).filter((path) =>
  path.endsWith('index.html')
)
assert.equal(files.length, 13, 'Expected all thirteen site pages')
const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8')
const robots = readFileSync(join(dist, 'robots.txt'), 'utf8')
const canonicalUrls = []
const language = {
  '/tarot/': 'zh-Hans',
  '/heart/hans/': 'zh-Hans',
  '/heart/hant/': 'zh-Hant',
  '/heart/original/': 'sa'
}

function flatten(node) {
  return [node, ...(node.childNodes ?? []).flatMap(flatten)]
}
function attribute(node, name) {
  return node.attrs?.find((attr) => attr.name === name)?.value
}
function content(node) {
  return node.nodeName === '#text'
    ? node.value
    : (node.childNodes ?? []).map(content).join('')
}

for (const file of files) {
  const path =
    file === 'index.html'
      ? '/'
      : `/${file.replaceAll('\\', '/').replace(/index\.html$/u, '')}`
  const nodes = flatten(parse(readFileSync(join(dist, file), 'utf8')))
  const byTag = (tag) => nodes.filter((node) => node.tagName === tag)
  const meta = (key, value) =>
    byTag('meta').find((node) => attribute(node, key) === value)
  const canonical = byTag('link').find(
    (node) => attribute(node, 'rel') === 'canonical'
  )
  const url = `https://yahaha.net${path}`
  assert.equal(
    attribute(byTag('html')[0], 'lang'),
    language[path] ?? 'en',
    `${path}: language`
  )
  assert.equal(byTag('h1').length, 1, `${path}: exactly one main heading`)
  assert.ok(content(byTag('title')[0]).trim(), `${path}: title`)
  assert.equal(attribute(canonical, 'href'), url, `${path}: canonical`)
  assert.equal(
    attribute(meta('property', 'og:url'), 'content'),
    url,
    `${path}: Open Graph URL`
  )
  assert.equal(attribute(meta('property', 'og:type'), 'content'), 'website')
  const description = attribute(meta('name', 'description'), 'content')
  assert.ok(description?.length > 20, `${path}: meaningful description`)
  assert.equal(
    attribute(meta('property', 'og:description'), 'content'),
    description
  )
  assert.match(
    attribute(meta('property', 'og:image'), 'content'),
    /^https:\/\//u
  )
  assert.equal(
    attribute(meta('name', 'twitter:description'), 'content'),
    description
  )
  canonicalUrls.push(url)
  if (path !== '/')
    assert.ok(
      byTag('a').some((node) => attribute(node, 'href') === '/'),
      `${path}: home navigation`
    )

  for (const node of nodes.filter((node) =>
    ['a', 'link', 'script', 'img'].includes(node.tagName)
  )) {
    const target = attribute(node, 'href') ?? attribute(node, 'src')
    if (!target || /^(?:[a-z]+:|\/\/|#)/iu.test(target)) continue
    const assetPath = decodeURIComponent(new URL(target, url).pathname)
    const diskPath = join(dist, assetPath)
    assert.ok(
      existsSync(diskPath) || existsSync(join(diskPath, 'index.html')),
      `${path}: missing internal asset or link ${target}`
    )
  }
}

const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/gu)].map(
  (match) => match[1]
)
assert.deepEqual(
  sitemapUrls.sort(),
  canonicalUrls.sort(),
  'Sitemap must contain every page exactly once'
)
assert.ok(
  robots.includes('Sitemap: https://yahaha.net/sitemap.xml'),
  'Robots sitemap URL'
)
const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'))
for (const shortcut of manifest.shortcuts) {
  assert.ok(
    shortcut.url.startsWith('/'),
    'Manifest shortcuts must stay in the app scope'
  )
  assert.ok(
    existsSync(join(dist, shortcut.url, 'index.html')),
    `Missing shortcut ${shortcut.url}`
  )
}
const home = readFileSync(join(dist, 'index.html'), 'utf8')
const emojiSources = JSON.parse(
  readFileSync(join(root, 'src/data/emoji/sources.json'), 'utf8')
)
const emojiAssets = readdirSync(join(dist, '_astro')).filter((path) =>
  /^catalogue\..*\.json$/u.test(path)
)
assert.equal(
  emojiAssets.length,
  1,
  'Emoji dictionary must ship as one hashed static JSON'
)
const emojiData = readFileSync(join(dist, '_astro', emojiAssets[0]))
assert.equal(
  createHash('sha256').update(emojiData).digest('hex'),
  emojiSources.catalogueSha256,
  'Production emoji data must match the verified catalogue'
)
assert.equal(JSON.parse(emojiData.toString('utf8')).length, 3944)
assert.ok(
  readFileSync(join(dist, 'emoji-unicode-license.txt'), 'utf8').includes(
    'UNICODE LICENSE V3'
  )
)
assert.ok(
  !/<astro-island\b[^>]*component-url="[^"]*Mascot/u.test(home),
  'Static mascot should not hydrate'
)
console.log(
  `Verified ${files.length} pages: metadata, languages, internal links/assets, sitemap, manifest and static mascot.`
)
