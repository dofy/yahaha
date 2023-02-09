import type { NextPage } from 'next';
import { useRouter } from 'next/router';

import Main from '../../components/Main';
import type { Heart } from '../../types';

const heart = require(`../../libs/data/heart.json`);

const Heart: NextPage = () => {
  const router = useRouter();
  const { lang } = router.query;
  const data = heart[lang as string];

  return (
    <Main title={data?.title}>
      <h1 className='px-4 text-left'>{data?.title}</h1>
      <pre>{data?.lines.join('\n')}</pre>
    </Main>
  );
};

export default Heart;
