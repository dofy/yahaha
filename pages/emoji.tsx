import { useEffect, useState } from 'react'

import type { NextPage } from 'next'
import Link from 'next/link'

import { useRouter } from 'next/router'
import Footer from '../components/Footer'
import Logo from '../components/Logo'
import Main from '../components/Main'

type List = {
  [key: string]: string[]
}

const keyList = require('../libs/data/emoji/key.json')
const emojiList = require('../libs/data/emoji/emoji.json')
const allData = { ...keyList, ...emojiList }

const Emoji: NextPage = () => {
  const [list, setList] = useState<List>({})
  const [query, setQuery] = useState('')

  const router = useRouter()

  useEffect(() => {
    const load = async (by: string) => {
      setQuery('')
      setList(by === 'key' ? keyList : emojiList)
    }

    const search = (query: string) => {
      const data: List = {}
      Object.keys(allData)
        .filter((key) => key.includes(query))
        .map((key) => {
          data[key] = allData[key]
        })
      setList(data)
    }

    // init list data
    const { by, q } = router.query
    by && load(by as string)
    q && (setQuery(q as string), search(q as string))
  }, [router.query])

  return (
    <Main title='Emoji' footer={<Footer />}>
      <h1>Apple Emoji Dictionary</h1>
      <div>
        You can load the list by <Link href='/emoji?by=key'>Key</Link> or{' '}
        <Link href='/emoji?by=emoji'>Emoji</Link>.
      </div>
      <div className='search'>
        <input
          type='text'
          placeholder='Search...'
          className='search-input'
          value={query}
          onChange={(evt) => setQuery(evt.target.value)}
          onKeyDown={({ code }) => {
            code === 'Enter' && router.push(`/emoji?q=${query}`)
          }}
        />
      </div>
      <ul className='emoji-list'>
        {Object.keys(list).map((key, index) => (
          <li key={index}>
            {key}: {list[key].join(', ')}
          </li>
        ))}
      </ul>
      <ul className='github'>
        <li>
          <Link href='https://github.com/dofy/apple-emoji-dict'>
            ~ GitHub Repo ~
          </Link>
        </li>
      </ul>
      <Logo />
    </Main>
  )
}

export default Emoji
