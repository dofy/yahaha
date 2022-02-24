import { useState, useEffect } from 'react';

import type { NextPage } from 'next';
import Main from '../components/Main';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import LinkBlock from '../components/LinkBlock';
import { Links } from '../types';

const links: Links = require('../libs/data/links.json');

const Home: NextPage = () => {
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
