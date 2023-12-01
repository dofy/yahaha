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

export type HeartMap = {
  [key: string]: Heart
}

export type ArrayDict = {
  [key: string]: string[]
}

export type Dict = {
  [key: string]: string
}
