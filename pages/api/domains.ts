import type { NextApiRequest, NextApiResponse } from 'next'

import type { Domain } from '../../types'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Domain[]>
) {
  const domains = [
    {
      name: 'dofy.net',
      url: 'https://dofy.net',
    },
    {
      name: "PHPz.xyz",
      url: 'https://phpz.xyz',
    },
    {
      name: "PHPz.mobi",
      url: 'https://phpz.mobi',
    },
    {
      name: "yahaha.net",
      url: 'https://yahaha.net',
    },
  ]
  res.status(200).json(domains)
}
