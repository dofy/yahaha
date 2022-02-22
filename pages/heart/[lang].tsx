import { useState, useEffect } from 'react';

import { useRouter } from 'next/router';
import type { NextPage } from 'next';

import type { Heart } from '../../types';

import Main from '../../components/Main';

const Heart: NextPage = () => {
  const router = useRouter();
  const { lang } = router.query;

  const [data, setData] = useState<Heart>();

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`/api/heart/${lang}`);
      setData(await res.json());
    };
    lang && fetchData();
  }, [lang]);

  return (
    <Main footer=''>
      <h1 className='px-4 text-left'>{data?.title}</h1>
      <pre>{data?.lines.join('\n')}</pre>
    </Main>
  );
};

export default Heart;
