import Link from 'next/link';
import Image from 'next/image';
import { LinkCategory, NormalLink, SocialLink } from '../types';

export interface LinkBlockProps {
  cat: LinkCategory;
  links: NormalLink[] | SocialLink[];
}

const WhichLink = (cat: LinkCategory, link: NormalLink | SocialLink) => {
  switch (cat.id) {
    case 'social':
      let socialLInk = link as SocialLink;
      return (
        <>
          {cat.prefix}
          <Link href={`${link.url}${socialLInk.userId}`}>
            <a>{socialLInk.userName}</a>
          </Link>
          @
          <Link href={link.url}>
            <a>{link.name}</a>
          </Link>
          {cat.subfix}
        </>
      );
    case 'github':
      return (
        <>
          {cat.prefix}
          <Link href={`https://github.com/dofy/${link.url}`}>
            <a>{link.name}</a>
          </Link>
          <Image
            width={60}
            height={20}
            src={`https://img.shields.io/github/stars/dofy/${link.url}?style=flat`}
          />
          {cat.subfix}
        </>
      );
    case 'heart':
    case 'friend':
    case 'tool':
    default:
      return (
        <>
          {cat.prefix}
          <Link href={link.url}>
            <a>{link.name}</a>
          </Link>
          {cat.subfix}
        </>
      );
  }
};

const LinkBlock = (props: LinkBlockProps) => {
  const { cat, links } = props;

  return (
    <ul className={cat.id}>
      {links.map((link, index) => (
        <li key={index}>{WhichLink(cat, link)}</li>
      ))}
    </ul>
  );
};

export default LinkBlock;
