import Head from 'next/head';
import type { ReactNode } from 'react';

import ReactGA from 'react-ga';

export interface MainProps {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
}

const Main = (props: MainProps) => {
  const { title, footer, children } = props;

  const newTitle = [title, 'dofy.net & PHPz.xyz & PHPz.mobi & yahaha.net']
    .filter((item) => !!item)
    .join(' - ');

  const keywords = [
    'dofy',
    'SevenYu',
    'PHPz',
    'yahaha',
    '心经',
    '豆瓣',
    'twitter',
    'douban',
    'github',
    'plurk',
    'csdn',
  ];

  // init GA
  ReactGA.initialize('UA-88258326-1', {
    debug: process.env.NODE_ENV === 'development',
  });

  console.log('NODE_ENV:', process.env.NODE_ENV);

  return (
    <div className='main'>
      <Head>
        <title>{newTitle}</title>
        <meta name='keywords' content={keywords.join()} />
        <meta name='description' content={newTitle} />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className='content'>{children}</main>

      {footer}
    </div>
  );
};

export default Main;
