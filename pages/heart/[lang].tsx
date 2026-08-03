import { Main } from '@/components'
import heart from '@/libs/data/heart.json'
import type { Heart, HeartMap } from '@/types'
import type { GetStaticPaths, GetStaticProps, NextPage } from 'next'

interface HeartPageProps {
  lang: string
}

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: Object.keys(heart as HeartMap).map((lang) => ({ params: { lang } })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps<HeartPageProps> = (ctx) => {
  return { props: { lang: ctx.params?.lang as string } }
}

const Heart: NextPage<HeartPageProps> = ({ lang }) => {
  const data = (heart as HeartMap)[lang]

  return (
    <Main title={data?.title}>
      <h1 className='px-4 text-left'>{data?.title}</h1>
      <pre>{data?.lines.join('\n')}</pre>
    </Main>
  )
}

export default Heart
