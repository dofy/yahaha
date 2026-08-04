export type Domain = {
  name: string
  url: string
}

export type LinkCategory = {
  name: string
  prefix: string
  subfix: string
}

export type GitHubLink = {
  name: string
  url: string
  width: number
}

export type NormalLink = {
  name: string
  url: string
  icon?: string
}

export type SocialLink = {
  userId: string
  userName: string
  name: string
  url: string
}

export type Links = {
  cat: LinkCategory
  links: NormalLink[] | SocialLink[] | GitHubLink[]
}[]

export type Heart = {
  title: string
  lines: string[]
}

export type HeartMap = Record<string, Heart>

export type ArrayDict = Record<string, string[]>

export type Dict = Record<string, string>

export type Tarot = {
  index: string
  name: string
  keywords: string[]
  element: string
  summary: string
  up: Record<string, string>
  down: Record<string, string>
}
