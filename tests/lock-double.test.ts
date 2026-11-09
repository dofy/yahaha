import assert from 'node:assert/strict'
import test from 'node:test'
import {
  defaultDoubleParams,
  doubleCodeFileName,
  explainDoubleCode,
  formatDoubleCode,
  pairedHoles,
  parseDoubleCode,
  rowParamsFor,
  solveDoubleLock,
  solveLock,
  toDoubleCsv,
  validateDoubleParams,
  type DoubleLockParams
} from '../src/lib/lock.ts'

const base: DoubleLockParams = {
  ...defaultDoubleParams,
  rows: [
    {
      pins: 3,
      holes: 3,
      requiredPin: 0,
      requiredHole: 0,
      forbiddenPin: 0,
      forbiddenHole: 0
    },
    {
      pins: 3,
      holes: 3,
      requiredPin: 0,
      requiredHole: 0,
      forbiddenPin: 0,
      forbiddenHole: 0
    }
  ],
  maxRun: 0,
  maxStep: 0,
  maxPairSum: 0,
  minDistance: 0,
  maxPairGroups: 0,
  longPinFloor: 0,
  maxRepeat: 0,
  dropUniform: false,
  dropLadder: false
}

/** Independent reference: pair every surviving row code and filter by hand. */
function reference(params: DoubleLockParams): string[] {
  const left = solveLock(rowParamsFor(params, 0)).codes
  const right = solveLock(rowParamsFor(params, 1)).codes
  const paired = pairedHoles(params)
  const kept: string[] = []
  const admitted: number[][] = []
  for (const a of left) {
    for (const b of right) {
      if (params.maxPairSum > 0) {
        let blocked = false
        for (let hole = 0; hole < paired; hole += 1) {
          if (a[hole] + b[hole] >= params.maxPairSum) blocked = true
        }
        if (blocked) continue
      }
      const joined = [...a, ...b]
      if (params.minDistance > 0) {
        const close = admitted.some(
          (other) =>
            joined.reduce(
              (sum, pin, index) => sum + (pin === other[index] ? 0 : 1),
              0
            ) <= params.minDistance
        )
        if (close) continue
      }
      admitted.push(joined)
      kept.push(`${a.join('')}/${b.join('')}`)
    }
  }
  return kept
}

function expectMatchesReference(params: DoubleLockParams) {
  assert.deepEqual(
    solveDoubleLock(params).codes.map(
      (code) => `${code.a.join('')}/${code.b.join('')}`
    ),
    reference(params),
    `mismatch for ${JSON.stringify(params)}`
  )
}

test('pairs both rows in row A then row B order', () => {
  const result = solveDoubleLock(base)
  assert.equal(result.total, 729n)
  assert.deepEqual(result.rowCounts, [27, 27])
  assert.equal(result.codes.length, 729)
  assert.deepEqual(result.codes[0], { a: [1, 1, 1], b: [1, 1, 1] })
  assert.deepEqual(result.codes[1], { a: [1, 1, 1], b: [1, 1, 2] })
  assert.deepEqual(result.codes.at(-1), { a: [3, 3, 3], b: [3, 3, 3] })
})

test('the paired sum rule rejects chambers that add up to H or more', () => {
  const params = { ...base, maxPairSum: 5 }
  const result = solveDoubleLock(params)
  assert.ok(result.codes.length > 0)
  for (const code of result.codes) {
    for (let hole = 0; hole < 3; hole += 1) {
      assert.ok(
        code.a[hole] + code.b[hole] < 5,
        `${code.a.join('')}/${code.b.join('')} chamber ${hole + 1}`
      )
    }
  }
  expectMatchesReference(params)
})

test('rows keep their own depth, chamber and chamber rules', () => {
  const params: DoubleLockParams = {
    ...base,
    rows: [
      { ...base.rows[0], pins: 4, holes: 4, requiredPin: 4, requiredHole: 2 },
      { ...base.rows[1], pins: 3, holes: 3, forbiddenPin: 1, forbiddenHole: 3 }
    ],
    maxPairSum: 6
  }
  const result = solveDoubleLock(params)
  assert.ok(result.codes.length > 0)
  for (const code of result.codes) {
    assert.equal(code.a.length, 4)
    assert.equal(code.b.length, 3)
    assert.equal(code.a[1], 4)
    assert.notEqual(code.b[2], 1)
    assert.ok(Math.max(...code.a) <= 4)
    assert.ok(Math.max(...code.b) <= 3)
    // Only the chambers present in both rows are paired.
    for (let hole = 0; hole < 3; hole += 1) {
      assert.ok(code.a[hole] + code.b[hole] < 6)
    }
  }
  expectMatchesReference(params)
})

test('shared shape rules apply to each row separately', () => {
  const variants: Partial<DoubleLockParams>[] = [
    { maxRun: 2 },
    { maxPairGroups: 1 },
    { longPinFloor: 2 },
    { maxRepeat: 2 },
    { maxStep: 2 },
    { dropUniform: true },
    { maxRun: 3, maxPairSum: 5, longPinFloor: 2, dropUniform: true }
  ]
  for (const variant of variants) {
    const params = { ...base, ...variant }
    expectMatchesReference(params)
    for (const code of solveDoubleLock(params).codes) {
      for (const row of [code.a, code.b]) {
        if (params.maxRun) {
          let run = 1
          for (let i = 1; i < row.length; i += 1) {
            run = row[i] === row[i - 1] ? run + 1 : 1
            assert.ok(run < params.maxRun)
          }
        }
        if (params.longPinFloor) {
          assert.ok(Math.max(...row) > params.longPinFloor)
        }
        if (params.dropUniform) {
          assert.ok(!row.every((pin) => pin === row[0]))
        }
      }
    }
  }
})

test('rule I compares the two rows joined into one code', () => {
  const params = { ...base, minDistance: 1, maxPairSum: 5 }
  const result = solveDoubleLock(params)
  const joined = result.codes.map((code) => [...code.a, ...code.b])
  for (const [index, code] of joined.entries()) {
    for (const other of joined.slice(index + 1)) {
      const distance = code.reduce(
        (sum, pin, position) => sum + (pin === other[position] ? 0 : 1),
        0
      )
      assert.ok(distance > 1, `${code.join('')} vs ${other.join('')}`)
    }
  }
  assert.ok(result.nearDuplicates > 0)
  expectMatchesReference(params)
})

test('stops on the result limit and on the node budget', () => {
  const limited = solveDoubleLock(base, { limit: 5 })
  assert.equal(limited.codes.length, 5)
  assert.equal(limited.truncated, 'limit')

  const budgeted = solveDoubleLock(base, { nodeBudget: 60 })
  assert.equal(budgeted.truncated, 'budget')

  const rows = solveDoubleLock(base, { rowLimit: 4 })
  assert.equal(rows.truncated, 'rows')
  assert.deepEqual(rows.rowCounts, [4, 4])
  assert.equal(rows.codes.length, 16)
})

test('the documented double-row example stays solvable', () => {
  const result = solveDoubleLock(defaultDoubleParams)
  assert.equal(result.total, (4n ** 6n) * 3n ** 6n)
  assert.ok(result.codes.length > 0)
  for (const code of result.codes) {
    assert.ok(
      explainDoubleCode(defaultDoubleParams, code).every((report) => report.ok),
      `${formatDoubleCode(code, defaultDoubleParams)} fails its own rules`
    )
  }
})

test('explainDoubleCode tags each report with its row', () => {
  const params = { ...defaultDoubleParams, maxPairSum: 5 }
  const reports = explainDoubleCode(params, {
    a: [1, 2, 3, 4, 3, 2],
    b: [3, 2, 1, 2, 3, 2]
  })
  const pair = reports.find((report) => report.rule === 'pairSum')!
  assert.equal(pair.row, 'pair')
  assert.equal(pair.ok, false)
  assert.deepEqual(pair.holes, [4, 5])
  assert.equal(pair.detail, 'Largest paired sum is 6, limit is 5.')
  assert.ok(reports.some((report) => report.row === 'a'))
  assert.ok(reports.some((report) => report.row === 'b'))
})

test('formats, parses and exports paired codes', () => {
  const code = { a: [1, 2, 3], b: [3, 2, 1] }
  assert.equal(formatDoubleCode(code, base), '123 / 321')
  assert.deepEqual(parseDoubleCode('123/321', base), code)
  assert.deepEqual(parseDoubleCode('123 / 321', base), code)
  assert.equal(parseDoubleCode('123', base), null)
  assert.equal(parseDoubleCode('123/3214', base), null)

  const csv = toDoubleCsv([code], base)
  assert.ok(csv.startsWith('# rows,"A,B"\r\n') || csv.startsWith('# rows,A,B\r\n'))
  assert.ok(
    csv.includes(
      'index,row A,row B,A hole 1,A hole 2,A hole 3,B hole 1,B hole 2,B hole 3'
    )
  )
  assert.ok(csv.endsWith('1,123,321,1,2,3,3,2,1'))
  assert.equal(doubleCodeFileName(base), 'lock-double-3-3-3-3-0-0-0-0-0-0-0.csv')
})

test('rejects impossible double-row parameters', () => {
  assert.deepEqual(validateDoubleParams(base), [])
  assert.deepEqual(validateDoubleParams({ ...base, maxPairSum: 2 }), [
    {
      field: 'maxPairSum',
      message: 'The smallest pair adds up to 2, so use 3 or more.'
    }
  ])
  assert.deepEqual(validateDoubleParams({ ...base, minDistance: 6 }), [
    {
      field: 'minDistance',
      message: 'I must stay below the joined code length.'
    }
  ])
  assert.deepEqual(
    validateDoubleParams({
      ...base,
      rows: [{ ...base.rows[0], pins: 1 }, base.rows[1]]
    }),
    [{ field: 'a.pins', message: 'Use 2 to 20 pin depths.' }]
  )
  assert.deepEqual(
    validateDoubleParams({
      ...base,
      rows: [base.rows[0], { ...base.rows[1], requiredHole: 9 }]
    }),
    [
      { field: 'b.requiredHole', message: 'E cannot exceed B.' },
      { field: 'b.requiredPin', message: 'Set C to use chamber E.' }
    ]
  )
  assert.throws(() => solveDoubleLock({ ...base, maxPairSum: 1 }), RangeError)
})
