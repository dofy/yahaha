import type { NextApiRequest, NextApiResponse } from 'next'

import type { Links } from '../../types'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Links>
) {
  const linkCats = {
    social: {
      id: 'social',
      prefix: '[',
      subfix: ']',
    },
    heart: {
      id: 'heart',
      prefix: '.',
      subfix: '.',
    },
    github: {
      id: 'github',
      prefix: '|',
      subfix: '|',
    },
    friend: {
      id: 'friend',
      prefix: '~',
      subfix: '~',
    },
    tool: {
      id: 'tool',
      prefix: '#',
      subfix: '#',
    },
  }
  const links = [
    {
      cat: linkCats.social,
      links: [
        {
          userId: 'dofy',
          userName: 'Seven',
          name: 'plurk',
          url: 'https://plurk.com/',
        },
        {
          userId: 'people/dofy',
          userName: 'Seven',
          name: 'douban',
          url: 'https://douban.com/',
        },
        {
          userId: 'dofy',
          userName: 'Seven',
          name: 'GitHub',
          url: 'https://github.com/',
        },
        {
          userId: 'dofy',
          userName: 'Seven',
          name: 'Twitter',
          url: 'https://twitter.com/',
        },
        {
          userId: 'dofyyu',
          userName: 'Seven',
          name: 'Instagram',
          url: 'https://instagram.com/',
        },
      ]
    },
    {
      cat: linkCats.heart,
      links:
        [
          {
            name: '心经',
            url: '/heart/hans',
          },
          {
            name: "心經",
            url: '/heart/hant',
          },
          {
            name: "Heart",
            url: '/heart/en',
          },
          {
            name: "प्रज्ञापारमिताहृदयसूत्र",
            url: '/heart/original',
          },
        ]
    },
    {
      cat: linkCats.github,
      links: [
        {
          name: 'The 7th Vim',
          url: '7th-vim',
        },
        {
          name: 'Learning Vim',
          url: 'learn-vim',
        },
        {
          name: 'Emoji Database',
          url: 'emojidb',
        },
        {
          name: 'Apple Emoji Dict',
          url: 'apple-emoji-dict',
        },
        {
          name: 'My PopClip Extensions',
          url: 'PopClip-Extensions',
        },
        {
          name: 'My Alfred Workflows',
          url: 'awf',
        },
      ],
    },
    {
      cat: linkCats.friend,
      links: [
        {
          name: '创造狮',
          url: 'http://chuangzaoshi.com',
        }
      ],
    },
    {
      cat: linkCats.tool,
      links: [
        {
          name: 'Emoji',
          url: '/emoji',
        },
        {
          name: 'Emoticon',
          url: '/emoticon',
        }
      ],
    },
  ]
  res.status(200).json(links)
}
