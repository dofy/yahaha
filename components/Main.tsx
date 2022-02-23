import Head from 'next/head';
import type { ReactNode } from 'react';

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

  return (
    <div className='main'>
      <Head>
        <title>{newTitle}</title>
        <meta name='keywords' content={keywords.join()} />
        <meta name='description' content={newTitle} />
        <link rel='icon' href='/favicon.ico' />
        <base target='_blank' />
      </Head>

      <main className='content'>{children}</main>

      {footer}
    </div>
  );
};

export default Main;
