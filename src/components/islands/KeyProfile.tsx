import { formatCode, type DoubleCode, type DoubleLockParams } from '@/lib/lock'

/**
 * Side view of a pin tumbler key. Chamber 1 sits next to the bow (the inner
 * chamber) and the last chamber sits at the tip, matching the code order used
 * by the solver. A larger pin number is a longer bottom pin, so it is drawn as
 * a deeper cut.
 *
 * A double-row lock is drawn as two blades on one chamber grid, with the paired
 * depths added up in the strip between them.
 */

const SPACING = 46
const BODY_HEIGHT = 68
const CUT_CEILING = 6
const CUT_FLOOR = 52
const CUT_HALF_WIDTH = 16
const BOW_WIDTH = 72
const BLADE_START = BOW_WIDTH + 18
/** Space above a blade for the step labels and the C/D markers. */
const BLADE_HEADROOM = 58
const PIN_ROW = BODY_HEIGHT + 26
const HOLE_ROW = BODY_HEIGHT + 44
/** Full vertical space one blade takes, headroom and label rows included. */
const BLADE_UNIT = BLADE_HEADROOM + HOLE_ROW + 10

const chamberX = (hole: number) => BLADE_START + 24 + (hole - 1) * SPACING
const tipOf = (holes: number) => chamberX(holes) + 26
const widthOf = (holes: number) => tipOf(holes) + 34

type RowMarks = {
  pins: number
  holes: number
  code: number[] | null
  requiredPin: number
  requiredHole: number
  forbiddenPin: number
  forbiddenHole: number
  longPinFloor: number
  maxStep: number
}

function KeyBlade({
  oy,
  marks,
  highlight,
  rowLabel
}: {
  /** y of the blade's cut edge. */
  oy: number
  marks: RowMarks
  highlight: Set<number>
  rowLabel?: string
}) {
  const {
    pins,
    holes,
    code,
    requiredPin,
    requiredHole,
    forbiddenPin,
    forbiddenHole,
    longPinFloor,
    maxStep
  } = marks
  const tipX = tipOf(holes)
  const bottom = oy + BODY_HEIGHT
  const depthOf = (pin: number) =>
    pins < 2
      ? CUT_CEILING
      : CUT_CEILING + ((pin - 1) / (pins - 1)) * (CUT_FLOOR - CUT_CEILING)

  const outline: string[] = [`M ${BLADE_START} ${oy}`]
  for (let hole = 1; hole <= holes; hole += 1) {
    const x = chamberX(hole)
    const pin = code?.[hole - 1]
    if (pin === undefined) {
      outline.push(`L ${x + CUT_HALF_WIDTH} ${oy}`)
      continue
    }
    outline.push(
      `L ${x - CUT_HALF_WIDTH} ${oy}`,
      `L ${x} ${oy + depthOf(pin)}`,
      `L ${x + CUT_HALF_WIDTH} ${oy}`
    )
  }
  outline.push(
    `L ${tipX} ${oy}`,
    `L ${tipX + 18} ${oy + 20}`,
    `L ${tipX + 18} ${bottom}`,
    `L ${BLADE_START} ${bottom}`,
    'Z'
  )

  return (
    <g>
      {[...highlight].map((hole) => (
        <rect
          key={`band-${hole}`}
          x={chamberX(hole) - SPACING / 2}
          y={oy - 26}
          width={SPACING}
          height={HOLE_ROW + 32}
          rx={10}
          fill='var(--color-coral-wash)'
        />
      ))}

      {/* Bow */}
      <rect
        x={6}
        y={oy - 18}
        width={BOW_WIDTH}
        height={BODY_HEIGHT + 36}
        rx={20}
        fill='var(--color-blue-wash)'
        stroke='var(--color-line)'
      />
      <circle
        cx={6 + BOW_WIDTH / 2}
        cy={oy + BODY_HEIGHT / 2}
        r={13}
        fill='var(--color-background)'
        stroke='var(--color-line)'
      />
      {rowLabel && (
        <text
          x={6 + BOW_WIDTH / 2}
          y={oy - 26}
          textAnchor='middle'
          fontSize='13'
          fontWeight='700'
          fill='var(--color-blue-ink)'
        >
          {rowLabel}
        </text>
      )}

      {/* Blade with the cut profile on its top edge */}
      <path
        d={outline.join(' ')}
        fill='var(--color-blue-wash)'
        stroke='var(--color-line)'
        strokeLinejoin='round'
      />

      {/* K — at least one cut must reach below this line */}
      {longPinFloor > 0 && longPinFloor < pins && (
        <g>
          <line
            x1={BLADE_START}
            x2={tipX + 18}
            y1={oy + depthOf(longPinFloor)}
            y2={oy + depthOf(longPinFloor)}
            stroke='var(--color-accent-text)'
            strokeDasharray='6 5'
          />
          <text
            x={BLADE_START - 6}
            y={oy + depthOf(longPinFloor) + 4}
            textAnchor='end'
            fontSize='12'
            fontWeight='700'
            fill='var(--color-accent-text)'
          >
            K
          </text>
        </g>
      )}

      <text
        x={6}
        y={oy + PIN_ROW + 4}
        fontSize='11'
        fill='var(--color-muted-foreground)'
      >
        pin
      </text>
      <text
        x={6}
        y={oy + HOLE_ROW + 4}
        fontSize='11'
        fill='var(--color-muted-foreground)'
      >
        hole
      </text>

      {Array.from({ length: holes }, (_, index) => index + 1).map((hole) => {
        const x = chamberX(hole)
        const pin = code?.[hole - 1]
        const marked = highlight.has(hole)
        const isRequired = requiredHole === hole && requiredPin > 0
        const isForbidden = forbiddenHole === hole && forbiddenPin > 0
        return (
          <g key={`chamber-${hole}`}>
            <line
              x1={x}
              x2={x}
              y1={oy + (pin === undefined ? 0 : depthOf(pin))}
              y2={bottom + 10}
              stroke={marked ? 'var(--color-accent)' : 'var(--color-line)'}
              strokeDasharray='3 4'
            />
            {pin !== undefined && (
              <circle
                cx={x}
                cy={oy + depthOf(pin)}
                r={3.5}
                fill={marked ? 'var(--color-accent)' : 'var(--color-blue-ink)'}
              />
            )}
            <text
              x={x}
              y={oy + PIN_ROW + 4}
              textAnchor='middle'
              fontSize='15'
              fontFamily='var(--font-mono)'
              fontWeight={marked ? '700' : '500'}
              fill={marked ? 'var(--color-accent-text)' : 'currentColor'}
            >
              {pin ?? '·'}
            </text>
            <text
              x={x}
              y={oy + HOLE_ROW + 4}
              textAnchor='middle'
              fontSize='11'
              fill='var(--color-muted-foreground)'
            >
              {hole}
            </text>
            {isRequired && (
              <text
                x={x}
                y={oy - 28}
                textAnchor='middle'
                fontSize='12'
                fontWeight='700'
                fill='var(--color-accent-text)'
              >
                C={requiredPin}
              </text>
            )}
            {isForbidden && (
              <text
                x={x}
                y={isRequired ? oy - 44 : oy - 28}
                textAnchor='middle'
                fontSize='12'
                fontWeight='700'
                fill='var(--color-blue-ink)'
              >
                D≠{forbiddenPin}
              </text>
            )}
          </g>
        )
      })}

      {/* H — the step between neighbouring chambers */}
      {code &&
        maxStep > 0 &&
        code.slice(1).map((pin, index) => {
          const step = Math.abs(pin - code[index])
          const x = (chamberX(index + 1) + chamberX(index + 2)) / 2
          return (
            <text
              key={`step-${index}`}
              x={x}
              y={oy - 12}
              textAnchor='middle'
              fontSize='11'
              fontFamily='var(--font-mono)'
              fill={
                step >= maxStep
                  ? 'var(--color-accent-text)'
                  : 'var(--color-muted-foreground)'
              }
            >
              {step}
            </text>
          )
        })}
    </g>
  )
}

function Legend({ text, y }: { text: string; y: number }) {
  return (
    <text x={6} y={y} fontSize='11' fill='var(--color-muted-foreground)'>
      {text}
    </text>
  )
}

export type KeyProfileProps = RowMarks & {
  /** Chambers to call out, 1-based. */
  highlight?: readonly number[]
  highlightLabel?: string
  /** Fixed render width, for previews that must fit a small surface. */
  displayWidth?: number
}

export default function KeyProfile({
  highlight = [],
  highlightLabel,
  displayWidth,
  ...marks
}: KeyProfileProps) {
  const width = widthOf(marks.holes)
  const height = BLADE_UNIT + 16
  const description = marks.code
    ? `Key profile for bitting ${formatCode(marks.code, marks.pins)}, chamber 1 at the bow.`
    : `Key profile with ${marks.holes} empty chambers and ${marks.pins} pin depths.`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className='h-auto w-full'
      role='img'
      aria-label={description}
      style={
        displayWidth
          ? { width: `${displayWidth}px`, minWidth: 0, maxWidth: '100%' }
          : {
              minWidth: `${Math.min(width, 560)}px`,
              maxWidth: `${Math.max(width, 680)}px`
            }
      }
    >
      <KeyBlade
        oy={BLADE_HEADROOM}
        marks={marks}
        highlight={new Set(highlight)}
      />
      <Legend
        y={height - 6}
        text={
          highlightLabel ??
          'Chamber 1 is innermost; a deeper cut is a longer pin.'
        }
      />
    </svg>
  )
}

export type KeyProfilePairProps = {
  params: DoubleLockParams
  code: DoubleCode | null
  /** Chambers to call out per row, 1-based. */
  highlight?: { a?: readonly number[]; b?: readonly number[] }
  highlightLabel?: string
  /** Fixed render width, for previews that must fit a small surface. */
  displayWidth?: number
}

export function KeyProfilePair({
  params,
  code,
  highlight,
  highlightLabel,
  displayWidth
}: KeyProfilePairProps) {
  const rows = params.rows
  const width = Math.max(widthOf(rows[0].holes), widthOf(rows[1].holes))
  // Two blades stacked would be very tall at full width, so the paired layout
  // uses tighter headroom and a capped display width.
  const firstOy = 44
  const sumRow = firstOy + HOLE_ROW + 22
  const secondOy = sumRow + 44
  const height = secondOy + HOLE_ROW + 24
  const paired = Math.min(rows[0].holes, rows[1].holes)
  const marksFor = (index: 0 | 1): RowMarks => ({
    pins: rows[index].pins,
    holes: rows[index].holes,
    code: (index === 0 ? code?.a : code?.b) ?? null,
    requiredPin: rows[index].requiredPin,
    requiredHole: rows[index].requiredHole,
    forbiddenPin: rows[index].forbiddenPin,
    forbiddenHole: rows[index].forbiddenHole,
    longPinFloor: params.longPinFloor,
    maxStep: params.maxStep
  })
  const description = code
    ? `Double-row key profile for row A ${formatCode(code.a, rows[0].pins)} and row B ${formatCode(code.b, rows[1].pins)}.`
    : `Double-row key profile with ${rows[0].holes} and ${rows[1].holes} empty chambers.`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className='h-auto w-full'
      role='img'
      aria-label={description}
      style={
        displayWidth
          ? { width: `${displayWidth}px`, minWidth: 0, maxWidth: '100%' }
          : {
              minWidth: `${Math.min(width, 520)}px`,
              maxWidth: `${Math.max(width, 620)}px`
            }
      }
    >
      <KeyBlade
        oy={firstOy}
        marks={marksFor(0)}
        highlight={new Set(highlight?.a ?? [])}
        rowLabel='row A'
      />

      {/* H′ — the two rows of one chamber added up */}
      <text
        x={6}
        y={sumRow + 4}
        fontSize='11'
        fill='var(--color-muted-foreground)'
      >
        sum
      </text>
      {code &&
        Array.from({ length: paired }, (_, index) => index + 1).map((hole) => {
          const sum = code.a[hole - 1] + code.b[hole - 1]
          const over = params.maxPairSum > 0 && sum >= params.maxPairSum
          return (
            <text
              key={`sum-${hole}`}
              x={chamberX(hole)}
              y={sumRow + 4}
              textAnchor='middle'
              fontSize='13'
              fontFamily='var(--font-mono)'
              fontWeight={over ? '700' : '500'}
              fill={over ? 'var(--color-accent-text)' : 'var(--color-blue-ink)'}
            >
              {sum}
            </text>
          )
        })}

      <KeyBlade
        oy={secondOy}
        marks={marksFor(1)}
        highlight={new Set(highlight?.b ?? [])}
        rowLabel='row B'
      />
      <Legend
        y={height - 6}
        text={
          highlightLabel ??
          `Rows sit side by side; sum adds both depths of one chamber${
            params.maxPairSum > 0 ? ` (< ${params.maxPairSum})` : ''
          }.`
        }
      />
    </svg>
  )
}
