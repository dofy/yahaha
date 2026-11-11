export type Domain = {
  name: string
  url: string
}

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
