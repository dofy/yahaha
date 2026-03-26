# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Next.js 15 (Pages Router) · React 19 · TypeScript · TailwindCSS 3 · pnpm

## Commands

```bash
pnpm dev      # Start dev server on localhost:3000
pnpm build    # Production build
pnpm start    # Start production server
pnpm lint     # ESLint (next/core-web-vitals)
```

No test suite is configured.

## Project Structure

This is a personal toolbox site (`yahaha.net`) with several standalone utility pages. Each page in `pages/` is fully self-contained with its own data loading and UI logic.

```
pages/          # Next.js Pages Router — each file is a route
components/     # Shared layout: Main (head/GA/layout), Footer, Logo, LinkBlock, NumberInput
libs/           # Pure logic + static JSON data
  24points.ts   # 24-points math solver algorithm
  Emoticon.ts   # Emoticon generation logic
  data/         # JSON data files (emoji, morse, tarot, heart, links, etc.)
types/          # Shared TypeScript types (index.d.ts)
styles/         # globals.css — all Tailwind utility classes + component layer definitions
```

## Architecture Notes

- **`Main` component** (`components/Main.tsx`) is the universal page wrapper — it handles `<Head>` meta tags, Google Analytics (UA-88258326-1), and page layout. All pages use it. It accepts an optional `footer` prop (ReactNode).
- **Path alias `@/`** maps to the project root (configured in tsconfig).
- **Styling** is all in `styles/globals.css` using Tailwind's `@layer components`. There are no CSS Modules or separate component stylesheets; all component class names are defined there. Dark mode is supported via Tailwind's `dark:` variants.
- **Data** lives in `libs/data/*.json`. Pages import JSON directly — no API routes or external data fetching.
- **GA** is initialized on every render inside `Main` using `react-ga` (legacy UA). It fires `pageview` on every route.
- **No app directory** — this project uses the Pages Router, not the App Router, despite being on Next.js 15.
- **`LinkBlock` component** renders homepage link sections. Each section has a `cat` (category with `name`, `prefix`, `subfix`) and a `links` array. Link items are typed as `NormalLink | SocialLink | GitHubLink` — see `types/index.d.ts` for the full type definitions.
- **`links.json`** drives the homepage structure. To add/modify homepage link sections, edit `libs/data/links.json`.
