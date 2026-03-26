import { Main } from '@/components'
import EKit from '@/libs/Emoticon'
import type { NextPage } from 'next'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const Emoticon: NextPage = () => {
  const [doit, setDoit] = useState<number>(0)
  const [emoticon, setEmoticon] = useState<string>('')

  useEffect(() => {
    setEmoticon(EKit())
  }, [doit])

  return (
    <Main
      title='Emoticon Kit'
      footer={
        <>
          <div className='footer text-sm'>
            powered by Angela &amp;{' '}
            <Link href='https://twitter.com/dofy'>Seven Yu</Link>
          </div>
          <div className='footer text-sm'>┻━┻︵╰(‵□′)╯︵┻━┻</div>
        </>
      }
    >
      <h1>Emoticon Kit</h1>
      <div>
        <input
          type='text'
          readOnly={true}
          defaultValue={emoticon}
          onFocus={(evt) => {
            evt.target.select()
          }}
          className='result-input'
        />
      </div>
      <div>
        <button className='create-button' onClick={() => setDoit(doit + 1)}>
          CREATE
        </button>
      </div>
    </Main>
  )
}

export default Emoticon
