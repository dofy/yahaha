import Link from 'next/link';
import React, { useEffect, useState } from 'react';

export interface FooterProps {
  children?: React.ReactNode;
}

import domains from '../libs/data/domains.json';

const Footer = (props: FooterProps) => {
  const begin = 2007;
  const year = new Date().getFullYear();
  const { children } = props;

  const [domain, setDomain] = useState('');

  useEffect(() => {
    setDomain(window.location.hostname);
  }, []);

  return (
    <React.Fragment>
      <div className='footer'>
        copyright &copy; {begin}-{year}
      </div>
      <div className='footer'>
        {domains &&
          domains.map(({ name, url }) => {
            const isCurrent = domain.toLowerCase() === name.toLowerCase();
            return <Link key={name} href={url}>
              {isCurrent ? <strong>{name}</strong> : name}
            </Link>
          }
          )}
      </div>
      <div className='footer'>
        <Link href='https://beian.miit.gov.cn/'>冀ICP备18019086号-1</Link>
      </div>
      {children}
    </React.Fragment>
  );
};

export default Footer;
