import { useEffect, useState } from 'react';

import type { NextPage } from 'next';

import { useRouter } from 'next/router';
import Footer from '../components/Footer';
import Logo from '../components/Logo';
import Main from '../components/Main';
import NumberInput from '../components/NumberInput';

import Solver from '../libs/24points';

const Game: NextPage = () => {

  const router = useRouter();
  const [nums, setNums] = useState<string[]>([]);
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    const { num } = router.query;
    let tNums = num as string[] || []
    tNums = tNums.concat(new Array(4 - tNums.length).fill(''));
    setNums(tNums);
    // get result
    let result = Solver.methodA(...tNums);
    if (result.length === 0) result = Solver.methodB(...tNums);
    // array unique
    result = [...new Set(result)];
    setResults(result)
  }, [router.query]);

  return (
    <Main title='24 Points Game' footer={<Footer />}>
      <h1>24 Points Game</h1>
      <div>
        Input 4 numbers, and click the button to get the result.
      </div>
      <form className='numbers'>
        {nums.map((n, i) => (<NumberInput
          key={i}
          value={n}
          onChange={(evt) => {
            let tNums = [...nums];
            tNums[i] = evt.target.value
            setNums(tNums);
          }}
        />))}
        <button type='submit' className='btn-solver'>Calculate</button>
      </form>
      <ul className='result-list'>
        {results.length
          ? results.map((r, i) => <li key={i}>{r}</li>)
          : <li className='no-result'>No result !!!</li>}
      </ul>
      <Logo />
    </Main>
  );
};

export default Game;
