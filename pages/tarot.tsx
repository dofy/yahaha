import { Main } from '@/components'
import tarotData from '@/libs/data/tarot.json'
import type { Tarot as TarotType } from '@/types'
import type { NextPage } from 'next'
import Image from 'next/image'
import { FC, useState } from 'react'

const TABS = [
  { key: 'summary', label: '概述' },
  { key: 'up', label: '正位' },
  { key: 'down', label: '逆位' }
] as const

type TabKey = 'summary' | 'up' | 'down'

const Tarot: NextPage = () => {
  const [selected, setSelected] = useState<TarotType | null>(null)
  const [tab, setTab] = useState<TabKey>('summary')

  const handleSelect = (tarot: TarotType) => {
    if (selected?.index === tarot.index) {
      setSelected(null)
    } else {
      setSelected(tarot)
      setTab('summary')
      window.location.hash = tarot.index
    }
  }

  return (
    <Main title='Tarot' wide>
      <h1>Tarot</h1>

      {/* 大屏：左列表 + 右 sticky 详情；小屏：纯列表，点击展开 */}
      <div className='tarot-layout'>
        {/* 左侧牌列表 */}
        <div className='tarot-list'>
          {tarotData.map((tarot) => (
            <TarotRow
              key={tarot.index}
              tarot={tarot as TarotType}
              isSelected={selected?.index === tarot.index}
              onSelect={handleSelect}
              /* 小屏内联详情 */
              inlineDetail={
                selected?.index === tarot.index ? (
                  <TarotDetail tarot={selected} tab={tab} onTabChange={setTab} />
                ) : null
              }
            />
          ))}
        </div>

        {/* 右侧 sticky 详情（仅大屏显示） */}
        <div className='tarot-panel'>
          {selected ? (
            <TarotDetail tarot={selected} tab={tab} onTabChange={setTab} sticky />
          ) : (
            <div className='tarot-panel-empty'>
              <span className='tarot-panel-hint'>← 选择一张牌</span>
            </div>
          )}
        </div>
      </div>
    </Main>
  )
}

/* ─── Row ─── */
interface TarotRowProps {
  tarot: TarotType
  isSelected: boolean
  onSelect: (t: TarotType) => void
  inlineDetail: React.ReactNode
}

const TarotRow: FC<TarotRowProps> = ({ tarot, isSelected, onSelect, inlineDetail }) => {
  const [zh, en] = tarot.name.split(' / ')
  return (
    <div id={tarot.index} className={`tarot-row ${isSelected ? 'tarot-row-active' : ''}`}>
      <button className='tarot-row-btn' onClick={() => onSelect(tarot)} aria-expanded={isSelected}>
        <span className='tarot-row-name'>
          <span>{zh}</span>
          {en && (
            <>
              <span className='hidden sm:inline text-gray-400'> / </span>
              <span className='block sm:inline tarot-row-en'>{en}</span>
            </>
          )}
        </span>
        <span className='tarot-row-meta'>
          <span className='tarot-row-element'>{tarot.element}</span>
          <span className='tarot-row-index'>{tarot.index.toUpperCase()}</span>
        </span>
      </button>
      {/* 仅小屏展示内联详情 */}
      {inlineDetail && <div className='tarot-inline-detail'>{inlineDetail}</div>}
    </div>
  )
}

/* ─── Detail Panel ─── */
interface TarotDetailProps {
  tarot: TarotType
  tab: TabKey
  onTabChange: (t: TabKey) => void
  sticky?: boolean
}

const TarotDetail: FC<TarotDetailProps> = ({ tarot, tab, onTabChange, sticky }) => (
  <div className={`tarot-detail ${sticky ? 'tarot-detail-sticky' : ''}`}>
    <div className='tarot-detail-img-wrap'>
      <Image
        width={237}
        height={340}
        className={`tarot-detail-img ${tab === 'down' ? 'tarot-img-reversed' : ''}`}
        src={`/images/tarot/${tarot.index}.jpg`}
        alt={tarot.name}
        style={{ height: 'auto' }}
        priority
      />
    </div>

    <div className='tarot-detail-body'>
      <div className='tarot-detail-title'>{tarot.name}</div>

      <div className='tarot-detail-keywords'>
        {tarot.keywords.map((kw) => (
          <span key={kw} className='tarot-keyword'>{kw}</span>
        ))}
      </div>

      <div className='tarot-detail-tabs'>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`tarot-tab-btn ${tab === key ? 'tarot-tab-active' : ''}`}
            onClick={() => onTabChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className='tarot-detail-content'>
        {tab === 'summary' && (
          <p className='tarot-summary'>{tarot.summary}</p>
        )}
        {tab !== 'summary' && (
          <dl className='tarot-dict'>
            {Object.entries(tarot[tab]).map(([key, value]) => (
              <div key={key} className='tarot-dict-item'>
                <dt className='tarot-dict-key'>{key}</dt>
                <dd className='tarot-dict-val'>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  </div>
)

export default Tarot
