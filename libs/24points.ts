/**
 * 24 Points Game
 * Author: Seven Yu
 * Version: 1.0.0
 * URL: https://phpz.xyz/24points/
 */

const RightValue = 24

// --------
// method A
// --------
const op = ['+', '-', '*', '/']

const check1 = (o1: number, o2: number) => {
  return '+-'.includes(op[o1]) && '*/'.includes(op[o2])
}

const check2 = (o1: number, o2: number, o3: number) => {
  const ops = [op[o1], op[o2], op[o3]]
  return !(
    ops.every((op) => '+-'.includes(op)) ||
    ops.every((op) => '*/'.includes(op)) ||
    (!check1(o1, o2) && '+-'.includes(op[o3]))
  )
}

const methodA = (...numbers: string[]) => {
  let input = numbers

  let calc = []
  let results = []
  for (let n1 = 0; n1 < 4; n1++) {
    for (let o1 = 0; o1 < 4; o1++) {
      for (let n2 = 0; n2 < 4; n2++) {
        if (n1 === n2) continue
        for (let o2 = 0; o2 < 4; o2++) {
          for (let n3 = 0; n3 < 4; n3++) {
            if (n1 === n3 || n2 === n3) continue
            for (let o3 = 0; o3 < 4; o3++) {
              for (let n4 = 0; n4 < 4; n4++) {
                if (n1 === n4 || n2 === n4 || n3 === n4) continue
                check2(o1, o2, o3) && calc.push('(')
                check1(o1, o2) && calc.push('(')
                calc.push(input[n1])
                calc.push(op[o1])
                calc.push(input[n2])
                check1(o1, o2) && calc.push(')')
                calc.push(op[o2])
                calc.push(input[n3])
                check2(o1, o2, o3) && calc.push(')')
                calc.push(op[o3])
                calc.push(input[n4])
                let eq = calc.join('')
                try {
                  let res = eval('(' + eq + ')')
                  if (res == RightValue) results.push(eq)
                } catch (e) {
                  // console.error(e);
                } finally {
                  calc = []
                }
              }
            }
          }
        }
      }
    }
  }

  return results
}

// --------
// method B
// --------

const methodB = (...numbers: string[]) => {
  const results = []
  for (let formula of formulas) {
    for (let op1 of ops) {
      for (let op2 of ops) {
        for (let op3 of ops) {
          for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
              if (j == i) continue
              for (let k = 0; k < 4; k++) {
                if (k == j || k == i) continue
                for (let l = 0; l < 4; l++) {
                  if (l == k || l == j || l == i) continue

                  let a = parseInt(numbers[i], 10),
                    b = parseInt(numbers[j], 10),
                    c = parseInt(numbers[k], 10),
                    d = parseInt(numbers[l], 10)
                  let result = formula(a, b, c, d, op1, op2, op3)
                  if (result === RightValue) {
                    if (formula.name === 'formula1')
                      results.push(
                        `((${a}${op1.alias}${b})${op2.alias}${c})${op3.alias}${d}`
                      )
                    else
                      results.push(
                        `(${a}${op1.alias}${b})${op2.alias}(${c}${op3.alias}${d})`
                      )
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return results
}

type NumberWithAlias = {
  op: (a: number, b: number) => number
  alias: string
}

const ops: NumberWithAlias[] = [
  {
    op: (a, b) => a + b,
    alias: '+'
  },
  {
    op: (a: number, b: number) => a - b,
    alias: '-'
  },
  {
    op: (a: number, b: number) => a * b,
    alias: '*'
  },
  {
    op: (a: number, b: number) => a / b,
    alias: '/'
  }
]

type FormulaType = {
  (
    a: number,
    b: number,
    c: number,
    d: number,
    op1: NumberWithAlias,
    op2: NumberWithAlias,
    op3: NumberWithAlias
  ): number
}

const formulas: FormulaType[] = [
  function formula1(a, b, c, d, op1, op2, op3) {
    return op3.op(op2.op(op1.op(a, b), c), d)
  },
  function formula2(a, b, c, d, op1, op2, op3) {
    return op2.op(op1.op(a, b), op3.op(c, d))
  }
]

const Solver = {
  methodA,
  methodB
}

export default Solver
