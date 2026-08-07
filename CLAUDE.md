# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Astro 5 (static output) · React 19 islands · TypeScript · TailwindCSS 3 · pnpm

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
│   ├── LinkBlock.astro   # Homepage link sections (ink-card + section-label)
│   ├── Footer.astro      # domains.json nav + copyright
│   ├── Logo.astro        # kaomoji sign-off
│   ├── islands/          # React islands (client:* hydration)
│   │   ├── ThemeToggle.tsx   # 3-state light→dark→auto cycle
│   │   └── Mascot.tsx        # Original pixel explorer (grid SVG)
│   └── ui/               # shadcn-style primitives (Button, etc.)
├── data/           # Static JSON: links, domains, keywords, heart, morse, tarot, emoji/
├── lib/            # Pure logic (solvers, generators)
└── styles/
    └── globals.css # Tailwind layers + design tokens (ligne-claire adventure palette)
```

## Architecture Notes

- **`Base.astro`** is the universal page wrapper — `<head>` meta tags, anti-FOUC
  theme script (reads `localStorage.theme`, applies `.dark` before paint), fixed
  `ThemeToggle` island, `Footer`, `Logo`. Pass `title` and `wide` props.
- **Path alias `@/`** maps to `./src/*` (configured in `tsconfig.json`).
- **Styling** lives in `src/styles/globals.css` using Tailwind `@layer`. Design
  tokens are HSL CSS custom properties bridged to Tailwind via `hsl(var(--x))`
  (see `tailwind.config.mjs`). Dark mode via `.dark` class (not media query).
- **Visual style** is *ligne claire + pixel accents* (Tintin-adventure spirit):
  aged-paper background, thick ink borders (`border-[3px] border-ink`), hard
  offset shadows (`.pixel-shadow` = `4px 4px 0`), Press Start 2P for
  headings/badges/labels, Nunito Sans for body. Palette shared with sibling
  project `sync-text`. All mascot art is ORIGINAL — never based on any real
  character.
- **Data** lives in `src/data/*.json`. Pages import JSON directly — no API
  routes, no external fetching (static output).
- **Islands** are React components hydrated with `client:load` / `client:visible`.
  Everything else is zero-JS static Astro.
- **`LinkBlock`** renders homepage link sections. Each has a `cat` (category with
  `name`) and a `links` array typed `NormalLink | SocialLink | GitHubLink` — see
  `src/types`. `links.json` drives the homepage structure.
