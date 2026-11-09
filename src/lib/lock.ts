/**
 * Key bitting (牙花编码) generator for pin tumbler locks.
 *
 * A code is an array of `holes` pin numbers taken from 1..`pins`, ordered from
 * the innermost chamber to the outermost one. Pin 1 is the shortest pin and
 * therefore the shallowest cut; pin `pins` is the longest pin and the deepest
 * cut.
 *
 * Every rule is optional: a numeric rule is disabled when it is 0. The solver
 * walks the code space depth first in ascending order and rejects a prefix as
 * soon as a rule can no longer hold, so the cost follows the number of
 * surviving codes rather than the full `pins ** holes` space.
 */

export const MAX_PINS = 20
export const MAX_HOLES = 16
export const DEFAULT_LIMIT = 20_000
export const DEFAULT_NODE_BUDGET = 4_000_000

/** Largest number of masked keys the Hamming-distance filter will index. */
const MAX_DISTANCE_COMBINATIONS = 256

export type LockParams = {
  /** A — pin depths available (牙花号数). */
  pins: number
  /** B — chambers, i.e. code length (弹子孔数). */
  holes: number
  /** C — pin that must be used, 0 when unused (必须使用的弹子号). */
  requiredPin: number
  /** D — pin that must not be used, 0 when unused (不得使用的弹子号). */
  forbiddenPin: number
  /** E — chamber that must hold pin C, 0 for "anywhere" (使用 C 弹子的孔号). */
  requiredHole: number
  /** F — chamber that must not hold pin D, 0 for "nowhere" (禁用 D 弹子的孔号). */
  forbiddenHole: number
  /** G — reject a run of G or more identical neighbouring pins. */
  maxRun: number
  /** H — reject a step of H or more between neighbouring pins. */
  maxStep: number
  /** I — reject a code within Hamming distance I of a kept code. */
  minDistance: number
  /** J — reject a code with J or more runs of identical neighbouring pins. */
  maxPairGroups: number
  /** K — reject a code whose pins are all K or shorter. */
  longPinFloor: number
  /** L — reject a code that uses one pin L or more times. */
  maxRepeat: number
  /** Reject a code made of one repeated pin (111111). */
  dropUniform: boolean
  /** Reject a staircase code (123456 or 654321). */
  dropLadder: boolean
}

export type RuleId =
  | 'uniform'
  | 'ladder'
  | 'required'
  | 'forbidden'
  | 'run'
  | 'step'
  | 'groups'
  | 'long'
  | 'repeat'
  | 'distance'
  | 'pairSum'

export const ruleOrder: readonly RuleId[] = [
  'uniform',
  'ladder',
  'required',
  'forbidden',
  'run',
  'step',
  'groups',
  'long',
  'repeat',
  'distance',
  'pairSum'
]

export const ruleLabels: Record<RuleId, { letter: string; label: string }> = {
  uniform: { letter: '', label: 'No single-depth code' },
  ladder: { letter: '', label: 'No staircase code' },
  required: { letter: 'C/E', label: 'Required pin' },
  forbidden: { letter: 'D/F', label: 'Forbidden pin' },
  run: { letter: 'G', label: 'Identical run limit' },
  step: { letter: 'H', label: 'Neighbour step limit' },
  groups: { letter: 'J', label: 'Repeated-pair limit' },
  long: { letter: 'K', label: 'Long pin floor' },
  repeat: { letter: 'L', label: 'Pin reuse limit' },
  distance: { letter: 'I', label: 'Minimum difference' },
  pairSum: { letter: 'H′', label: 'Paired sum limit' }
}

export type ParamIssue = { field: keyof LockParams; message: string }

export type SolveResult = {
  codes: number[][]
  /** pins ** holes, the size of the unfiltered code space. */
  total: bigint
  /** Prefixes examined by the search. */
  visited: number
  /** Codes dropped because a kept code was within Hamming distance I. */
  nearDuplicates: number
  /** Set when the search stopped early. */
  truncated: 'limit' | 'budget' | null
}

export const defaultParams: LockParams = {
  pins: 6,
  holes: 6,
  requiredPin: 0,
  forbiddenPin: 0,
  requiredHole: 0,
  forbiddenHole: 0,
  maxRun: 3,
  maxStep: 5,
  minDistance: 1,
  maxPairGroups: 2,
  longPinFloor: 3,
  maxRepeat: 3,
  dropUniform: true,
  dropLadder: true
}

function isCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0
}

/** Reports every parameter problem, so a form can mark all offending fields. */
export function validateParams(params: LockParams): ParamIssue[] {
  const issues: ParamIssue[] = []
  const numeric: (keyof LockParams)[] = [
    'pins',
    'holes',
    'requiredPin',
    'forbiddenPin',
    'requiredHole',
    'forbiddenHole',
    'maxRun',
    'maxStep',
    'minDistance',
    'maxPairGroups',
    'longPinFloor',
    'maxRepeat'
  ]
  for (const field of numeric) {
    if (!isCount(params[field] as number)) {
      issues.push({ field, message: 'Enter a whole number of 0 or more.' })
    }
  }
  if (issues.length > 0) return issues

  if (params.pins < 2 || params.pins > MAX_PINS) {
    issues.push({ field: 'pins', message: `Use 2 to ${MAX_PINS} pin depths.` })
  }
  if (params.holes < 2 || params.holes > MAX_HOLES) {
    issues.push({ field: 'holes', message: `Use 2 to ${MAX_HOLES} chambers.` })
  }
  if (issues.length > 0) return issues

  if (params.requiredPin > params.pins) {
    issues.push({ field: 'requiredPin', message: 'C cannot exceed A.' })
  }
  if (params.forbiddenPin > params.pins) {
    issues.push({ field: 'forbiddenPin', message: 'D cannot exceed A.' })
  }
  if (params.requiredHole > params.holes) {
    issues.push({ field: 'requiredHole', message: 'E cannot exceed B.' })
  }
  if (params.forbiddenHole > params.holes) {
    issues.push({ field: 'forbiddenHole', message: 'F cannot exceed B.' })
  }
  if (params.requiredHole > 0 && params.requiredPin === 0) {
    issues.push({ field: 'requiredPin', message: 'Set C to use chamber E.' })
  }
  if (params.forbiddenHole > 0 && params.forbiddenPin === 0) {
    issues.push({ field: 'forbiddenPin', message: 'Set D to use chamber F.' })
  }
  if (params.minDistance >= params.holes) {
    issues.push({
      field: 'minDistance',
      message: 'I must stay below B, or every code collides.'
    })
  }
  if (params.minDistance > 0) {
    if (
      combinationCount(params.holes, params.minDistance) >
      MAX_DISTANCE_COMBINATIONS
    ) {
      issues.push({
        field: 'minDistance',
        message: 'I is too large for this code length. Lower it.'
      })
    }
  }
  return issues
}

function combinationCount(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let result = 1
  for (let step = 1; step <= k; step += 1) {
    result = (result * (n - k + step)) / step
  }
  return Math.round(result)
}

/** All index subsets of exactly `size` positions out of `length`. */
function positionSubsets(length: number, size: number): number[][] {
  const subsets: number[][] = []
  const current: number[] = []
  const walk = (start: number) => {
    if (current.length === size) {
      subsets.push([...current])
      return
    }
    for (let index = start; index < length; index += 1) {
      current.push(index)
      walk(index + 1)
      current.pop()
    }
  }
  walk(0)
  return subsets
}

/**
 * Rejects a code that sits within `minDistance` chambers of an admitted code.
 *
 * Two codes are within Hamming distance d exactly when some set of d positions
 * covers every chamber where they differ, so masking each admitted code over
 * every such position set turns the pairwise test into a hash lookup. Codes
 * arrive in ascending order, so the smallest member of each cluster is kept.
 */
function createDistanceFilter(length: number, minDistance: number) {
  if (minDistance <= 0) return { admit: () => true }
  const subsets = positionSubsets(length, minDistance)
  const seen = new Set<string>()
  return {
    admit(code: readonly number[]): boolean {
      const keys = subsets.map((positions) => {
        const parts = code.map(String)
        for (const position of positions) parts[position] = '*'
        return parts.join(',')
      })
      if (keys.some((key) => seen.has(key))) return false
      for (const key of keys) seen.add(key)
      return true
    }
  }
}

function isLadder(code: readonly number[]): boolean {
  if (code.length < 2) return false
  const step = code[1] - code[0]
  if (Math.abs(step) !== 1) return false
  for (let index = 1; index < code.length - 1; index += 1) {
    if (code[index + 1] - code[index] !== step) return false
  }
  return true
}

function isUniform(code: readonly number[]): boolean {
  return code.length > 1 && code.every((pin) => pin === code[0])
}

/**
 * Enumerates every code that satisfies the parameters, in ascending order.
 *
 * Rules C, D, E, F, G, H, J, K and L prune the search; rule I is applied while
 * codes are collected, so the lexicographically smallest member of each cluster
 * of near-identical codes is the one that survives.
 */
export function solveLock(
  params: LockParams,
  options: { limit?: number; nodeBudget?: number } = {}
): SolveResult {
  const issues = validateParams(params)
  if (issues.length > 0) {
    throw new RangeError(issues[0].message)
  }

  const limit = options.limit ?? DEFAULT_LIMIT
  const nodeBudget = options.nodeBudget ?? DEFAULT_NODE_BUDGET
  const {
    pins,
    holes,
    requiredPin,
    forbiddenPin,
    requiredHole,
    forbiddenHole,
    maxRun,
    maxStep,
    minDistance,
    maxPairGroups,
    longPinFloor,
    maxRepeat,
    dropUniform,
    dropLadder
  } = params

  const total = BigInt(pins) ** BigInt(holes)
  const codes: number[][] = []
  const counts = new Array<number>(pins + 1).fill(0)
  const code = new Array<number>(holes).fill(0)
  const distance = createDistanceFilter(holes, minDistance)

  let visited = 0
  let nearDuplicates = 0
  let truncated: SolveResult['truncated'] = null

  // No code can carry a pin longer than K when K already covers every depth.
  if (longPinFloor >= pins) {
    return { codes, total, visited, nearDuplicates, truncated }
  }

  const accept = (candidate: readonly number[]): boolean => {
    if (dropUniform && isUniform(candidate)) return false
    if (dropLadder && isLadder(candidate)) return false
    if (!distance.admit(candidate)) {
      nearDuplicates += 1
      return false
    }
    return true
  }

  const walk = (
    index: number,
    run: number,
    groups: number,
    maxPin: number,
    hasRequired: boolean
  ): boolean => {
    if (truncated) return false
    if (index === holes) {
      if (requiredPin > 0 && requiredHole === 0 && !hasRequired) return true
      if (longPinFloor > 0 && maxPin <= longPinFloor) return true
      if (accept(code)) {
        codes.push([...code])
        if (codes.length >= limit) {
          truncated = 'limit'
          return false
        }
      }
      return true
    }

    const hole = index + 1
    const first = requiredHole === hole ? requiredPin : 1
    const last = requiredHole === hole ? requiredPin : pins

    for (let pin = first; pin <= last; pin += 1) {
      visited += 1
      if (visited > nodeBudget) {
        truncated = 'budget'
        return false
      }
      if (forbiddenPin > 0) {
        if (forbiddenHole === hole && pin === forbiddenPin) continue
        if (forbiddenHole === 0 && pin === forbiddenPin) continue
      }
      if (maxRepeat > 0 && counts[pin] + 1 >= maxRepeat) continue

      const previous = index > 0 ? code[index - 1] : 0
      let nextRun = 1
      let nextGroups = groups
      if (index > 0) {
        if (maxStep > 0 && Math.abs(pin - previous) >= maxStep) continue
        if (pin === previous) {
          nextRun = run + 1
          if (maxRun > 0 && nextRun >= maxRun) continue
          if (nextRun === 2) {
            nextGroups = groups + 1
            if (maxPairGroups > 0 && nextGroups >= maxPairGroups) continue
          }
        }
      }

      const nextMax = pin > maxPin ? pin : maxPin
      const nextRequired = hasRequired || pin === requiredPin
      // Rules that only a finished code can fail still prune the last chamber.
      if (index === holes - 1) {
        if (requiredPin > 0 && requiredHole === 0 && !nextRequired) continue
        if (longPinFloor > 0 && nextMax <= longPinFloor) continue
      }

      code[index] = pin
      counts[pin] += 1
      const proceed = walk(
        index + 1,
        nextRun,
        nextGroups,
        nextMax,
        nextRequired
      )
      counts[pin] -= 1
      if (!proceed) return false
    }
    return true
  }

  walk(0, 0, 0, 0, false)

  return { codes, total, visited, nearDuplicates, truncated }
}

export type RuleReport = {
  rule: RuleId
  ok: boolean
  /** Chambers the rule points at, 1-based. */
  holes: number[]
  detail: string
}

/**
 * Explains a single code against the parameters, for the manual check panel.
 * Rule I is pairwise and therefore outside the scope of one code.
 */
export function explainCode(
  params: LockParams,
  code: readonly number[]
): RuleReport[] {
  const reports: RuleReport[] = []
  const add = (rule: RuleId, ok: boolean, holes: number[], detail: string) =>
    reports.push({ rule, ok, holes, detail })

  if (params.dropUniform) {
    const uniform = isUniform(code)
    add(
      'uniform',
      !uniform,
      uniform ? code.map((_, index) => index + 1) : [],
      uniform ? 'Every chamber uses the same pin.' : 'Not a single-depth code.'
    )
  }
  if (params.dropLadder) {
    const ladder = isLadder(code)
    add(
      'ladder',
      !ladder,
      ladder ? code.map((_, index) => index + 1) : [],
      ladder ? 'Pins rise or fall by one across the code.' : 'Not a staircase.'
    )
  }
  if (params.requiredPin > 0) {
    if (params.requiredHole > 0) {
      const ok = code[params.requiredHole - 1] === params.requiredPin
      add(
        'required',
        ok,
        [params.requiredHole],
        `Chamber ${params.requiredHole} holds pin ${code[params.requiredHole - 1]}, needs pin ${params.requiredPin}.`
      )
    } else {
      const holes = code
        .map((pin, index) => (pin === params.requiredPin ? index + 1 : 0))
        .filter(Boolean)
      add(
        'required',
        holes.length > 0,
        holes,
        holes.length > 0
          ? `Pin ${params.requiredPin} appears in chamber ${holes.join(', ')}.`
          : `Pin ${params.requiredPin} is missing.`
      )
    }
  }
  if (params.forbiddenPin > 0) {
    if (params.forbiddenHole > 0) {
      const ok = code[params.forbiddenHole - 1] !== params.forbiddenPin
      add(
        'forbidden',
        ok,
        [params.forbiddenHole],
        ok
          ? `Chamber ${params.forbiddenHole} avoids pin ${params.forbiddenPin}.`
          : `Chamber ${params.forbiddenHole} uses the forbidden pin ${params.forbiddenPin}.`
      )
    } else {
      const holes = code
        .map((pin, index) => (pin === params.forbiddenPin ? index + 1 : 0))
        .filter(Boolean)
      add(
        'forbidden',
        holes.length === 0,
        holes,
        holes.length === 0
          ? `Pin ${params.forbiddenPin} is unused.`
          : `Pin ${params.forbiddenPin} appears in chamber ${holes.join(', ')}.`
      )
    }
  }
  if (params.maxRun > 0) {
    let longest = 1
    let run = 1
    let start = 0
    let longestStart = 0
    for (let index = 1; index < code.length; index += 1) {
      if (code[index] === code[index - 1]) {
        run += 1
      } else {
        run = 1
        start = index
      }
      if (run > longest) {
        longest = run
        longestStart = start
      }
    }
    const holes =
      longest >= params.maxRun
        ? Array.from(
            { length: longest },
            (_, offset) => longestStart + offset + 1
          )
        : []
    add(
      'run',
      longest < params.maxRun,
      holes,
      `Longest identical run is ${longest}, limit is ${params.maxRun}.`
    )
  }
  if (params.maxStep > 0) {
    const holes: number[] = []
    let widest = 0
    for (let index = 1; index < code.length; index += 1) {
      const step = Math.abs(code[index] - code[index - 1])
      if (step > widest) widest = step
      if (step >= params.maxStep) holes.push(index, index + 1)
    }
    add(
      'step',
      holes.length === 0,
      [...new Set(holes)],
      `Widest neighbour step is ${widest}, limit is ${params.maxStep}.`
    )
  }
  if (params.maxPairGroups > 0) {
    const holes: number[] = []
    let groups = 0
    let run = 1
    for (let index = 1; index <= code.length; index += 1) {
      if (index < code.length && code[index] === code[index - 1]) {
        run += 1
        continue
      }
      if (run >= 2) {
        groups += 1
        for (let offset = 0; offset < run; offset += 1) {
          holes.push(index - offset)
        }
      }
      run = 1
    }
    add(
      'groups',
      groups < params.maxPairGroups,
      groups >= params.maxPairGroups
        ? [...new Set(holes)].sort((a, b) => a - b)
        : [],
      `${groups} repeated-pin group${groups === 1 ? '' : 's'}, limit is ${params.maxPairGroups}.`
    )
  }
  if (params.longPinFloor > 0) {
    const deepest = Math.max(...code)
    add(
      'long',
      deepest > params.longPinFloor,
      deepest > params.longPinFloor
        ? code
            .map((pin, index) => (pin > params.longPinFloor ? index + 1 : 0))
            .filter(Boolean)
        : code.map((_, index) => index + 1),
      `Deepest pin is ${deepest}; at least one pin must exceed ${params.longPinFloor}.`
    )
  }
  if (params.maxRepeat > 0) {
    const counts = new Map<number, number>()
    for (const pin of code) counts.set(pin, (counts.get(pin) ?? 0) + 1)
    let worstPin = code[0]
    let worst = 0
    for (const [pin, count] of counts) {
      if (count > worst) {
        worst = count
        worstPin = pin
      }
    }
    add(
      'repeat',
      worst < params.maxRepeat,
      worst >= params.maxRepeat
        ? code
            .map((pin, index) => (pin === worstPin ? index + 1 : 0))
            .filter(Boolean)
        : [],
      `Pin ${worstPin} is used ${worst} times, limit is ${params.maxRepeat}.`
    )
  }
  return reports
}

/** Compact bitting text; pins above 9 need a separator to stay readable. */
export function formatCode(code: readonly number[], pins: number): string {
  return pins > 9 ? code.join('-') : code.join('')
}

export function parseCode(input: string, params: LockParams): number[] | null {
  const parts = input.includes('-')
    ? input.split('-')
    : params.pins > 9
      ? input.trim().split(/\s+/u)
      : [...input.trim()]
  const code = parts
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map(Number)
  if (code.length !== params.holes) return null
  if (
    code.some((pin) => !Number.isInteger(pin) || pin < 1 || pin > params.pins)
  ) {
    return null
  }
  return code
}

/** Spreadsheet-friendly export; the first rows record the parameters used. */
export function toCsv(codes: readonly number[][], params: LockParams): string {
  const rows: string[][] = [
    ['# A pins', String(params.pins)],
    ['# B chambers', String(params.holes)],
    ['# C required pin', String(params.requiredPin)],
    ['# D forbidden pin', String(params.forbiddenPin)],
    ['# E required chamber', String(params.requiredHole)],
    ['# F forbidden chamber', String(params.forbiddenHole)],
    ['# G identical run limit', String(params.maxRun)],
    ['# H neighbour step limit', String(params.maxStep)],
    ['# I minimum difference', String(params.minDistance)],
    ['# J repeated-pair limit', String(params.maxPairGroups)],
    ['# K long pin floor', String(params.longPinFloor)],
    ['# L pin reuse limit', String(params.maxRepeat)],
    ['# single-depth codes', params.dropUniform ? 'dropped' : 'kept'],
    ['# staircase codes', params.dropLadder ? 'dropped' : 'kept'],
    [
      'index',
      'code',
      ...Array.from({ length: params.holes }, (_, i) => `hole ${i + 1}`)
    ]
  ]
  codes.forEach((code, index) => {
    rows.push([
      String(index + 1),
      formatCode(code, params.pins),
      ...code.map(String)
    ])
  })
  return rows.map((row) => row.join(',')).join('\r\n')
}

export function codeFileName(params: LockParams): string {
  const parts = [
    params.pins,
    params.holes,
    params.requiredPin,
    params.forbiddenPin,
    params.requiredHole,
    params.forbiddenHole,
    params.maxRun,
    params.maxStep,
    params.minDistance,
    params.maxPairGroups,
    params.longPinFloor,
    params.maxRepeat
  ]
  return `lock-${parts.join('-')}.csv`
}

/* ------------------------------------------------------------------------ *
 * Double row (双排弹子)
 *
 * A double-row lock carries two pin rows side by side. Each row has its own
 * depth count, chamber count and chamber rules; the run, step, pair-group,
 * long-pin and reuse rules apply to each row separately with shared limits.
 * Two extra rules couple the rows: the paired depths of one chamber must stay
 * below H′, and rule I compares the two rows joined into one code.
 * ------------------------------------------------------------------------ */

/** Row limit for the per-row searches that feed the pairing step. */
export const DEFAULT_ROW_LIMIT = 50_000

export type DoubleRow = {
  pins: number
  holes: number
  requiredPin: number
  requiredHole: number
  forbiddenPin: number
  forbiddenHole: number
}

export type DoubleLockParams = {
  rows: [DoubleRow, DoubleRow]
  maxRun: number
  maxStep: number
  /** H′ — reject a chamber whose two rows add up to H′ or more (并排之和). */
  maxPairSum: number
  minDistance: number
  maxPairGroups: number
  longPinFloor: number
  maxRepeat: number
  dropUniform: boolean
  dropLadder: boolean
}

export type DoubleCode = { a: number[]; b: number[] }

export type DoubleSolveResult = {
  codes: DoubleCode[]
  /** Surviving codes per row, before pairing. */
  rowCounts: [number, number]
  total: bigint
  visited: number
  nearDuplicates: number
  truncated: 'limit' | 'budget' | 'rows' | null
}

export type DoubleParamIssue = { field: string; message: string }

export type DoubleRuleReport = RuleReport & {
  /** Row the rule reads, or 'pair' for the cross-row sum. */
  row: 'a' | 'b' | 'pair'
  /** Chambers the rule points at in the other row, for 'pair'. */
  otherHoles?: number[]
}

export const defaultDoubleParams: DoubleLockParams = {
  rows: [
    {
      pins: 4,
      holes: 6,
      requiredPin: 0,
      requiredHole: 0,
      forbiddenPin: 0,
      forbiddenHole: 0
    },
    {
      pins: 3,
      holes: 6,
      requiredPin: 0,
      requiredHole: 0,
      forbiddenPin: 0,
      forbiddenHole: 0
    }
  ],
  maxRun: 3,
  maxStep: 0,
  maxPairSum: 6,
  minDistance: 1,
  maxPairGroups: 2,
  longPinFloor: 2,
  maxRepeat: 3,
  dropUniform: true,
  dropLadder: false
}

const rowFields = new Set<string>([
  'pins',
  'holes',
  'requiredPin',
  'requiredHole',
  'forbiddenPin',
  'forbiddenHole'
])

export const rowKeys = ['a', 'b'] as const
export type RowKey = (typeof rowKeys)[number]

/** Flattens one row plus the shared rules into single-row parameters. */
export function rowParamsFor(
  params: DoubleLockParams,
  row: 0 | 1
): LockParams {
  const source = params.rows[row]
  return {
    pins: source.pins,
    holes: source.holes,
    requiredPin: source.requiredPin,
    requiredHole: source.requiredHole,
    forbiddenPin: source.forbiddenPin,
    forbiddenHole: source.forbiddenHole,
    maxRun: params.maxRun,
    maxStep: params.maxStep,
    // Rule I reads both rows at once, so no row filters on its own.
    minDistance: 0,
    maxPairGroups: params.maxPairGroups,
    longPinFloor: params.longPinFloor,
    maxRepeat: params.maxRepeat,
    dropUniform: params.dropUniform,
    dropLadder: params.dropLadder
  }
}

/** Number of chambers that exist in both rows, i.e. the paired chambers. */
export function pairedHoles(params: DoubleLockParams): number {
  return Math.min(params.rows[0].holes, params.rows[1].holes)
}

export function validateDoubleParams(
  params: DoubleLockParams
): DoubleParamIssue[] {
  const issues: DoubleParamIssue[] = []
  for (const [index, key] of rowKeys.entries()) {
    for (const issue of validateParams(rowParamsFor(params, index as 0 | 1))) {
      if (rowFields.has(issue.field)) {
        issues.push({ field: `${key}.${issue.field}`, message: issue.message })
      } else {
        issues.push({ field: issue.field, message: issue.message })
      }
    }
  }
  if (issues.length > 0) {
    return issues.filter(
      (issue, index, all) =>
        all.findIndex(
          (other) =>
            other.field === issue.field && other.message === issue.message
        ) === index
    )
  }

  if (!isCount(params.maxPairSum)) {
    issues.push({
      field: 'maxPairSum',
      message: 'Enter a whole number of 0 or more.'
    })
  } else if (params.maxPairSum > 0 && params.maxPairSum <= 2) {
    issues.push({
      field: 'maxPairSum',
      message: 'The smallest pair adds up to 2, so use 3 or more.'
    })
  }
  const length = params.rows[0].holes + params.rows[1].holes
  if (params.minDistance >= length) {
    issues.push({
      field: 'minDistance',
      message: 'I must stay below the joined code length.'
    })
  } else if (
    params.minDistance > 0 &&
    combinationCount(length, params.minDistance) > MAX_DISTANCE_COMBINATIONS
  ) {
    issues.push({
      field: 'minDistance',
      message: 'I is too large for this code length. Lower it.'
    })
  }
  return issues
}

/**
 * Pairs the surviving codes of both rows.
 *
 * Each row is searched on its own, because every row rule is row-local; the
 * paired-sum rule and rule I then run over the pairs. Pairs come out ordered by
 * row A and then row B, so the output is reproducible.
 */
export function solveDoubleLock(
  params: DoubleLockParams,
  options: { limit?: number; nodeBudget?: number; rowLimit?: number } = {}
): DoubleSolveResult {
  const issues = validateDoubleParams(params)
  if (issues.length > 0) {
    throw new RangeError(issues[0].message)
  }

  const limit = options.limit ?? DEFAULT_LIMIT
  const nodeBudget = options.nodeBudget ?? DEFAULT_NODE_BUDGET
  const rowLimit = options.rowLimit ?? DEFAULT_ROW_LIMIT
  const [left, right] = ([0, 1] as const).map((row) =>
    solveLock(rowParamsFor(params, row), { limit: rowLimit, nodeBudget })
  )

  const total = left.total * right.total
  const codes: DoubleCode[] = []
  const paired = pairedHoles(params)
  const length = params.rows[0].holes + params.rows[1].holes
  const distance = createDistanceFilter(length, params.minDistance)
  let visited = left.visited + right.visited
  let nearDuplicates = 0
  let truncated: DoubleSolveResult['truncated'] =
    left.truncated || right.truncated ? 'rows' : null

  outer: for (const a of left.codes) {
    for (const b of right.codes) {
      visited += 1
      if (visited > nodeBudget) {
        truncated = 'budget'
        break outer
      }
      if (params.maxPairSum > 0) {
        let blocked = false
        for (let hole = 0; hole < paired; hole += 1) {
          if (a[hole] + b[hole] >= params.maxPairSum) {
            blocked = true
            break
          }
        }
        if (blocked) continue
      }
      if (!distance.admit([...a, ...b])) {
        nearDuplicates += 1
        continue
      }
      codes.push({ a: [...a], b: [...b] })
      if (codes.length >= limit) {
        truncated = 'limit'
        break outer
      }
    }
  }

  return {
    codes,
    rowCounts: [left.codes.length, right.codes.length],
    total,
    visited,
    nearDuplicates,
    truncated
  }
}

/** Explains one paired code: every row rule, then the paired-sum rule. */
export function explainDoubleCode(
  params: DoubleLockParams,
  code: DoubleCode
): DoubleRuleReport[] {
  const reports: DoubleRuleReport[] = []
  for (const [index, key] of rowKeys.entries()) {
    const row = index === 0 ? code.a : code.b
    for (const report of explainCode(rowParamsFor(params, index as 0 | 1), row)) {
      reports.push({ ...report, row: key })
    }
  }
  if (params.maxPairSum > 0) {
    const paired = pairedHoles(params)
    const holes: number[] = []
    let widest = 0
    for (let hole = 0; hole < paired; hole += 1) {
      const sum = code.a[hole] + code.b[hole]
      if (sum > widest) widest = sum
      if (sum >= params.maxPairSum) holes.push(hole + 1)
    }
    reports.push({
      rule: 'pairSum',
      row: 'pair',
      ok: holes.length === 0,
      holes,
      otherHoles: holes,
      detail: `Largest paired sum is ${widest}, limit is ${params.maxPairSum}.`
    })
  }
  return reports
}

export function formatDoubleCode(
  code: DoubleCode,
  params: DoubleLockParams
): string {
  return `${formatCode(code.a, params.rows[0].pins)} / ${formatCode(code.b, params.rows[1].pins)}`
}

export function parseDoubleCode(
  input: string,
  params: DoubleLockParams
): DoubleCode | null {
  const halves = input.split(/[/|,]/u)
  if (halves.length !== 2) return null
  const a = parseCode(halves[0], rowParamsFor(params, 0))
  const b = parseCode(halves[1], rowParamsFor(params, 1))
  return a && b ? { a, b } : null
}

export function toDoubleCsv(
  codes: readonly DoubleCode[],
  params: DoubleLockParams
): string {
  const rows: string[][] = [
    ['# rows', 'A,B'],
    ['# A pins', String(params.rows[0].pins)],
    ['# A chambers', String(params.rows[0].holes)],
    ['# A required pin', String(params.rows[0].requiredPin)],
    ['# A required chamber', String(params.rows[0].requiredHole)],
    ['# A forbidden pin', String(params.rows[0].forbiddenPin)],
    ['# A forbidden chamber', String(params.rows[0].forbiddenHole)],
    ['# B pins', String(params.rows[1].pins)],
    ['# B chambers', String(params.rows[1].holes)],
    ['# B required pin', String(params.rows[1].requiredPin)],
    ['# B required chamber', String(params.rows[1].requiredHole)],
    ['# B forbidden pin', String(params.rows[1].forbiddenPin)],
    ['# B forbidden chamber', String(params.rows[1].forbiddenHole)],
    ['# G identical run limit', String(params.maxRun)],
    ['# H neighbour step limit', String(params.maxStep)],
    ['# H paired sum limit', String(params.maxPairSum)],
    ['# I minimum difference', String(params.minDistance)],
    ['# J repeated-pair limit', String(params.maxPairGroups)],
    ['# K long pin floor', String(params.longPinFloor)],
    ['# L pin reuse limit', String(params.maxRepeat)],
    ['# single-depth codes', params.dropUniform ? 'dropped' : 'kept'],
    ['# staircase codes', params.dropLadder ? 'dropped' : 'kept'],
    [
      'index',
      'row A',
      'row B',
      ...Array.from(
        { length: params.rows[0].holes },
        (_, index) => `A hole ${index + 1}`
      ),
      ...Array.from(
        { length: params.rows[1].holes },
        (_, index) => `B hole ${index + 1}`
      )
    ]
  ]
  codes.forEach((code, index) => {
    rows.push([
      String(index + 1),
      formatCode(code.a, params.rows[0].pins),
      formatCode(code.b, params.rows[1].pins),
      ...code.a.map(String),
      ...code.b.map(String)
    ])
  })
  return rows.map((row) => row.join(',')).join('\r\n')
}

export function doubleCodeFileName(params: DoubleLockParams): string {
  const parts = [
    params.rows[0].pins,
    params.rows[0].holes,
    params.rows[1].pins,
    params.rows[1].holes,
    params.maxRun,
    params.maxStep,
    params.maxPairSum,
    params.minDistance,
    params.maxPairGroups,
    params.longPinFloor,
    params.maxRepeat
  ]
  return `lock-double-${parts.join('-')}.csv`
}
