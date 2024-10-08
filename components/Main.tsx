import Head from 'next/head'
import { useRouter } from 'next/router'
import type { ReactNode } from 'react'
import ReactGA from 'react-ga'

interface MainProps {
  title?: string
  footer?: ReactNode
  children: ReactNode
}

export const Main = (props: MainProps) => {
  const { title, footer, children } = props

  const newTitle = [title, 'dofy.net & PHPz.xyz & PHPz.mobi & yahaha.net']
    .filter((item) => !!item)
    .join(' - ')

  const keywords: string[] = require('../libs/data/keywords.json')

  // get current page path
  const router = useRouter()
  // init GA
  ReactGA.initialize('UA-88258326-1', {
    // debug: process.env.NODE_ENV === 'development'
  })
  // send page view
  ReactGA.pageview(router.asPath)

  return (
    <div className='main'>
      <Head>
        <title>{newTitle}</title>
        <link rel='icon' href='/favicon.ico' />
        <link rel='apple-touch-icon' href='/logo.png' />
        <link rel='manifest' href='/manifest.json' />
        <meta name='description' content={newTitle} />
        <meta name='keywords' content={keywords.join()} />
        <meta name='og:description' content={newTitle} />
        <meta name='og:image' content='/logo.png' />
        <meta name='og:title' content={title} />
        <meta name='theme-color' content='#F3F4F6' />
        <meta name='twitter:card' content='summary' />
        <meta name='twitter:creator' content='@dofy' />
        <meta name='twitter:site' content='@dofy' />
      </Head>

      <main className='content'>{children}</main>

      {footer}
    </div>
  )
}
