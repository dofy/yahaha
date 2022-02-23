import { useState, useEffect } from 'react';

import type { NextPage } from 'next';
import Main from '../components/Main';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { Domain, Links } from '../types';
import LinkBlock from '../components/LinkBlock';

const Home: NextPage = () => {
  const [links, setLinks] = useState<Links>();
  const [domains, setDomains] = useState<Domain[]>();

  useEffect(() => {
    const fetchData = async () => {
      const resLinks = await fetch('/api/links');
      setLinks(await resLinks.json());
    };
    fetchData();
  }, []);

  return (
    <Main footer={<Footer />}>
      <h1>The answer exists only in the Tao.</h1>
      {links &&
        links.map((link, index) => (
          <LinkBlock key={index} cat={link.cat} links={link.links} />
        ))}
      <Logo />
    </Main>
  );
};

export default Home;
