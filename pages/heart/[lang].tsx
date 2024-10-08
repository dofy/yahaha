import { Main } from '@/components'
import heart from '@/libs/data/heart.json'
import type { Heart, HeartMap } from '@/types'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'

const Heart: NextPage = () => {
  const router = useRouter()
  const { lang } = router.query
  const data = (heart as HeartMap)[lang as string]

  return (
    <Main title={data?.title}>
      <h1 className='px-4 text-left'>{data?.title}</h1>
      <pre>{data?.lines.join('\n')}</pre>
    </Main>
  )
}

export default Heart
