import { Main } from '@/components'
import emojiListData from '@/libs/data/emoji/emoji.json'
import keyListData from '@/libs/data/emoji/key.json'
import { ArrayDict } from '@/types'
import type { NextPage } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

const Emoji: NextPage = () => {
  const [list, setList] = useState<ArrayDict>({})
  const [query, setQuery] = useState('')

  const router = useRouter()

  const keyList = keyListData as ArrayDict
  const emojiList = emojiListData as ArrayDict

  useEffect(() => {
    const allData = { ...keyList, ...emojiList }
    const load = async (by: string) => {
      setQuery('')
      setList(by === 'key' ? keyList : emojiList)
    }

    const search = (query: string) => {
      const data: ArrayDict = {}
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
  }, [emojiList, keyList, router.query])

  return (
    <Main title='Emoji'>
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
    </Main>
  )
}

export default Emoji
