# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Astro 7 (static output) · React 19 islands · TypeScript · TailwindCSS 4 · pnpm

Tailwind 4 is wired as a **Vite plugin** (`@tailwindcss/vite` in `astro.config.mjs`),
not via `@astrojs/tailwind` (v3-only tooling). There is no `tailwind.config.*` —
all tokens live in `@theme` inside `src/styles/globals.css`. Note that Tailwind 4
auto-detects content across the whole project, **including `.md` files** — a class
name written in this file will generate a real utility.

## Commands

```bash
pnpm dev      # Astro dev server on localhost:4321
pnpm build    # Static production build → dist/
pnpm preview  # Serve the built dist/ locally
```

Run `pnpm verify` before delivery: ESLint (Astro/JSX accessibility included),
`astro check`, Node/Python regression tests, production build and static-output checks.
Run `pnpm audit --audit-level moderate` to check published dependency advisories. CI runs both.
Use Node 22.22.3+ on the Node 22 release line; no separate test runner is needed.

## Project Structure

Seven's personal site on dofy.net, PHPz.xyz, PHPz.org and yahaha.net;
`yahaha` is the repository and hosting-project name, not a fixed website label.
Each page in `src/pages/` is a self-contained route with its own data + UI.

```
src/
├── pages/          # Astro routes — each .astro file is a page
│   ├── index.astro       # Homepage: full-screen 3D map (no Base): map-engine.js + data/map.json
│   ├── 24points.astro    # 24-points solver
│   ├── emoji.astro       # Emoji search (EmojiSearch island)
│   ├── emoticon.astro    # Emoticon generator
│   ├── face.astro        # Face Kit (FaceKit island: seeded SVG avatars)
│   ├── lock.astro        # Lock Kit (LockKit island: single/double row bittings)
│   ├── morse.astro       # Morse code
│   ├── tarot.astro       # Tarot (TarotBrowser island)
│   └── heart/[lang].astro# Heart Sutra, dynamic lang param
├── layouts/
│   └── Base.astro        # Universal wrapper: <head> meta, theme FOUC guard, Header, ThemeToggle, Footer
├── components/
│   ├── LinkBlock.astro   # Homepage toolbox, projects and personal links
│   ├── Header.astro      # Shared navigation and theme control slot
│   ├── SiteBrand.astro   # Original favicon + current domain label
│   ├── Footer.astro      # domains.json nav + copyright
│   ├── Logo.astro        # original kaomoji image above the footer
│   ├── islands/          # React islands (client:* hydration)
│   │   ├── ThemeToggle.tsx   # 3-state light→dark→auto cycle + theme-color meta
│   │   └── Mascot.tsx        # Original pixel explorer (grid SVG) — pixel easter egg
│   └── ui/               # shadcn-style primitives (Button, Input, Select, Tabs, Tooltip, Badge)
├── data/           # Static JSON: links, domains, keywords, heart, morse, tarot, emoji/
├── lib/            # Pure logic (solvers, generators)
└── styles/
    └── globals.css # @theme tokens + shared app-site layout + motion
```

## Architecture Notes

- **`src/lib/site.ts`** defines page descriptions and language tags and drives
  canonical URLs and `sitemap.xml`. Keep it aligned with all page routes.
- **`src/lib/identity.ts`** resolves the current hostname against `domains.json`.
  Base applies the domain name to both SiteBrand instances and the browser title;
  static share metadata and the manifest identify Seven's personal website.
- **`Base.astro`** wraps every route with metadata, the theme FOUC guard,
  `Header` (with `ThemeToggle`), the original `Logo` image and `Footer`. Pass `title` and `wide` props.
  The homepage uses a 1180px container; tool pages use narrower working areas.
- **Path alias `@/`** maps to `./src/*` in `tsconfig.json`.
- **Visual style matches the app websites** in `../Cruft/website/styles.css`,
  `../wordclip/website/styles.css` and `../LinguaDock/website/styles.css`:
  `#fffdfc` paper, `#171614` ink, `#ff6554` coral, `#eaf1f4` blue wash,
  rounded system fonts, subtle horizontal rules and generous spacing.
- **Surfaces are solid.** `.panel`, `.panel-strong`, `.panel-solid` and `.chip`
  share theme-aware backgrounds and fine borders. Shadows are reserved for
  the homepage tool previews. Use rounded rectangular controls.

### Homepage map

- `src/pages/index.astro` is the one route that does **not** use `Base`: it renders
  the same metadata itself, a static `<h1>` (site brand) and a `<noscript>` link list,
  then calls `mountMap(site)` from `src/scripts/map-engine.js` with `src/data/map.json`.
- **The engine is vendored** from [dofy/site-to-map](https://github.com/dofy/site-to-map)
  (`skills/site-to-map/engine/map-engine.js`). Change it there, then copy it here; do not
  fork it in place. It is plain JS on bundled `three` 0.170.
- The map draws a folded-paper continent with `MeshLambertMaterial` flat shading and an
  ink-line post pass (normal + depth edges), plus depth-of-field and tilt-shift blur.
  Five cities (Minas Tirith = tools, Rivendell = Heart Sutra, Grey Havens = apps,
  Erebor = GitHub, Bree = social) each give every item its own landmark building.
- All map content lives in `src/data/map.json` (schema: `references/site-schema.md` in
  site-to-map): towns, slots, shortcut keys, styles, every link with its building `kind`
  and zh/en text, place names and interface overrides. The `<noscript>` list is generated
  from the same file. `links.json`/`apps.json` no longer feed the homepage; add new tools
  to `map.json`.
- There is no dark mode or theme toggle here: local time drives sky, sun, lamps and the
  interface palette (`DAY`/`UIP` keyframes in the engine, eight phases). `?t=18.5` pins the hour for
  previews. Language follows the system and is switchable (stored per browser).
- Fonts are self-hosted (`@fontsource-variable/manrope`, `jetbrains-mono`,
  `@fontsource/cormorant-garamond` italics); never load Google Fonts.
- Keyboard: 1–5 or M/E/G/B/R cities, 0/H overview, ←/→ step, Enter open, Esc back, +/− zoom,
  T/O/V tour/orbit/top, L language, I info card, ? help; Shift or Space + drag pans
  within `PAN` bounds. The footer shows `package.json` `version`; bump it with each
  release tag so `vX.Y.Z` tags and the page match.

### Tokens and typography

- Semantic aliases resolve through `var()`. Override primitives in `.dark`.
- Use `bg-accent` + `text-accent-foreground` for fills and `text-accent-text`
  for text. Coral fills use dark ink; light-theme coral text uses a deeper
  accessible tone. Never assume white text is legible on the coral fill.
- The sans-serif stack matches the app websites; monospace output uses
  self-hosted JetBrains Mono. No remote font imports.
- `ThemeToggle`, the Base FOUC script, the theme-color metadata and the manifest
  must stay aligned with the light/dark paper colors.
- The original `Mascot.tsx` is available but no longer appears in the homepage
  hero. Preserve its dedicated `--color-pixel-*` tokens and static rendering.

### Motion

- All sections remain visible without JavaScript; there is no scroll observer.
- The page entrance and interactive transitions respect reduced motion.
- Theme changes retain the 750ms native View Transition polygon reveal and
  the light/dark/auto cycle. Keep storage handling and cross-tab sync intact.
  The animation's MIT notice remains in `public/theme-animation-license.txt`.

### Data & islands

- **Data** lives in `src/data/*.json`. Pages import JSON directly — no API
  routes or database. Emoji loads its hashed catalogue from the same-origin
  static output. Social favicons are local; GitHub badges are external images.
- **Islands** are React components hydrated with `client:load`. The mascot is
  static SVG and must not hydrate. Every page has a shared theme island and small
  browser scripts for theme and domain identity; static content does not hydrate.
- **24 points:** `solve24` uses exact BigInt fractions, complete pair combinations
  and canonical commutative subexpressions. Do not reintroduce `eval` or floating
  equality. Regression tests cover all 1,820 unordered inputs from 1 to 13.
- **Morse:** pure encode/decode functions live in `src/lib/morse.ts`. Render and
  copy the same output string, including unknown-character placeholders.
- **Face Kit:** parts live as SVG shape data in `src/data/face.json`, never as
  images; `f`/`s` may only name palette tokens and `m` mirrors a shape across the
  centre line, so one eye definition draws both. `src/lib/face.ts` hashes the
  seed with FNV-1a and expands it with mulberry32 — do not go back to summing
  character codes, which is what skewed the 2012 PHP version. The preview and the
  exported SVG share `faceShapes`/`shapeAttributes`, so keep both on that path.
  Face silhouettes must keep their `outline` stroke: skin and background sit
  within 2.2:1 contrast, so without it a bald head disappears into a pale
  backdrop. See [the data reference](docs/face-kit.md).
- **Lock Kit:** `src/lib/lock.ts` enumerates key bittings with prefix pruning, so
  cost tracks surviving codes rather than `pins ** holes`; rule I is a minimum
  Hamming distance filter using masked keys, not pairwise comparison. Keep
  `DEFAULT_LIMIT`/`DEFAULT_NODE_BUDGET` in place — the search runs on the main
  thread. `explainCode` drives both the rule chips and the chamber highlights in
  `KeyProfile.tsx`, which must stay the single source of rule wording.
  The double-row tab reuses the single-row search per row (`rowParamsFor`) and
  only the paired-sum rule H′ and rule I run over the pairs, so row rules have
  exactly one implementation. Pairing is a product, so keep `DEFAULT_ROW_LIMIT`
  alongside the result limit and budget.
  See [the rule reference](docs/lock-coding.md) and
  [the algorithm notes](docs/lock-algorithm.md).
- **Clipboard:** use `useClipboard` for copied/error feedback and pending request
  invalidation. Copy targets must remain keyboard-accessible.
- **Emoticon Kit:** character pools live in `src/lib/Emoticon.ts`; `mouse` is the
  historical mouth field. Eyes and face frames use paired indexes, so preserve
  array lengths/order. Duplicates affect weights; combining marks must remain
  intact. Update [the character inventory](docs/emoticon-characters.md) when the
  pools change. The page's fixed table-flip text and Logo image are separate.
- **Emoji:** `catalogue.json` covers Unicode Emoji 17.0 and CLDR 48.2 zh/zh_Hant/en,
  plus modern Apple keywords and legacy aliases. Load it via `?url` as a hashed
  static asset. `src/lib/emoji.ts` ranks and deduplicates candidates; preserve
  Chinese IME composition and keyboard copying. Python 3's standard library
  rebuilds data with `pnpm emoji:update`; `--refresh-apple` reads CoreEmoji only
  on macOS. Keep raw Apple weights and provenance in the checked-in snapshot.
  See `docs/emoji-data.md`. `pnpm test` also runs Python trie fixture tests.
- **`LinkBlock`** renders the toolbox, projects and personal links. Each has a `cat` (category with
  `name`) and a `links` array typed `NormalLink | SocialLink | GitHubLink` — see
  `src/types`. `links.json` drives the homepage structure. Its shields.io badge
  colours are literal hex (a remote image cannot read CSS tokens).

## Documentation and releases

- [docs/README.md](docs/README.md) indexes character/data references and dated
  verification records. Keep README and the relevant data reference aligned with
  changes; preserve historical results and append new verification dates.
- Production is the Git-connected Cloudflare Pages project `yahaha`: branch
  `main`, command `pnpm build`, output `dist/`. Other branches are previews.
  After an authorized release, verify the production commit and all four domains;
  Pages build success and GitHub CI success are separate checks.
