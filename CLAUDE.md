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
`astro check`, Node regression tests, production build and static-output checks.
Run `pnpm audit` to check published dependency advisories. CI runs both.
Use Node 22.22.3+ on the Node 22 release line; no separate test runner is needed.

## Project Structure

Personal toolbox site (`yahaha.net`) with several standalone utility pages.
Each page in `src/pages/` is a self-contained route with its own data + UI.

```
src/
├── pages/          # Astro routes — each .astro file is a page
│   ├── index.astro       # Homepage: hero + app showcase + toolbox + LinkBlock sections
│   ├── 24points.astro    # 24-points solver
│   ├── emoji.astro       # Emoji search (EmojiSearch island)
│   ├── emoticon.astro    # Emoticon generator
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
│   └── ui/               # shadcn-style primitives (Button, etc.)
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
  routes, no external fetching (static output).
- **Islands** are React components hydrated with `client:load`. The mascot is
  static SVG and must not hydrate. Every page has a shared theme island and small
  inline scripts; static content does not hydrate.
- **24 points:** `solve24` uses exact BigInt fractions, complete pair combinations
  and canonical commutative subexpressions. Do not reintroduce `eval` or floating
  equality. Regression tests cover all 1,820 unordered inputs from 1 to 13.
- **Morse:** pure encode/decode functions live in `src/lib/morse.ts`. Render and
  copy the same output string, including unknown-character placeholders.
- **Clipboard:** use `useClipboard` for copied/error feedback and pending request
  invalidation. Copy targets must remain keyboard-accessible.
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
