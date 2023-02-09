import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  debug: boolean;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  console.log(req);
  res.status(200).json({ debug: true });
}
