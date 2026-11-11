<div align="center">

# Seven's personal website

**Personal apps, browser tools, and open-source projects.**

_The answer exists only in the Tao._

[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build)
[![React](https://img.shields.io/badge/React-19-087EA4?logo=react&logoColor=white)](https://react.dev)
[![three.js](https://img.shields.io/badge/three.js-0.170-000000?logo=threedotjs&logoColor=white)](https://threejs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)

[**yahaha.net**](https://yahaha.net) · [dofy.net](https://dofy.net) · [PHPz.xyz](https://phpz.xyz) · [PHPz.org](https://phpz.org)

</div>

---

## Tools

| Route                                                             | What it does                                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`/`](https://yahaha.net/)                                        | Home — a folded-paper 3D map: five cities of apps, tools, repos and links   |
| [`/24points`](https://yahaha.net/24points)                        | Solves the 24-points card game for any four numbers                         |
| [`/tarot`](https://yahaha.net/tarot)                              | All 22 Major Arcana, with upright and reversed readings                     |
| [`/emoji`](https://yahaha.net/emoji)                              | Finds and copies Emoji 17.0 with Chinese, English and Apple search keywords |
| [`/emoticon`](https://yahaha.net/emoticon)                        | Generates kaomoji — click to copy                                           |
| [`/ascii-art`](https://yahaha.net/ascii-art)                      | Generate and copy ASCII art with FIGlet fonts                               |
| [`/morse`](https://yahaha.net/morse)                              | Text ⇄ morse code, click the result to copy                                 |
| [`/face`](https://yahaha.net/face)                                | Face Kit — turns any name into an SVG avatar                                |
| [`/lock`](https://yahaha.net/lock)                                | Lock Kit — single- and double-row key bitting codes                         |
| [`/heart/{hans,hant,en,original}`](https://yahaha.net/heart/hans) | Heart Sutra in Simplified, Traditional, English, and Sanskrit               |

The repository is named `yahaha`; the website identifies itself by the current domain.
Tools run entirely in the browser. There is no API, database or analytics. Social
favicons are local assets; GitHub star badges load from shields.io.

The homepage is a 3D map built with the [site-to-map](https://github.com/dofy/site-to-map)
engine. site-to-map is also an agent skill: give it any personal homepage or navigation
site and it builds the same kind of map. Five cities hold the apps, browser tools, open-source repositories, Heart Sutra
editions and social links, and every item has its own landmark building. Each domain grows
its own generated land; light and colours follow the visitor's local time, and the map
speaks Simplified and Traditional Chinese, Japanese and English. All of it is configured in
`src/data/map.json`.

Emoji search covers 3,944 fully-qualified Emoji 17.0 sequences with CLDR 48.2
Simplified Chinese, Traditional Chinese and English annotations, modern macOS
Apple search terms, and the original input-method aliases. Results are ranked,
deduplicated and selectable for copying. The catalogue loads as a cached static
asset rather than a large JavaScript module.

Run `pnpm emoji:update` with Python 3 to rebuild the data; use
`pnpm emoji:update --refresh-apple` on macOS to refresh the Apple snapshot.
See [data provenance, update instructions and search behavior](docs/emoji-data.md).

Emoticon Kit combines eight character pools containing 268 candidate entries,
184 distinct strings and 177 distinct Unicode code points. Paired eyes and face
frames share an index; arms, mouths and decorations are drawn independently.
See the [complete character inventory and maintenance notes](docs/emoticon-characters.md).

## Design

The homepage map is folded paper: flat-shaded low-poly land with ink-line edges, eight
times of day from sunrise to late night, and an interface that changes colour with them.
It opens from the sea looking inland; the Map button returns to that view. There is no
theme switch on the homepage, because the time of day is the theme.

The tool pages share their visual language with the Cruft, WordClip and LinguaDock
websites: paper white (`#fffdfc`), coral (`#ff6554`), rounded system fonts, faint
horizontal rules, solid working surfaces and rounded rectangular controls. Light, dark and
system themes are available there. Coral text uses a deeper tone in light mode for
readable contrast; filled coral buttons use dark text. The original favicon marks the
header and footer, and the original kaomoji image stays centred above the footer.

This is Seven's personal website. The site name and browser title follow the current
domain, using the configured names for dofy.net, PHPz.xyz, PHPz.org and yahaha.net.

## Quick start

```bash
# Node 22.23.4 or newer in the Node 22 release line (.nvmrc)
pnpm install --frozen-lockfile
pnpm dev        # → http://localhost:4321
```

| Script         | Does                                                               |
| -------------- | ------------------------------------------------------------------ |
| `pnpm dev`     | Dev server with HMR                                                |
| `pnpm build`   | Static production build → `dist/`                                  |
| `pnpm preview` | Serve the built `dist/` locally                                    |
| `pnpm check`   | Type-check Astro, React and TypeScript                             |
| `pnpm lint`    | ESLint, including Astro and JSX accessibility rules                |
| `pnpm test`    | Node and Python regressions, including all 1,820 card combinations |
| `pnpm verify`  | Lint → type check → tests → build → static-output checks           |
| `pnpm audit`   | Check installed dependencies for published advisories              |

Output is fully static, so `dist/` can be served from anywhere. `pnpm verify` is
the local gate. GitHub Actions runs the same checks plus a dependency audit.
Static-output checks cover all thirteen pages, language and sharing metadata, internal
links and assets, sitemap entries, manifest shortcuts, and absence of mascot hydration.

The 24-points solver uses exact fractions and all binary expression shapes. Its
tests compare every unordered input against an independent five-shape oracle and
validate each returned expression. Morse supports both encoding and decoding;
letters use spaces, words use `/`, and unsupported input stays visible as `?`.

## Deployment

Production uses the Git-connected Cloudflare Pages project `yahaha`, with `main`
as the production branch, `pnpm build` as the build command and `dist/` as output.
The custom domains are dofy.net, PHPz.xyz, PHPz.org and yahaha.net.

Before an authorized release, run `pnpm verify` and
`pnpm audit --audit-level moderate`, then fast-forward `main` to the verified
commit. Other branches produce previews. GitHub checks and Pages builds run
independently: confirm both succeed, confirm the production deployment's commit,
and check the custom domains and shipped assets. See [release evidence and limits](docs/verification.md).

## Documentation

Start with the [docs index](docs/README.md), which links the Emoticon Kit character
inventory, Emoji data notes and dated verification/release records.

## Structure

```
src/
├── pages/                  # each .astro file is a route
│   ├── index.astro         # full-screen 3D map (no Base layout)
│   ├── 24points.astro
│   ├── emoji.astro
│   ├── emoticon.astro
│   ├── morse.astro
│   ├── tarot.astro
│   ├── face.astro
│   ├── lock.astro
│   ├── ascii-art.astro
│   └── heart/[lang].astro  # dynamic lang param
├── layouts/
│   └── Base.astro           # tool pages: <head> meta, anti-FOUC theme guard, header/footer
├── components/
│   ├── Header.astro         # shared navigation
│   ├── SiteBrand.astro      # original favicon + current domain
│   ├── Footer.astro
│   ├── Logo.astro           # original kaomoji image above the footer
│   ├── islands/             # React, hydrated with client:*
│   │   ├── ThemeToggle.tsx
│   │   ├── Mascot.tsx       # pixel explorer (SVG dot grid)
│   │   ├── EmojiSearch.tsx
│   │   ├── EmoticonKit.tsx
│   │   ├── MorseCode.tsx
│   │   ├── Points24.tsx
│   │   ├── TarotBrowser.tsx
│   │   ├── FaceKit.tsx
│   │   ├── LockKit.tsx
│   │   └── AsciiArt.tsx
│   └── ui/                  # shadcn-style primitives
├── scripts/                 # map-engine.js, world-gen.js, daylight.js (from site-to-map)
├── data/                    # static JSON — map, heart, morse, tarot, emoji, face
├── lib/                     # pure logic (solvers, generators)
└── styles/
    └── globals.css          # shared app-site tokens, layout, motion
```

Interactive islands are hydrated individually. Every tool page includes the shared
header, theme control and footer; static text does not hydrate. The homepage renders its
own metadata, a static heading and a no-JavaScript link list, then mounts the map.

## Implementation notes

A few decisions that are easy to get wrong and worth knowing before editing:

**Change the map engine upstream.** `src/scripts/map-engine.js`, `world-gen.js` and
`daylight.js` come from [site-to-map](https://github.com/dofy/site-to-map); edit them there
and copy them back. `daylight.js` is also inlined in the homepage `<head>` so the first
frame already has the right colours. Map content, its four languages and the GitHub link
live in `src/data/map.json`; keep every language together when you edit a string.

**Keep the app-site palette aligned.** The base colors and typography come from
`../LinguaDock/website/styles.css`, `../Cruft/website/styles.css` and
`../wordclip/website/styles.css`. Site-specific dark colors live in `.dark`;
semantic aliases resolve through `var()` in both themes.

**Use the right accent.** `bg-accent` plus `text-accent-foreground` is for a
filled control; `text-accent-text` is for links and text. The deeper light-mode
text accent improves contrast without changing the shared coral fill.

**Keep working surfaces solid.** On the tool pages `.panel`, `.panel-solid` and `.chip` use
the same theme-aware backing and a fine border, without shadows; sections use whitespace
and dividers.

**Fonts follow the app websites.** Body text uses the rounded system stack;
JetBrains Mono remains self-hosted for tool output. No font is fetched from a
third-party host.

**Keep content visible.** Sections do not depend on scroll-reveal JavaScript.
The page entrance and native theme-transition animation respect reduced motion.

Longer architecture notes live in [`CLAUDE.md`](./CLAUDE.md). The map engine, its options
and the skill that converts other sites are documented in
[dofy/site-to-map](https://github.com/dofy/site-to-map).

---

<div align="center">

A personal project by [**@dofy**](https://github.com/dofy)

<sub>☉ゝ☉''</sub>

</div>
