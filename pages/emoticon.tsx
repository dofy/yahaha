import type { NextPage } from 'next';
import Main from '../components/Main';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import Link from 'next/link';

const Emoticon: NextPage = () => {
  return (
    <Main
      title='Emoticon Kit'
      footer={
        <Footer>
          <div className='footer text-sm'>
            powered by Angela &amp;{' '}
            <Link href='https://twitter.com/dofy'>
              <a>Seven</a>
            </Link>
          </div>
          <div className='footer text-sm'>┻━┻︵╰(‵□′)╯︵┻━┻</div>
        </Footer>
      }
    >
      <h1>Emoticon Kit</h1>
      <Logo />
    </Main>
  );
};

export default Emoticon;
