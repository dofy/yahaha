import { useEffect, useState } from 'react';

import type { NextPage } from 'next';
import Link from 'next/link';

import Main from '../components/Main';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { useRouter } from 'next/router';
import { secureHeapUsed } from 'crypto';

type List = {
  [key: string]: string[];
};

const Emoji: NextPage = () => {
  const [list, setList] = useState<List>({});
  const [query, setQuery] = useState('');
  const [allData, setAllData] = useState<List>();
  const router = useRouter();

  const load = async (by: string) => {
    const res = await fetch(`/emoji/${by}.json`);
    const data = await res.json();
    setList(data);
  };

  const search = (query: string) => {
    const data: List = {};
    allData &&
      Object.keys(allData)
        .filter((key) => key.includes(query))
        .map((key) => {
          data[key] = allData[key];
        });
    setList(data);
  };

  useEffect(() => {
    const initAllData = async () => {
      const res = await fetch('/emoji/all.json');
      const data = await res.json();
      setAllData(data);
    };
    initAllData();

    // init list data
    const { by } = router.query;
    by && load(by as string);
  }, [router.query]);

  useEffect(() => {
    const { q } = router.query;
    // init search data
    setQuery(q as string);
    q && search(q as string);
  }, [allData]);

  return (
    <Main title='Emoji' footer={<Footer />}>
      <h1>Apple Emoji Dictionary</h1>
      <div>
        You can load the list by{' '}
        <Link href='/emoji?by=key'>
          <a onClick={() => load('key')}>Key</a>
        </Link>{' '}
        or{' '}
        <Link href='/emoji?by=emoji'>
          <a onClick={() => load('emoji')}>Emoji</a>
        </Link>
        .
      </div>
      <div className='search'>
        <input
          className='search-input'
          type='text'
          placeholder='Search...'
          defaultValue={query}
          onChange={(evt) => setQuery(evt.target.value)}
          onKeyPress={({ code }) => {
            code === 'Enter' && router.push(`/emoji?q=${query}`);
          }}
        />
      </div>
      <ul className='emoji-list'>
        {Object.keys(list).map((key, index) => (
          <li key={index}>
            {key}: {list[key].join(', ')}
          </li>
        ))}
      </ul>
      <ul className='github'>
        <li>
          <Link href='https://github.com/dofy/apple-emoji-dict'>
            <a>~ GitHub Repo ~</a>
          </Link>
        </li>
      </ul>
      <Logo />
    </Main>
  );
};

export default Emoji;
