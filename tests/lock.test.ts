import assert from 'node:assert/strict'
import test from 'node:test'
import {
  defaultParams,
  explainCode,
  formatCode,
  parseCode,
  solveLock,
  toCsv,
  validateParams,
  type LockParams
} from '../src/lib/lock.ts'

const base: LockParams = {
  ...defaultParams,
  pins: 4,
  holes: 4,
  maxRun: 0,
  maxStep: 0,
  minDistance: 0,
  maxPairGroups: 0,
  longPinFloor: 0,
  maxRepeat: 0,
  dropUniform: false,
  dropLadder: false
}

/** Independent reference: enumerate everything, then filter with plain checks. */
function reference(params: LockParams): number[][] {
  const { pins, holes } = params
  const codes: number[][] = []
  const total = pins ** holes
  for (let index = 0; index < total; index += 1) {
    const code: number[] = []
    let rest = index
    for (let position = 0; position < holes; position += 1) {
      code.unshift((rest % pins) + 1)
      rest = Math.floor(rest / pins)
    }
    codes.push(code)
  }
  return codes.filter((code) => {
    if (params.dropUniform && code.every((pin) => pin === code[0])) return false
    if (params.dropLadder) {
      const step = code[1] - code[0]
      if (
        Math.abs(step) === 1 &&
        code.every((pin, i) => i === 0 || pin - code[i - 1] === step)
      ) {
        return false
      }
    }
    if (params.requiredPin > 0) {
      if (params.requiredHole > 0) {
        if (code[params.requiredHole - 1] !== params.requiredPin) return false
      } else if (!code.includes(params.requiredPin)) {
        return false
      }
    }
    if (params.forbiddenPin > 0) {
      if (params.forbiddenHole > 0) {
        if (code[params.forbiddenHole - 1] === params.forbiddenPin) return false
      } else if (code.includes(params.forbiddenPin)) {
        return false
      }
    }
    let run = 1
    let longest = 1
    let groups = 0
    for (let i = 1; i <= code.length; i += 1) {
      if (i < code.length && code[i] === code[i - 1]) {
        run += 1
        longest = Math.max(longest, run)
        continue
      }
      if (run >= 2) groups += 1
      run = 1
    }
    if (params.maxRun > 0 && longest >= params.maxRun) return false
    if (params.maxPairGroups > 0 && groups >= params.maxPairGroups) return false
    if (params.maxStep > 0) {
      for (let i = 1; i < code.length; i += 1) {
        if (Math.abs(code[i] - code[i - 1]) >= params.maxStep) return false
      }
    }
    if (params.longPinFloor > 0 && Math.max(...code) <= params.longPinFloor) {
      return false
    }
    if (params.maxRepeat > 0) {
      const counts = new Map<number, number>()
      for (const pin of code) counts.set(pin, (counts.get(pin) ?? 0) + 1)
      for (const count of counts.values()) {
        if (count >= params.maxRepeat) return false
      }
    }
    return true
  })
}

function expectMatchesReference(params: LockParams) {
  const expected = reference(params)
  const actual = solveLock(params).codes
  assert.deepEqual(
    actual.map((code) => code.join('')),
    expected.map((code) => code.join('')),
    `mismatch for ${JSON.stringify(params)}`
  )
}

test('enumerates the full code space in ascending order', () => {
  const result = solveLock(base)
  assert.equal(result.total, 256n)
  assert.equal(result.codes.length, 256)
  assert.deepEqual(result.codes[0], [1, 1, 1, 1])
  assert.deepEqual(result.codes.at(-1), [4, 4, 4, 4])
})

test('each rule matches a brute-force reference', () => {
  const variants: Partial<LockParams>[] = [
    { maxRun: 2 },
    { maxRun: 3 },
    { maxStep: 2 },
    { maxStep: 3 },
    { maxPairGroups: 1 },
    { maxPairGroups: 2 },
    { longPinFloor: 2 },
    { longPinFloor: 3 },
    { maxRepeat: 2 },
    { maxRepeat: 3 },
    { requiredPin: 2 },
    { requiredPin: 2, requiredHole: 3 },
    { forbiddenPin: 3 },
    { forbiddenPin: 3, forbiddenHole: 1 },
    { dropUniform: true },
    { dropLadder: true },
    { dropUniform: true, dropLadder: true },
    {
      maxRun: 3,
      maxStep: 3,
      maxPairGroups: 2,
      longPinFloor: 2,
      maxRepeat: 3,
      requiredPin: 4,
      forbiddenPin: 1,
      forbiddenHole: 4,
      dropUniform: true,
      dropLadder: true
    }
  ]
  for (const variant of variants) {
    expectMatchesReference({ ...base, ...variant })
  }
})

test('matches the reference on an uneven pin and chamber count', () => {
  expectMatchesReference({
    ...base,
    pins: 5,
    holes: 3,
    maxRun: 2,
    maxStep: 4,
    longPinFloor: 2
  })
  expectMatchesReference({
    ...base,
    pins: 3,
    holes: 5,
    maxPairGroups: 2,
    maxRepeat: 3
  })
})

test('rule I keeps the smallest code of every near-identical cluster', () => {
  const params = { ...base, pins: 3, holes: 3, minDistance: 1 }
  const result = solveLock(params)
  for (const [index, code] of result.codes.entries()) {
    for (const other of result.codes.slice(index + 1)) {
      const distance = code.reduce(
        (sum, pin, position) => sum + (pin === other[position] ? 0 : 1),
        0
      )
      assert.ok(
        distance > params.minDistance,
        `${code.join('')} and ${other.join('')} differ in ${distance} chambers`
      )
    }
  }
  assert.deepEqual(result.codes[0], [1, 1, 1])
  assert.ok(result.nearDuplicates > 0)
  assert.equal(
    result.codes.length + result.nearDuplicates,
    solveLock({ ...params, minDistance: 0 }).codes.length
  )
})

test('rule I with distance 2 leaves no pair closer than 3', () => {
  const params = { ...base, pins: 4, holes: 4, minDistance: 2 }
  const result = solveLock(params)
  for (const [index, code] of result.codes.entries()) {
    for (const other of result.codes.slice(index + 1)) {
      const distance = code.reduce(
        (sum, pin, position) => sum + (pin === other[position] ? 0 : 1),
        0
      )
      assert.ok(distance > 2, `${code.join('')} vs ${other.join('')}`)
    }
  }
})

test('K cannot be satisfied when it covers every pin depth', () => {
  const result = solveLock({ ...base, longPinFloor: 4 })
  assert.deepEqual(result.codes, [])
  assert.equal(result.visited, 0)
})

test('stops on the result limit and on the node budget', () => {
  const limited = solveLock(base, { limit: 10 })
  assert.equal(limited.codes.length, 10)
  assert.equal(limited.truncated, 'limit')

  const budgeted = solveLock(base, { nodeBudget: 20 })
  assert.equal(budgeted.truncated, 'budget')
  assert.ok(budgeted.visited <= 21)
})

test('the default parameters stay solvable and respect every rule', () => {
  const result = solveLock(defaultParams)
  assert.equal(result.total, 46_656n)
  assert.ok(result.codes.length > 0)
  assert.equal(result.truncated, null)
  for (const code of result.codes) {
    assert.ok(
      explainCode(defaultParams, code).every((report) => report.ok),
      `${code.join('')} fails its own rules`
    )
  }
})

test('explainCode points at the chambers that break a rule', () => {
  const params = { ...defaultParams, pins: 6, holes: 6 }
  const reports = explainCode(params, [1, 1, 1, 2, 3, 4])
  const run = reports.find((report) => report.rule === 'run')!
  assert.equal(run.ok, false)
  assert.deepEqual(run.holes, [1, 2, 3])
  const long = reports.find((report) => report.rule === 'long')!
  assert.equal(long.ok, true)
  assert.deepEqual(long.holes, [6])

  const step = explainCode(params, [1, 6, 2, 3, 4, 5]).find(
    (report) => report.rule === 'step'
  )!
  assert.equal(step.ok, false)
  assert.deepEqual(step.holes, [1, 2])
  assert.equal(step.detail, 'Widest neighbour step is 5, limit is 5.')
})

test('formats, parses and exports codes', () => {
  assert.equal(formatCode([1, 2, 3], 6), '123')
  assert.equal(formatCode([1, 12, 3], 12), '1-12-3')
  assert.deepEqual(parseCode('1234', base), [1, 2, 3, 4])
  assert.deepEqual(parseCode('1-2-3-4', base), [1, 2, 3, 4])
  assert.equal(parseCode('123', base), null)
  assert.equal(parseCode('1259', base), null)

  const csv = toCsv([[1, 2, 3, 4]], base)
  assert.ok(csv.startsWith('# A pins,4\r\n'))
  assert.ok(csv.includes('index,code,hole 1,hole 2,hole 3,hole 4'))
  assert.ok(csv.endsWith('1,1234,1,2,3,4'))
})

test('rejects impossible parameter combinations', () => {
  assert.deepEqual(validateParams(base), [])
  assert.deepEqual(validateParams({ ...base, pins: 1 }), [
    { field: 'pins', message: 'Use 2 to 20 pin depths.' }
  ])
  assert.deepEqual(validateParams({ ...base, requiredHole: 2 }), [
    { field: 'requiredPin', message: 'Set C to use chamber E.' }
  ])
  assert.deepEqual(validateParams({ ...base, minDistance: 4 }), [
    {
      field: 'minDistance',
      message: 'I must stay below B, or every code collides.'
    }
  ])
  assert.throws(() => solveLock({ ...base, pins: 0 }), RangeError)
})
