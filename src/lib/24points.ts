const TARGET = 24n

type Rational = {
  numerator: bigint
  denominator: bigint
}

type Term = {
  value: Rational
  expression: string
}

function greatestCommonDivisor(a: bigint, b: bigint): bigint {
  let left = a < 0n ? -a : a
  let right = b < 0n ? -b : b

  while (right !== 0n) {
    const remainder = left % right
    left = right
    right = remainder
  }

  return left
}

function rational(numerator: bigint, denominator = 1n): Rational {
  if (denominator === 0n) {
    throw new RangeError('Cannot divide by zero')
  }

  const sign = denominator < 0n ? -1n : 1n
  const divisor = greatestCommonDivisor(numerator, denominator)

  return {
    numerator: (numerator / divisor) * sign,
    denominator: (denominator / divisor) * sign
  }
}

function add(left: Rational, right: Rational): Rational {
  return rational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator
  )
}

function subtract(left: Rational, right: Rational): Rational {
  return rational(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator
  )
}

function multiply(left: Rational, right: Rational): Rational {
  return rational(
    left.numerator * right.numerator,
    left.denominator * right.denominator
  )
}

function divide(left: Rational, right: Rational): Rational {
  return rational(
    left.numerator * right.denominator,
    left.denominator * right.numerator
  )
}

function isZero(value: Rational): boolean {
  return value.numerator === 0n
}

function combine(left: Term, right: Term): Term[] {
  const [commutativeLeft, commutativeRight] =
    left.expression <= right.expression ? [left, right] : [right, left]

  const candidates: Term[] = [
    {
      value: add(left.value, right.value),
      expression: `(${commutativeLeft.expression}+${commutativeRight.expression})`
    },
    {
      value: multiply(left.value, right.value),
      expression: `(${commutativeLeft.expression}*${commutativeRight.expression})`
    },
    {
      value: subtract(left.value, right.value),
      expression: `(${left.expression}-${right.expression})`
    },
    {
      value: subtract(right.value, left.value),
      expression: `(${right.expression}-${left.expression})`
    }
  ]

  if (!isZero(right.value)) {
    candidates.push({
      value: divide(left.value, right.value),
      expression: `(${left.expression}/${right.expression})`
    })
  }

  if (!isZero(left.value)) {
    candidates.push({
      value: divide(right.value, left.value),
      expression: `(${right.expression}/${left.expression})`
    })
  }

  const unique = new Map<string, Term>()
  for (const candidate of candidates) {
    unique.set(candidate.expression, candidate)
  }
  return [...unique.values()]
}

function collectSolutions(
  terms: readonly Term[],
  solutions: Set<string>
): void {
  if (terms.length === 1) {
    const [{ value, expression }] = terms
    if (value.numerator === TARGET * value.denominator) {
      solutions.add(expression)
    }
    return
  }

  for (let leftIndex = 0; leftIndex < terms.length - 1; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < terms.length;
      rightIndex += 1
    ) {
      const remaining = terms.filter(
        (_, index) => index !== leftIndex && index !== rightIndex
      )

      for (const candidate of combine(terms[leftIndex], terms[rightIndex])) {
        collectSolutions([...remaining, candidate], solutions)
      }
    }
  }
}

/**
 * Finds every distinct fully-parenthesized expression that evaluates to 24.
 * Addition and multiplication operands are canonicalized to remove their
 * mirrored duplicates; subtraction and division keep both operand orders.
 */
export function solve24(numbers: readonly number[]): string[] {
  if (numbers.length !== 4) {
    throw new RangeError('Exactly four numbers are required')
  }

  for (const number of numbers) {
    if (!Number.isInteger(number)) {
      throw new TypeError('Every number must be an integer')
    }
    if (number < 1 || number > 13) {
      throw new RangeError('Every number must be between 1 and 13')
    }
  }

  const terms = numbers.map((number) => ({
    value: rational(BigInt(number)),
    expression: String(number)
  }))
  const solutions = new Set<string>()

  collectSolutions(terms, solutions)

  return [...solutions].sort()
}
