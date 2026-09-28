<div align="center">

# yahaha

**A small toolbox — math, morse, tarot, emoji, and more.**

_The answer exists only in the Tao._

[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build)
[![React](https://img.shields.io/badge/React-19-087EA4?logo=react&logoColor=white)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)

[**yahaha.net**](https://yahaha.net) · [dofy.net](https://dofy.net) · [PHPz.xyz](https://phpz.xyz) · [PHPz.org](https://phpz.org)

</div>

---

## Tools

| Route                                                             | What it does                                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`/`](https://yahaha.net/)                                        | Home — upcoming apps, links, projects, and the pixel explorer               |
| [`/24points`](https://yahaha.net/24points)                        | Solves the 24-points card game for any four numbers                         |
| [`/tarot`](https://yahaha.net/tarot)                              | All 22 Major Arcana, with upright and reversed readings                     |
| [`/emoji`](https://yahaha.net/emoji)                              | Finds and copies Emoji 17.0 with Chinese, English and Apple search keywords |
| [`/emoticon`](https://yahaha.net/emoticon)                        | Generates kaomoji — click to copy                                           |
| [`/morse`](https://yahaha.net/morse)                              | Text ⇄ morse code, click the result to copy                                 |
| [`/heart/{hans,hant,en,original}`](https://yahaha.net/heart/hans) | Heart Sutra in Simplified, Traditional, English, and Sanskrit               |

Tools run entirely in the browser. There is no API, database or analytics. The homepage loads public favicons and GitHub star badges from Google and shields.io.

The homepage also introduces [Cruft](https://cruft.phpz.org/),
[WordClip](https://wordclip.phpz.org/) and [LinguaDock](https://linguadock.phpz.org/)
as upcoming apps. Their descriptions, platforms and website links live in
`src/data/apps.json`; `AppShowcase.astro` renders them with local app icons and
no client-side hydration.

Emoji search covers 3,944 fully-qualified Emoji 17.0 sequences with CLDR 48.2
Simplified Chinese, Traditional Chinese and English annotations, modern macOS
Apple search terms, and the original input-method aliases. Results are ranked,
deduplicated and selectable for copying. The catalogue loads as a cached static
asset rather than a large JavaScript module.

Run `pnpm emoji:update` with Python 3 to rebuild the data; use
`pnpm emoji:update --refresh-apple` on macOS to refresh the Apple snapshot.
See [data provenance, update instructions and search behavior](docs/emoji-data.md).

## Design

The visual language is **liquid glass** — translucent frosted panels floating over
an ambient CSS gradient mesh, in a mint-and-peach palette. Light and dark are both
first-class, on a three-state toggle (light → dark → auto).

The glass is not simple transparency. Three effects stack to make a panel read as
a physical pane:

1. a **vertical tint gradient**, brighter at the top edge, giving the pane a lit
   side and a shaded side;
2. **`saturate()`** inside the backdrop filter, so colour bleeding through looks
   refracted rather than merely washed out;
3. **inset highlights** top and bottom — the specular rim of a real bevel.

Five tiers cover every surface, picked by content density:

| Class           | Use                                                                  |
| --------------- | -------------------------------------------------------------------- |
| `.glass`        | cards and page panels                                                |
| `.glass-strong` | sticky chrome                                                        |
| `.glass-solid`  | dense text, tooltips                                                 |
| `.chip`         | controls **inside** an already-frosted parent — deliberately no blur |
| `.glass-chip`   | controls sitting directly on the page background                     |

The palette is shared verbatim with its sibling project
[chrome-ntp-wallpapers](https://github.com/dofy/chrome-ntp-wallpapers), so tokens
can be copied between the two.

One thing stays resolutely un-glassy: the **pixel explorer** in the hero and the
kaomoji sign-off in the footer are holdovers from the site's previous
_ligne claire + pixel_ design, kept as easter eggs with their own colour tokens.
The mascot is hand-authored original art — a 14×15 dot grid rendered as SVG with
`shapeRendering="crispEdges"`.

## Quick start

```bash
# Node 22.22.3 or newer in the Node 22 release line (.nvmrc)
pnpm install --frozen-lockfile
pnpm dev        # → http://localhost:4321
```

| Script         | Does                                                         |
| -------------- | ------------------------------------------------------------ |
| `pnpm dev`     | Dev server with HMR                                          |
| `pnpm build`   | Static production build → `dist/`                            |
| `pnpm preview` | Serve the built `dist/` locally                              |
| `pnpm check`   | Type-check Astro, React and TypeScript                       |
| `pnpm lint`    | ESLint, including Astro and JSX accessibility rules          |
| `pnpm test`    | Node regression tests, including all 1,820 card combinations |
| `pnpm verify`  | Lint → type check → tests → build → static-output checks     |
| `pnpm audit`   | Check installed dependencies for published advisories        |

Output is fully static, so `dist/` can be served from anywhere. `pnpm verify` is
the local gate. GitHub Actions runs the same checks plus a dependency audit.
Static-output checks cover all ten pages, language and sharing metadata, internal
links and assets, sitemap entries, manifest shortcuts, and the static mascot.

The 24-points solver uses exact fractions and all binary expression shapes. Its
tests compare every unordered input against an independent five-shape oracle and
validate each returned expression. Morse supports both encoding and decoding;
letters use spaces, words use `/`, and unsupported input stays visible as `?`.

## Structure

```
src/
├── pages/                  # each .astro file is a route
│   ├── index.astro         # hero + link sections
│   ├── 24points.astro
│   ├── emoji.astro
│   ├── emoticon.astro
│   ├── morse.astro
│   ├── tarot.astro
│   └── heart/[lang].astro  # dynamic lang param
├── layouts/
│   └── Base.astro           # <head> meta, anti-FOUC theme guard, reveal script
├── components/
│   ├── LinkBlock.astro      # homepage link sections
│   ├── Footer.astro
│   ├── Logo.astro           # kaomoji sign-off
│   ├── islands/             # React, hydrated with client:*
│   │   ├── ThemeToggle.tsx
│   │   ├── Mascot.tsx       # pixel explorer (SVG dot grid)
│   │   ├── EmojiSearch.tsx
│   │   ├── EmoticonKit.tsx
│   │   ├── MorseCode.tsx
│   │   ├── Points24.tsx
│   │   └── TarotBrowser.tsx
│   └── ui/                  # shadcn-style primitives
├── data/                    # static JSON — links, heart, morse, tarot, emoji
├── lib/                     # pure logic (solvers, generators)
└── styles/
    └── globals.css          # @theme tokens, glass tiers, motion
```

Interactive islands are hydrated individually. The pixel mascot is rendered as
static SVG. Every page includes the shared theme control and small reveal/footer
scripts; static text and link sections do not hydrate.

## Implementation notes

A few decisions that are easy to get wrong and worth knowing before editing:

**Never nest `.glass*` inside `.glass*`.** A nested `backdrop-filter` makes the
parent a new backdrop root, and Chrome then paints the child's blur as a
hard-edged rectangle. That is why `.chip` has no blur — a plain translucent fill
reads identically inside a frosted parent and costs one fewer compositing layer.

**Dark glass is not light glass at lower opacity.** A white tint over a dark
ground reads as fog. Two things change in kind: the tint takes a low-alpha light
blue-grey so the pane keeps a hue, and the bottom inset flips from a dimmed white
highlight to an actual black recess, which is what carries depth against a dark
backdrop.

**Two accents, not one.** `mint` and `mint-deep` swap which one is legible as text
between themes — mint scores 2.77 against light paper but 5.69 against dark, and
mint-deep is exactly inverted. So `bg-accent` + `text-accent-foreground` is for a
solid fill, and `text-accent-text` is for text and borders on the page background.

**No theme-dependent `var()` inside `color-mix()`.** Lightning CSS emits a static
fallback for `color-mix()` resolved from `:root`, which bakes the _light_ value
into the `.dark` block; browsers with `oklch()` but no `color-mix()` then get a
light panel in dark mode. Write the alpha directly instead — `oklch(L C H / a)` is
equivalent to `color-mix(in oklab, X a%, transparent)`.

**Fonts are self-hosted.** A bundled `@import` gets inlined, and its `@font-face`
rules then sit above any later `@import url(...)`, which stops being a leading
at-rule and is dropped outright — the webfont silently never loads. The body face
is **Nunito** (rounded terminals), _not_ Nunito Sans; they are different families.

**Scroll reveal is ~20 lines of inline vanilla JS**, not an island — a fade-in
does not justify hydration. One shared `IntersectionObserver` serves every
element, and its bottom `rootMargin` is _negative_: a positive margin fires while
the element is still below the fold, so the animation finishes before anyone sees
it. All motion is gated behind `prefers-reduced-motion`.

Longer architecture notes live in [`CLAUDE.md`](./CLAUDE.md).

---

<div align="center">

A personal project by [**@dofy**](https://github.com/dofy)

<sub>☉ゝ☉''</sub>

</div>
