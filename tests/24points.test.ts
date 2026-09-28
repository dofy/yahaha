import assert from 'node:assert/strict'
import test from 'node:test'

import { solve24 } from '../src/lib/24points.ts'

type Fraction = readonly [numerator: bigint, denominator: bigint]

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a
  let y = b < 0n ? -b : b
  while (y !== 0n) {
    ;[x, y] = [y, x % y]
  }
  return x
}

function fraction(numerator: bigint, denominator = 1n): Fraction {
  assert.notEqual(denominator, 0n, 'an expression divided by zero')
  const direction = denominator < 0n ? -1n : 1n
  const factor = gcd(numerator, denominator)
  return [(numerator / factor) * direction, (denominator / factor) * direction]
}

function calculate(
  operator: string,
  left: Fraction,
  right: Fraction
): Fraction {
  const [a, b] = left
  const [c, d] = right
  switch (operator) {
    case '+':
      return fraction(a * d + c * b, b * d)
    case '-':
      return fraction(a * d - c * b, b * d)
    case '*':
      return fraction(a * c, b * d)
    case '/':
      return fraction(a * d, b * c)
    default:
      assert.fail(`unexpected operator: ${operator}`)
  }
}

function parseExpression(source: string): {
  value: Fraction
  leaves: number[]
} {
  let cursor = 0

  function parse(): { value: Fraction; leaves: number[] } {
    if (/\d/.test(source[cursor] ?? '')) {
      const start = cursor
      while (/\d/.test(source[cursor] ?? '')) cursor += 1
      const number = Number(source.slice(start, cursor))
      return { value: fraction(BigInt(number)), leaves: [number] }
    }

    assert.equal(
      source[cursor],
      '(',
      `expected opening parenthesis at ${cursor}`
    )
    cursor += 1
    const left = parse()
    const operator = source[cursor]
    assert.match(operator ?? '', /^[+\-*/]$/, `expected operator at ${cursor}`)
    cursor += 1
    const right = parse()
    assert.equal(
      source[cursor],
      ')',
      `expected closing parenthesis at ${cursor}`
    )
    cursor += 1

    return {
      value: calculate(operator, left.value, right.value),
      leaves: [...left.leaves, ...right.leaves]
    }
  }

  const result = parse()
  assert.equal(cursor, source.length, 'expression has trailing input')
  return result
}

function assertValidSolutions(
  numbers: readonly number[],
  solutions: readonly string[]
): void {
  assert.equal(
    new Set(solutions).size,
    solutions.length,
    'solutions must be unique'
  )
  assert.deepEqual(
    solutions,
    [...solutions].sort(),
    'solutions must be deterministic'
  )

  for (const expression of solutions) {
    const { value, leaves } = parseExpression(expression)
    assert.deepEqual(value, [24n, 1n], expression)
    assert.deepEqual(
      [...leaves].sort((a, b) => a - b),
      [...numbers].sort((a, b) => a - b),
      expression
    )
  }
}

test('solves cases that require exact division and repeated numbers', () => {
  for (const numbers of [
    [3, 3, 8, 8],
    [1, 5, 5, 5]
  ] as const) {
    const solutions = solve24(numbers)
    assert.ok(solutions.length > 0, `${numbers.join(',')} should be solvable`)
    assertValidSolutions(numbers, solutions)
  }
})

test('covers right-nested and split binary-tree shapes', () => {
  const rightNested = solve24([3, 3, 8, 8])
  assert.ok(rightNested.includes('(8/(3-(8/3)))'))
  assertValidSolutions([3, 3, 8, 8], rightNested)

  const split = solve24([1, 2, 3, 4])
  assert.ok(
    split.some((expression) => /^\(\(.+\)[+\-*/]\(.+\)\)$/.test(expression))
  )
  assertValidSolutions([1, 2, 3, 4], split)
})

test('distinguishes solvable and unsolvable inputs', () => {
  assert.deepEqual(solve24([1, 1, 1, 1]), [])

  const solutions = solve24([1, 2, 3, 4])
  assert.ok(solutions.length > 0)
  assertValidSolutions([1, 2, 3, 4], solutions)
})

test('returns the same canonical result set for input permutations', () => {
  assert.deepEqual(solve24([3, 8, 3, 8]), solve24([8, 3, 8, 3]))
})

test('validates the input contract', () => {
  assert.throws(() => solve24([1, 2, 3]), RangeError)
  assert.throws(() => solve24([1, 2, 3, 4, 5]), RangeError)
  assert.throws(() => solve24([1, 2, 3.5, 4]), TypeError)
  assert.throws(() => solve24([1, 2, Number.NaN, 4]), TypeError)
  assert.throws(() => solve24([0, 1, 2, 3]), RangeError)
  assert.throws(() => solve24([1, 2, 3, 14]), RangeError)
})

const OPERATORS = ['+', '-', '*', '/'] as const

function oracleOperation(
  operator: (typeof OPERATORS)[number],
  left: Fraction | undefined,
  right: Fraction | undefined
): Fraction | undefined {
  if (!left || !right || (operator === '/' && right[0] === 0n)) return undefined
  return calculate(operator, left, right)
}

function permutations(values: readonly number[]): number[][] {
  const results: number[][] = []
  function visit(prefix: number[], remaining: number[]): void {
    if (remaining.length === 0) {
      results.push(prefix)
      return
    }
    const used = new Set<number>()
    for (let index = 0; index < remaining.length; index += 1) {
      if (used.has(remaining[index])) continue
      used.add(remaining[index])
      visit(
        [...prefix, remaining[index]],
        remaining.filter((_, candidateIndex) => candidateIndex !== index)
      )
    }
  }
  visit([], [...values])
  return results
}

function oracleCanMake24(numbers: readonly number[]): boolean {
  for (const [a, b, c, d] of permutations(numbers)) {
    const values = [a, b, c, d].map((number) => fraction(BigInt(number)))
    for (const first of OPERATORS) {
      for (const second of OPERATORS) {
        for (const third of OPERATORS) {
          const [w, x, y, z] = values
          const candidates = [
            oracleOperation(
              third,
              oracleOperation(second, oracleOperation(first, w, x), y),
              z
            ),
            oracleOperation(
              third,
              oracleOperation(first, w, oracleOperation(second, x, y)),
              z
            ),
            oracleOperation(
              first,
              w,
              oracleOperation(third, oracleOperation(second, x, y), z)
            ),
            oracleOperation(
              first,
              w,
              oracleOperation(second, x, oracleOperation(third, y, z))
            ),
            oracleOperation(
              second,
              oracleOperation(first, w, x),
              oracleOperation(third, y, z)
            )
          ]
          if (
            candidates.some(
              (value) => value !== undefined && value[0] === 24n * value[1]
            )
          ) {
            return true
          }
        }
      }
    }
  }
  return false
}

test('matches an independent five-shape oracle for all 1..13 multisets', () => {
  let count = 0
  for (let a = 1; a <= 13; a += 1) {
    for (let b = a; b <= 13; b += 1) {
      for (let c = b; c <= 13; c += 1) {
        for (let d = c; d <= 13; d += 1) {
          const numbers = [a, b, c, d]
          const solutions = solve24(numbers)
          assert.equal(
            solutions.length > 0,
            oracleCanMake24(numbers),
            `oracle disagreement for ${numbers.join(',')}`
          )
          assertValidSolutions(numbers, solutions)
          count += 1
        }
      }
    }
  }
  assert.equal(count, 1820)
})
