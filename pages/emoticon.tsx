import { useEffect, useState } from 'react';

import type { NextPage } from 'next';
import Link from 'next/link';

import Footer from '../components/Footer';
import Logo from '../components/Logo';
import Main from '../components/Main';

import EKit from '../libs/Emoticon';

const Emoticon: NextPage = () => {
  const [doit, setDoit] = useState<number>(0);
  const [emoticon, setEmoticon] = useState<string>('');

  useEffect(() => {
    setEmoticon(EKit());
  }, [doit]);

  return (
    <Main
      title='Emoticon Kit'
      footer={
        <Footer>
          <div className='footer text-sm'>
            powered by Angela &amp;{' '}
            <Link href='https://twitter.com/dofy'>
              <a>Seven Yu</a>
            </Link>
          </div>
          <div className='footer text-sm'>┻━┻︵╰(‵□′)╯︵┻━┻</div>
        </Footer>
      }
    >
      <h1>Emoticon Kit</h1>
      <div>
        <input
          type='text'
          readOnly={true}
          defaultValue={emoticon}
          onFocus={(evt) => {
            evt.target.select();
          }}
          className='result-input'
        />
      </div>
      <div>
        <button className='create-button' onClick={() => setDoit(doit + 1)}>
          CREATE
        </button>
      </div>
      <Logo />
    </Main>
  );
};

export default Emoticon;
