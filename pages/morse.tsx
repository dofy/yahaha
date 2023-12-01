import { NextPage } from 'next'
import { useEffect, useState } from 'react'
import Footer from '../components/Footer'
import Main from '../components/Main'
import MorseData from '../libs/data/morse.json'
import { Dict } from '../typings'
import copy from 'clipboard-copy'

interface MorseLetterProps {
  letter: string
}

const morseDict = MorseData as Dict

const MorseLetter: React.FC<MorseLetterProps> = ({ letter }) => {
  const morse = morseDict[letter.toUpperCase()]
  return <span className='morse-letter'>{morse}</span>
}

interface MorseWordProps {
  word: string
}

const MorseWord: React.FC<MorseWordProps> = ({ word }) => {
  const letters = word.split('')
  return (
    <span className='morse-word'>
      {letters.map((letter, index) => (
        <MorseLetter key={index} letter={letter} />
      ))}
    </span>
  )
}

const Morse: NextPage = () => {
  const [text, setText] = useState<string>('')
  const [code, setCode] = useState<string>('')

  useEffect(() => {
    setCode(
      text
        .replace(/\s+/g, ' ')
        .split('')
        .map((l) => morseDict[l.toUpperCase()])
        .join(' ')
    )
  }, [text])

  return (
    <Main title='Morse Code' footer={<Footer />}>
      <h1>Morse Code</h1>
      <div className='input-box'>
        <input
          className='text-input'
          onChange={(evt) => setText(evt.target.value)}
          placeholder='Enter text here...'
          value={text}
        />
      </div>
      <div className='morse-code' onClick={() => copy(code)}>
        {text
          .trim()
          .split(/\s+/)
          .map((word, index) => (
            <MorseWord key={index} word={word} />
          ))}
      </div>
    </Main>
  )
}

export default Morse
