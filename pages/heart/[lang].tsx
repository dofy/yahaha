import { useState, useEffect } from 'react';

import { useRouter } from 'next/router';
import type { NextPage } from 'next';

import type { Heart } from '../../types';
import Main from '../../components/Main';

const heart = require(`../../libs/data/heart.json`);

const Heart: NextPage = () => {
  const router = useRouter();
  const { lang } = router.query;
  const data = heart[lang as string];
  // const [data, setData] = useState<Heart>();

  // useEffect(() => {
    // lang &&
    // setData(heart[lang as string]);
  // }, [lang]);

  return (
    <Main title={data?.title}>
      <h1 className='px-4 text-left'>{data?.title}</h1>
      <pre>{data?.lines.join('\n')}</pre>
    </Main>
  );
};

export default Heart;
