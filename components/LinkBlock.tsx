import { GitHubLink, LinkCategory, NormalLink, SocialLink } from '@/types'
import Image from 'next/legacy/image'
import Link from 'next/link'
import React from 'react'

interface LinkBlockProps {
  cat: LinkCategory
  links: NormalLink[] | SocialLink[] | GitHubLink[]
}

const WhichLink = (
  cat: LinkCategory,
  link: NormalLink | SocialLink | GitHubLink
) => {
  switch (cat.name) {
    case 'social':
      let socialLInk = link as SocialLink
      return (
        <React.Fragment>
          {cat.prefix}
          <Link href={`${link.url}${socialLInk.userId}`}>
            {socialLInk.userName}
          </Link>
          @<Link href={link.url}>{link.name}</Link>
          {cat.subfix}
        </React.Fragment>
      )
    case 'github':
      let githubLink = link as GitHubLink
      return (
        <React.Fragment>
          {cat.prefix}
          <Link href={`https://github.com/dofy/${link.url}`}>{link.name}</Link>
          <Image
            width={githubLink.width}
            height={20}
            alt={link.name}
            layout='fixed'
            src={`https://img.shields.io/github/stars/dofy/${link.url}?style=flat`}
          />
          {cat.subfix}
        </React.Fragment>
      )
    case 'heart':
    case 'friend':
    case 'tool':
    default:
      return (
        <React.Fragment>
          {cat.prefix}
          <Link href={link.url}>{link.name}</Link>
          {cat.subfix}
        </React.Fragment>
      )
  }
}

export const LinkBlock = (props: LinkBlockProps) => {
  const { cat, links } = props

  return (
    <ul className={cat.name}>
      {links.map((link, index) => (
        <li key={index}>{WhichLink(cat, link)}</li>
      ))}
    </ul>
  )
}
