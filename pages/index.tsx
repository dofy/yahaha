import { LinkBlock, Main } from '@/components'
import allLinks from '@/libs/data/links.json'
import type { Links } from '@/types'
import type { NextPage } from 'next'

const Home: NextPage = () => {
  const links = allLinks as Links
  return (
    <Main>
      <h1>The answer exists only in the Tao.</h1>
      {links &&
        links.map((link, index) => (
          <LinkBlock key={index} cat={link.cat} links={link.links} />
        ))}
    </Main>
  )
}

export default Home
