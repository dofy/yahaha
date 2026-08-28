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

No test suite is configured. No lint script (Astro/TS check only).

## Project Structure

Personal toolbox site (`yahaha.net`) with several standalone utility pages.
Each page in `src/pages/` is a self-contained route with its own data + UI.

```
src/
├── pages/          # Astro routes — each .astro file is a page
│   ├── index.astro       # Homepage: hero + LinkBlock sections
│   ├── 24points.astro    # 24-points solver
│   ├── emoji.astro       # Emoji search (EmojiSearch island)
│   ├── emoticon.astro    # Emoticon generator
│   ├── morse.astro       # Morse code
│   ├── tarot.astro       # Tarot (TarotBrowser island)
│   └── heart/[lang].astro# Heart Sutra, dynamic lang param
├── layouts/
│   └── Base.astro        # Universal wrapper: <head> meta, theme FOUC guard, ThemeToggle, Footer, Logo
├── components/
│   ├── LinkBlock.astro   # Homepage link sections (glass panel + section-label)
│   ├── Footer.astro      # domains.json nav + copyright
│   ├── Logo.astro        # kaomoji sign-off
│   ├── islands/          # React islands (client:* hydration)
│   │   ├── ThemeToggle.tsx   # 3-state light→dark→auto cycle + theme-color meta
│   │   └── Mascot.tsx        # Original pixel explorer (grid SVG) — pixel easter egg
│   └── ui/               # shadcn-style primitives (Button, etc.)
├── data/           # Static JSON: links, domains, keywords, heart, morse, tarot, emoji/
├── lib/            # Pure logic (solvers, generators)
└── styles/
    └── globals.css # @theme tokens + glass tiers + motion (liquid-glass palette)
```

## Architecture Notes

- **`Base.astro`** is the universal page wrapper — `<head>` meta tags, anti-FOUC
  theme script (reads `localStorage.theme`, applies `.dark` before paint), fixed
  `ThemeToggle` island, `Footer`, `Logo`, and the scroll-reveal script. Pass
  `title` and `wide` props.
- **Path alias `@/`** maps to `./src/*` (configured in `tsconfig.json`).
- **Visual style is *liquid glass*** — translucent frosted panels over an ambient
  CSS gradient mesh. Palette is shared **verbatim** with the sibling project
  `seven/ntp-gallery` (both on tailwindcss 4.3.x) so tokens can be copied between
  them. Mint is the accent, peach the secondary; panel radii are `rounded-blob`
  (1.75rem) and `rounded-soft` (1.25rem); one easing everywhere,
  `cubic-bezier(0.22, 1, 0.36, 1)` (`--ease-soft`).
  **This diverged from `seven/sync-text`**, which is still the old
  ligne-claire/pixel design on Tailwind 3.

### Glass tiers

Pick by content density. All five are defined **unlayered** (not inside
`@layer components`) so no stray `bg-*` utility can clobber a panel's tint.

| class | use |
|---|---|
| `.glass` | cards, page panels |
| `.glass-strong` | sticky chrome |
| `.glass-solid` | dense text, tooltips |
| `.chip` | controls **inside** an already-frosted parent — no blur |
| `.glass-chip` | controls sitting directly on the page background |

`.chip` has no `backdrop-filter` **on purpose**: nesting one inside another makes
the parent a new backdrop root and Chrome paints the child's blur as a hard-edged
rectangle. Never nest `.glass*` inside `.glass*`.

### Token gotchas

- **Semantic aliases resolve through `var()`**, so `.dark` overrides only the
  primitives (`--color-paper`, `--color-ink`, …) — never re-declare the semantic
  layer per theme.
- **`accent` vs `accent-text`.** mint and mint-deep swap which one is legible as
  text between themes (mint scores 2.77 on light paper but 5.69 on dark;
  mint-deep is exactly inverted). Use `bg-accent` + `text-accent-foreground` for
  a solid fill, and `text-accent-text` for text/borders on the page background.
  Never hardcode `text-mint-deep`.
- **Never put a theme-dependent `var()` inside `color-mix()`.** Lightning CSS
  emits a static fallback for `color-mix()` resolved from `:root`, which bakes the
  *light* value into the `.dark` block — browsers with oklch but no `color-mix()`
  (Safari 15.4–16.1) then get a light panel in dark mode. Write the alpha
  directly instead: `oklch(L C H / a)`, which is equivalent to
  `color-mix(in oklab, X a%, transparent)`.
- **Fonts are self-hosted via `@fontsource`,** not Google Fonts. A bundled
  `@import` gets inlined, and its `@font-face` rules then sit above any later
  `@import url(...)` — which stops being a leading at-rule and is dropped
  outright, so the webfont silently never loads. Body face is **Nunito** (the
  rounded-terminal family), *not* Nunito Sans — they are two different families.
- **Pixel holdovers** are deliberate and limited to `Mascot.tsx` and `Logo.astro`,
  with their own `--color-pixel-*` tokens. `Mascot`'s `PALETTE` must use bare
  `var(--color-x)` — the old `hsl(var(--x))` form is invalid now that tokens hold
  full `oklch()` colours, and it fails silently.

### Motion

- Scroll reveal is a ~20-line `is:inline` vanilla `IntersectionObserver` in
  `Base.astro`, not an island — the rest of the site is zero-JS static Astro. Add
  `data-reveal` to opt an element in. **One shared observer**, and the bottom
  `rootMargin` is *negative* (`0px 0px -12% 0px`): a positive margin fires while
  the element is still below the fold, so the fade finishes before it is visible.
- Without JS, no `.reveal` class is added, so elements stay visible — the script
  adds both `.reveal` and later `.reveal-in`. Print and `forced-colors` get an
  explicit opacity-1 override, since neither ever scrolls.
- Everything is gated behind `prefers-reduced-motion: reduce`.

### Data & islands

- **Data** lives in `src/data/*.json`. Pages import JSON directly — no API
  routes, no external fetching (static output).
- **Islands** are React components hydrated with `client:load` / `client:visible`.
  Everything else is zero-JS static Astro.
- **`LinkBlock`** renders homepage link sections. Each has a `cat` (category with
  `name`) and a `links` array typed `NormalLink | SocialLink | GitHubLink` — see
  `src/types`. `links.json` drives the homepage structure. Its shields.io badge
  colours are literal hex (a remote image cannot read CSS tokens).
