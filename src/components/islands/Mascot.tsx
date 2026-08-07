// yahaha's own pixel adventurer — wide-brim explorer, neckerchief, and a
// compass held at the waist (a nod to "the answer exists only in the Tao":
// a wayfinder, not a map-reader). Hand-authored dot grid.
// NOT based on any existing comic character — only the retro ligne-claire
// *spirit* is borrowed, never a real design.

const PALETTE: Record<string, string> = {
  K: 'hsl(var(--ink))', // outline
  H: 'hsl(var(--yellow))', // hat crown
  B: 'hsl(var(--red))', // hat band
  S: '#d8a878', // skin
  E: 'hsl(var(--ink))', // eye
  N: 'hsl(var(--red))', // neckerchief
  C: 'hsl(var(--blue))', // coat
  P: 'hsl(var(--red))', // strap
  M: 'hsl(var(--ink))', // compass ring
  G: 'hsl(var(--cream))', // compass glass
  R: 'hsl(var(--red))', // compass needle
}

// 14 cols x 15 rows. "." = transparent.
const GRID = [
  '....KKKKKK....',
  '...KHHHHHHK...',
  '..KHHHHHHHHK..',
  '.KBBBBBBBBBBK.',
  'KKKKKKKKKKKKKK',
  '....KSSSSK....',
  '....KSEESK....',
  '....KSSSSK....',
  '.KNNNNNNNNNNK.',
  '..PKCCCCCCKP..',
  '..KCCCCCCCCK..',
  '..KCCCCCCCCK..',
  '..KCCCCCCCCK..',
  '..KKCCCCCCKK..',
  '....MGRRGM....',
]

interface IMascotProps {
  /** rendered pixel width; height derives from the grid aspect. */
  size?: number
  className?: string
}

const COLS = 14
const ROWS = 15

const Mascot: React.FC<IMascotProps> = ({ size = 112, className = '' }) => {
  const cells: React.ReactElement[] = []
  GRID.forEach((row, y) => {
    row.split('').forEach((ch, x) => {
      const fill = PALETTE[ch]
      if (!fill) return
      cells.push(
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />,
      )
    })
  })

  return (
    <svg
      role="img"
      aria-label="pixel explorer mascot"
      width={size}
      height={(size / COLS) * ROWS}
      viewBox={`0 0 ${COLS} ${ROWS}`}
      shapeRendering="crispEdges"
      className={className}
    >
      {cells}
    </svg>
  )
}

export default Mascot
