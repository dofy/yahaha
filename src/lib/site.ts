import heart from '../data/heart.json' with { type: 'json' }

type PageMetadata = { description: string; lang: string }

export const pageMetadata: Record<string, PageMetadata> = {
  '/': {
    description:
      'Discover Cruft, WordClip, LinguaDock, Tsudoi, Learning Vim and Brew Graph, plus browser tools for 24 points, emoji, kaomoji, Morse code and tarot.',
    lang: 'en'
  },
  '/24points': {
    description:
      'Find exact solutions to the 24-points card game using four numbers from 1 to 13 and arithmetic operations.',
    lang: 'en'
  },
  '/emoji': {
    description:
      'Find and copy Emoji 17.0 using Simplified Chinese, Traditional Chinese and English keywords, with modern Apple search terms.',
    lang: 'en'
  },
  '/emoticon': {
    description:
      'Generate random kaomoji and copy your favorite emoticon to the clipboard.',
    lang: 'en'
  },
  '/ascii-art': {
    description:
      'Generate and copy ASCII art from text with a choice of FIGlet fonts.',
    lang: 'en'
  },
  '/lock': {
    description:
      'Generate single-row and double-row pin tumbler key bittings that satisfy chamber, run, step, paired-sum, reuse and spacing rules, and inspect each rule on a key diagram.',
    lang: 'en'
  },
  '/morse': {
    description:
      'Encode text as Morse code or decode Morse back to text, with clear word separators and one-click copying.',
    lang: 'en'
  },
  '/tarot': {
    description: '浏览大阿尔卡纳 22 张塔罗牌的概述、关键词及正位与逆位释义。',
    lang: 'zh-Hans'
  },
  '/heart/hans': {
    description: `阅读《${heart.hans.title}》简体中文全文，按原文段落排版，方便阅读与复制。`,
    lang: 'zh-Hans'
  },
  '/heart/hant': {
    description: `閱讀《${heart.hant.title}》繁體中文全文，按原文段落排版，方便閱讀與複製。`,
    lang: 'zh-Hant'
  },
  '/heart/en': { description: 'Read the Heart Sutra in English.', lang: 'en' },
  '/heart/original': {
    description: 'Read the Heart Sutra in Sanskrit (Devanagari script).',
    lang: 'sa'
  }
}

export function canonicalPath(pathname: string) {
  const path = pathname.replace(/\/+$/u, '')
  return path ? `${path}/` : '/'
}
