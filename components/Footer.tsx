import Link from 'next/link';

import type { Domain } from '../types';

export interface FooterProps {
  children?: React.ReactNode;
}

const domains: Domain[] = require('../libs/data/domains.json');

const Footer = (props: FooterProps) => {
  const begin = 2007;
  const year = new Date().getFullYear();
  const { children } = props;

  return (
    <>
      <div className='footer'>
        copyright &copy; {begin}-{year}
      </div>
      <div className='footer'>
        {domains &&
          domains.map(({ name, url }) => (
            <Link key={name} href={url}>
              <a>{name}</a>
            </Link>
          ))}
      </div>
      <div className='footer'>
        <Link href='https://beian.miit.gov.cn/'>
          <a>冀ICP备18019086号-1</a>
        </Link>
      </div>
      {children}
    </>
  );
};

export default Footer;
