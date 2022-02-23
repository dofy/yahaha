import { Fragment, useEffect, useState } from 'react';

import type { NextPage } from 'next';
import Link from 'next/link';

import Main from '../components/Main';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

type List = {
  [key: string]: string[];
};

const Emoji: NextPage = () => {
  const [list, setList] = useState<List>({});
  const [query, setQuery] = useState('');
  const [allData, setAllData] = useState<List>({});
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('/emoji/all.json');
      const data = await res.json();
      setAllData(data);
    };
    fetchData();
  }, []);

  const load = async (by: string) => {
    const res = await fetch(`/emoji/${by}.json`);
    const data = await res.json();
    setList(data);
  };

  const search = async (query: string) => {
    const data: List = {};
    query &&
      Object.keys(allData)
        .filter((key) => key.includes(query))
        .map((key) => {
          data[key] = allData[key];
        });
    setList(data);
  };

  return (
    <Main title='Emoji' footer={<Footer />}>
      <h1>Apple Emoji Dictionary</h1>
      <div>
        You can load the list by{' '}
        <Link href='#key'>
          <a onClick={() => load('key')}>Key</a>
        </Link>{' '}
        or{' '}
        <Link href='#emoji'>
          <a onClick={() => load('emoji')}>Emoji</a>
        </Link>
        .
      </div>
      <div className='search'>
        <input
          className='search-input'
          type='text'
          placeholder='Search...'
          onChange={(evt) => setQuery(evt.target.value)}
          onKeyPress={({ code }) => {
            code === 'Enter' && search(query);
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
