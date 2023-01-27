import Head from 'next/head';
import { useRouter } from 'next/router';
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

  // get current page path
  const router = useRouter();
  // init GA
  ReactGA.initialize('UA-88258326-1', {
    debug: process.env.NODE_ENV === 'development',
  });
  // send page view
  ReactGA.pageview(router.asPath);

  // console.log('NODE_ENV:', process.env.NODE_ENV);

  return (
    <div className='main'>
      <Head>
        <title>{newTitle}</title>
        <link rel='icon' href='/favicon.ico' />
        <meta name='keywords' content={keywords.join()} />
        <meta name='description' content={newTitle} />
        <meta name='theme-color' content='gray' />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@dofy" />
        <meta name="twitter:image" content="/logo.png" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={newTitle} />
      </Head>

      <main className='content'>{children}</main>

      {footer}
    </div>
  );
};

export default Main;
