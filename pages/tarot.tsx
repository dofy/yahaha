import { Footer, Main } from '@/components'
import tarotData from '@/libs/data/tarot.json'
import type { Tarot as TarotType } from '@/types'
import type { NextPage } from 'next'
import Image from 'next/image'
import { FC, useState } from 'react'

const Tarot: NextPage = () => {
  const [currentTarot, setCurrentTarot] = useState<TarotType | null>(null)
  const [currentTab, setCurrentTab] = useState<string>('summary')

  return (
    <Main title='Tarot' footer={<Footer />}>
      <h1>Tarot</h1>
      <div className='flex flex-col gap-2'>
        {tarotData.map((tarot, index) => (
          <TarotCard
            key={index}
            tarot={tarot as TarotType}
            currentTab={currentTab}
            isShowDetail={currentTarot?.index === tarot.index}
            onSelected={(tarot) => {
              window.location.hash = tarot.index
              setCurrentTarot(tarot)
            }}
            onTabChange={setCurrentTab}
          />
        ))}
      </div>
    </Main>
  )
}

interface TarotCardProps {
  tarot: TarotType
  currentTab?: string
  isShowDetail?: boolean
  onSelected?: (tarot: TarotType) => void
  onTabChange?: (tab: string) => void
}

const TarotCard: FC<TarotCardProps> = ({
  tarot,
  currentTab,
  isShowDetail,
  onSelected,
  onTabChange
}) => {
  return (
    <div id={tarot.index} className='text-left'>
      <div
        className='flex justify-between cursor-pointer dark:hover:bg-gray-700 hover:bg-gray-200 px-4 py-2 rounded-md'
        onClick={() => onSelected?.(tarot)}
      >
        <div className='text-xl font-medium'>{tarot.name}</div>
        <div className='text-2xl uppercase text-gray-400'>{tarot.index}</div>
      </div>
      {isShowDetail && (
        <div className='flex flex-col md:flex-row gap-2 p-2'>
          <div className='flex-shrink-0'>
            <Image
              width={237}
              height={340}
              className={`transition-all ease-in-out duration-500 ${
                currentTab === 'down' ? 'rotate-180' : ''
              }`}
              src={`/images/tarot/${tarot.index}.jpg`}
              alt={tarot.name}
            />
          </div>
          <div className='flex flex-col gap-2'>
            <div>
              <Label>属性</Label>
              {tarot.element}
            </div>
            <div className='flex gap-2'>
              {tarot.keywords.map((keyword) => (
                <Tag key={keyword}>{keyword}</Tag>
              ))}
            </div>
            <div className='flex flex-col flex-shrink gap-2'>
              <div>
                {Object.entries({
                  summary: '概述',
                  up: '正位',
                  down: '逆位'
                }).map(([key, value]) => (
                  <Label
                    key={key}
                    hightlight={currentTab === key}
                    onClick={() => onTabChange?.(key)}
                  >
                    {value}
                  </Label>
                ))}
              </div>
              {currentTab === 'summary' && (
                <div className='leading-8 text-lg'>{tarot.summary}</div>
              )}
              {currentTab === 'up' && (
                <div className='leading-8 text-lg'>
                  {Object.entries(tarot.up).map(([key, value]) => (
                    <div key={key}>
                      <span className='font-bold'>{key}</span>: {value}
                    </div>
                  ))}
                </div>
              )}
              {currentTab === 'down' && (
                <div className='leading-8 text-lg'>
                  {Object.entries(tarot.down).map(([key, value]) => (
                    <div key={key}>
                      <span className='font-bold'>{key}</span>: {value}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface TagProps {
  children: string
}

const Tag: FC<TagProps> = ({ children }) => {
  return (
    <span className='font-medium cursor-default bg-gray-200 border border-gray-300 rounded-md px-4 py-1 text-gray-500'>
      {children}
    </span>
  )
}

interface LabelProps {
  children: string
  hightlight?: boolean
  onClick?: () => void
}

const Label: FC<LabelProps> = ({ children, hightlight, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`inline-block font-bold text-gray-700 bg-gray-200 px-6 py-1 rounded-sm mr-2 ${
        hightlight
          ? 'border-b-4 border-gray-500 dark:border-blue-500'
          : 'border-0'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {children}
    </div>
  )
}

export default Tarot
