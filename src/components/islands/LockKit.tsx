import * as React from 'react'
import { Check, CircleHelp, Copy, Download, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import KeyProfile, { KeyProfilePair } from '@/components/islands/KeyProfile'
import {
  DEFAULT_LIMIT,
  DEFAULT_NODE_BUDGET,
  codeFileName,
  defaultDoubleParams,
  defaultParams,
  doubleCodeFileName,
  explainCode,
  explainDoubleCode,
  formatCode,
  formatDoubleCode,
  parseCode,
  parseDoubleCode,
  ruleLabels,
  solveDoubleLock,
  solveLock,
  toCsv,
  toDoubleCsv,
  validateDoubleParams,
  validateParams,
  type DoubleCode,
  type DoubleLockParams,
  type DoubleRuleReport,
  type DoubleSolveResult,
  type LockParams,
  type RuleReport,
  type SolveResult
} from '@/lib/lock'
import { useClipboard } from '@/lib/useClipboard'

type NumericField = {
  [Key in keyof LockParams]: LockParams[Key] extends number ? Key : never
}[keyof LockParams]

type FieldSpec = {
  /** Form id and issue key; row fields use an `a.`/`b.` prefix. */
  key: string
  letter: string
  label: string
  term: string
  hint: string
}

type FieldGroup = {
  title: string
  note: string
  fields: FieldSpec[]
  /** Column classes; row fieldsets sit side by side and stay narrow. */
  columns: string
}

/** The result list scrolls on its own, so it can hold more than a page. */
const VISIBLE_CODES = 600

/** Scrolls the key into view only when it is not already fully on screen. */
function revealModel(section: HTMLElement | null) {
  if (!section) return
  const box = section.getBoundingClientRect()
  if (box.top >= 0 && box.bottom <= window.innerHeight) return
  section.scrollIntoView({ block: 'start', behavior: scrollBehavior() })
}

const numberFormat = new Intl.NumberFormat('en-US')

function formatBig(value: bigint): string {
  return value > 10n ** 15n
    ? `${value.toString().slice(0, 3)}e+${value.toString().length - 1}`
    : numberFormat.format(value)
}

/** Key that runs the search from anywhere in the panel. */
const RUN_KEY = 'R'
/** Keys handled for the whole tool, whichever row mode is open. */
const TOP_KEY = 'T'
const MODEL_KEY = 'V'
const HELP_KEY = '?'
const TAB_KEYS: Record<string, string> = { '1': 'single', '2': 'double' }

const shortcutHelp: { keys: string[]; what: string }[] = [
  { keys: ['1'], what: 'Single row' },
  { keys: ['2'], what: 'Double row' },
  {
    keys: ['A', '…', 'L'],
    what: 'Jump to the field of that rule; press again to cycle a letter used twice (both rows, H and H′)'
  },
  { keys: [RUN_KEY], what: 'Calculate, then scroll to the key' },
  { keys: [MODEL_KEY], what: 'Scroll to the key model' },
  { keys: [TOP_KEY], what: 'Back to top' },
  { keys: [HELP_KEY], what: 'Show or hide this list' },
  { keys: ['Esc'], what: 'Hide this list' }
]

function fieldId(key: string): string {
  return `lock-${key.replace('.', '-')}`
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth'
}

/**
 * Maps a rule letter to every field that carries it, in form order. A letter
 * used twice — the row fields of a double-row lock, or H and H′ — cycles
 * through its fields on repeated presses.
 */
function buildShortcuts(groups: FieldGroup[]): Map<string, string[]> {
  const shortcuts = new Map<string, string[]>()
  for (const group of groups) {
    for (const field of group.fields) {
      const letter = field.letter.replace(/[^A-Z]/gu, '').toUpperCase()
      if (!letter) continue
      const ids = shortcuts.get(letter) ?? []
      ids.push(fieldId(field.key))
      shortcuts.set(letter, ids)
    }
  }
  return shortcuts
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) {
    return true
  }
  return target instanceof HTMLInputElement && target.type !== 'number'
}

/**
 * Letter keys jump to the matching field, R runs the search. Keys are ignored
 * while a text field has focus, so the manual bitting input keeps every letter.
 */
function useFieldShortcuts(
  shortcuts: Map<string, string[]>,
  onRun: () => void
) {
  const run = React.useRef(onRun)
  run.current = onRun

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.isComposing ||
        isTypingTarget(event.target)
      ) {
        return
      }
      const letter = event.key.toUpperCase()
      if (letter === RUN_KEY) {
        event.preventDefault()
        run.current()
        return
      }
      const ids = shortcuts.get(letter)
      if (!ids || ids.length === 0) return
      const current = ids.indexOf(document.activeElement?.id ?? '')
      const field = document.getElementById(ids[(current + 1) % ids.length])
      if (!field) return
      event.preventDefault()
      // Focus alone can leave the field under the header, so place it first.
      field.scrollIntoView({ block: 'center', behavior: scrollBehavior() })
      field.focus({ preventScroll: true })
      if (field instanceof HTMLInputElement) field.select()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shortcuts])
}

/**
 * Tool-wide keys: row mode, the two scroll targets and the shortcut list. The
 * key model lives inside the open tab panel, so it is looked up by attribute.
 */
function useGlobalShortcuts(actions: {
  onTab: (value: string) => void
  onHelp: (open: boolean | ((open: boolean) => boolean)) => void
}) {
  const latest = React.useRef(actions)
  latest.current = actions

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
        return
      }
      if (event.key === 'Escape') {
        latest.current.onHelp(false)
        return
      }
      if (isTypingTarget(event.target)) return
      if (event.key === HELP_KEY) {
        event.preventDefault()
        latest.current.onHelp((open) => !open)
        return
      }
      const tab = TAB_KEYS[event.key]
      if (tab) {
        event.preventDefault()
        latest.current.onTab(tab)
        return
      }
      const key = event.key.toUpperCase()
      if (key === TOP_KEY) {
        event.preventDefault()
        window.scrollTo({ top: 0, behavior: scrollBehavior() })
        return
      }
      if (key === MODEL_KEY) {
        event.preventDefault()
        document
          .querySelector(
            '[role="tabpanel"][data-state="active"] [data-key-model]'
          )
          ?.scrollIntoView({ block: 'start', behavior: scrollBehavior() })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

const geometryFields: FieldSpec[] = [
  {
    key: 'pins',
    letter: 'A',
    label: 'Pin depths',
    term: '弹子个数（牙花号数）',
    hint: 'Pin 1 is the shortest, pin A the longest.'
  },
  {
    key: 'holes',
    letter: 'B',
    label: 'Chambers',
    term: '弹子孔数（编码位数）',
    hint: 'Chamber 1 is next to the bow.'
  }
]

const chamberFields: FieldSpec[] = [
  {
    key: 'requiredPin',
    letter: 'C',
    label: 'Required pin',
    term: '必须使用的弹子号',
    hint: 'Must appear somewhere unless E names a chamber.'
  },
  {
    key: 'requiredHole',
    letter: 'E',
    label: 'Chamber for C',
    term: '使用 C 弹子的弹子孔号',
    hint: 'Forces pin C into exactly this chamber.'
  },
  {
    key: 'forbiddenPin',
    letter: 'D',
    label: 'Forbidden pin',
    term: '不得使用的弹子号',
    hint: 'Banned everywhere unless F names a chamber.'
  },
  {
    key: 'forbiddenHole',
    letter: 'F',
    label: 'Chamber for D',
    term: '禁用 D 弹子的弹子孔号',
    hint: 'Bans pin D in this chamber only.'
  }
]

const runField: FieldSpec = {
  key: 'maxRun',
  letter: 'G',
  label: 'Identical run limit',
  term: '剔除连续相同弹子数 ≥ G',
  hint: 'G = 3 rejects 122234.'
}

const stepField: FieldSpec = {
  key: 'maxStep',
  letter: 'H',
  label: 'Neighbour step limit',
  term: '剔除相邻弹子号之差 ≥ H',
  hint: 'H = 5 rejects 121634.'
}

const groupsField: FieldSpec = {
  key: 'maxPairGroups',
  letter: 'J',
  label: 'Repeated-pair limit',
  term: '剔除相邻相同弹子组数 ≥ J',
  hint: 'J = 2 rejects 332244, which has 3 groups.'
}

const floorField: FieldSpec = {
  key: 'longPinFloor',
  letter: 'K',
  label: 'Long pin floor',
  term: '剔除各弹子长度均 ≤ K',
  hint: 'K = 3 rejects 123123: every pin stays short.'
}

const repeatField: FieldSpec = {
  key: 'maxRepeat',
  letter: 'L',
  label: 'Pin reuse limit',
  term: '剔除同一弹子出现次数 ≥ L',
  hint: 'L = 3 rejects 121231, where pin 1 appears 3 times.'
}

const distanceField: FieldSpec = {
  key: 'minDistance',
  letter: 'I',
  label: 'Minimum difference',
  term: '剔除相异位个数 ≤ I 的编码之一',
  hint: 'I = 1 keeps only one of 121255 and 121256.'
}

const singleGroups: FieldGroup[] = [
  {
    title: 'Key geometry',
    note: 'The size of the code space, before any rule applies.',
    columns: 'sm:grid-cols-2',
    fields: geometryFields
  },
  {
    title: 'Chamber rules',
    note: 'Pin a depth to a chamber, or ban it. 0 turns a rule off.',
    columns: 'sm:grid-cols-2 lg:grid-cols-4',
    fields: chamberFields
  },
  {
    title: 'Shape rules',
    note: 'Drop bittings that are weak to pick, hard to cut or easy to misread.',
    columns: 'sm:grid-cols-2 lg:grid-cols-3',
    fields: [runField, stepField, groupsField, floorField, repeatField]
  },
  {
    title: 'Spacing rule',
    note: 'Keeps the kept codes far enough apart to avoid cross-opening.',
    columns: 'sm:grid-cols-2',
    fields: [distanceField]
  }
]

const singleShortcuts = buildShortcuts(singleGroups)

const pairSumField: FieldSpec = {
  key: 'maxPairSum',
  letter: 'H′',
  label: 'Paired sum limit',
  term: '剔除并排弹子号之和 ≥ H′',
  hint: 'Both depths of one chamber added up. 6 rejects a 4+2 chamber.'
}

const doubleGroups: FieldGroup[] = [
  {
    title: 'Row A',
    note: 'Depths, chambers and chamber rules of the first pin row.',
    columns: 'sm:grid-cols-2',
    fields: [...geometryFields, ...chamberFields].map((field) => ({
      ...field,
      key: `a.${field.key}`
    }))
  },
  {
    title: 'Row B',
    note: 'The second row keeps its own depths, chambers and chamber rules.',
    columns: 'sm:grid-cols-2',
    fields: [...geometryFields, ...chamberFields].map((field) => ({
      ...field,
      key: `b.${field.key}`
    }))
  },
  {
    title: 'Shape rules',
    note: 'G, J, K and L apply to each row on its own; H′ couples the rows.',
    columns: 'sm:grid-cols-2 lg:grid-cols-3',
    // Letter order, so pressing H cycles H then H′.
    fields: [
      runField,
      stepField,
      pairSumField,
      groupsField,
      floorField,
      repeatField
    ]
  },
  {
    title: 'Spacing rule',
    note: 'Rule I reads both rows joined into one code.',
    columns: 'sm:grid-cols-2',
    fields: [distanceField]
  }
]

const doubleShortcuts = buildShortcuts(doubleGroups)

function NumberField({
  field,
  value,
  issue,
  onChange
}: {
  field: FieldSpec
  value: number
  issue?: string
  onChange: (value: string) => void
}) {
  const id = fieldId(field.key)
  const shortcut = field.letter.replace(/[^A-Z]/gu, '').toUpperCase()
  return (
    <div>
      <label
        htmlFor={id}
        className='flex items-baseline gap-2 text-sm font-medium'
      >
        <kbd
          className='chip text-accent-text rounded-md px-1.5 py-0.5 font-mono text-xs'
          title={shortcut ? `Shortcut: ${shortcut}` : undefined}
        >
          {field.letter}
        </kbd>
        <span>{field.label}</span>
      </label>
      <p className='text-muted-foreground mt-1 mb-2 text-xs'>{field.term}</p>
      <Input
        id={id}
        type='number'
        min={0}
        step={1}
        inputMode='numeric'
        value={String(value)}
        aria-describedby={`${id}-hint`}
        aria-invalid={issue ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
        className='font-mono'
      />
      <p id={`${id}-hint`} className='text-muted-foreground mt-1.5 text-xs'>
        {issue ? <span className='text-accent-text'>{issue}</span> : field.hint}
      </p>
    </div>
  )
}

function FieldGrid({
  columns,
  children
}: {
  columns: string
  children: React.ReactNode
}) {
  return <div className={`grid gap-4 ${columns}`}>{children}</div>
}

/** One result: the bitting, with the key it stands for in a tooltip. */
function CodeButton({
  text,
  current,
  preview,
  onSelect
}: {
  text: string
  current: boolean
  preview: React.ReactNode
  onSelect: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type='button'
          aria-pressed={current}
          onClick={onSelect}
          className={`chip w-full rounded-lg px-2 py-2 text-center font-mono text-sm ${
            current ? 'border-accent text-accent-text' : ''
          }`}
        >
          {text}
        </button>
      </TooltipTrigger>
      <TooltipContent side='top' className='px-3 py-2'>
        <p className='mb-1 font-mono text-xs'>{text}</p>
        {preview}
      </TooltipContent>
    </Tooltip>
  )
}

function DropToggles({
  dropUniform,
  dropLadder,
  onChange
}: {
  dropUniform: boolean
  dropLadder: boolean
  onChange: (key: 'dropUniform' | 'dropLadder', value: boolean) => void
}) {
  return (
    <div className='mt-4 flex flex-wrap gap-4 text-sm'>
      <label className='flex items-center gap-2'>
        <input
          type='checkbox'
          checked={dropUniform}
          onChange={(event) => onChange('dropUniform', event.target.checked)}
          className='accent-accent size-4'
        />
        <span>Drop single-depth codes (111111)</span>
      </label>
      <label className='flex items-center gap-2'>
        <input
          type='checkbox'
          checked={dropLadder}
          onChange={(event) => onChange('dropLadder', event.target.checked)}
          className='accent-accent size-4'
        />
        <span>Drop staircase codes (123456)</span>
      </label>
    </div>
  )
}

function RuleChips<Report extends RuleReport>({
  reports,
  prefix,
  onActivate
}: {
  reports: Report[]
  prefix?: (report: Report) => string
  onActivate: (report: Report | null) => void
}) {
  return (
    <ul className='mt-4 flex flex-wrap gap-2'>
      {reports.map((report, index) => (
        <li key={`${prefix?.(report) ?? ''}${report.rule}-${index}`}>
          <button
            type='button'
            className={`chip rounded-md px-2 py-1 text-left text-xs ${
              report.ok ? '' : 'text-accent-text border-accent'
            }`}
            onMouseEnter={() => onActivate(report)}
            onFocus={() => onActivate(report)}
            onMouseLeave={() => onActivate(null)}
            onBlur={() => onActivate(null)}
            title={report.detail}
          >
            <span className='font-mono font-semibold'>
              {prefix?.(report)}
              {ruleLabels[report.rule].letter || '•'}
            </span>{' '}
            {ruleLabels[report.rule].label} {report.ok ? '✓' : '✗'}
          </button>
        </li>
      ))}
    </ul>
  )
}

function downloadCsv(content: string, name: string) {
  const blob = new Blob([`﻿${content}`], {
    type: 'text/csv;charset=utf-8'
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

function SingleRow() {
  const [params, setParams] = React.useState<LockParams>(defaultParams)
  const [result, setResult] = React.useState<SolveResult | null>(null)
  const [solvedWith, setSolvedWith] = React.useState<LockParams>(defaultParams)
  const [selected, setSelected] = React.useState(0)
  const [manual, setManual] = React.useState('')
  const [manualCode, setManualCode] = React.useState<number[] | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [activeRule, setActiveRule] = React.useState<RuleReport | null>(null)
  const model = React.useRef<HTMLElement>(null)
  const showModel = React.useRef(false)

  // Bring the key into view once a search the user asked for has rendered.
  React.useEffect(() => {
    if (!result || !showModel.current) return
    showModel.current = false
    model.current?.scrollIntoView({
      block: 'start',
      behavior: scrollBehavior()
    })
  }, [result])

  const issues = validateParams(params)
  const issueFor = (field: string) =>
    issues.find((issue) => issue.field === field)?.message
  const space = issues.length
    ? null
    : BigInt(params.pins) ** BigInt(params.holes)

  const codes = result?.codes ?? []
  // The diagram tracks the form while it is valid, so editing a rule updates
  // the key immediately; a bitting is only drawn while it still fits the form.
  const view = issues.length > 0 ? solvedWith : params
  const picked = manualCode ?? codes[selected] ?? null
  const code =
    picked &&
    picked.length === view.holes &&
    picked.every((pin) => pin <= view.pins)
      ? picked
      : null
  const reports = code ? explainCode(view, code) : []
  const bitting = code ? formatCode(code, view.pins) : ''
  const { copied, error: copyError, doCopy } = useClipboard(bitting)

  const reset = () => {
    setParams(defaultParams)
    setResult(null)
    setManual('')
    setManualCode(null)
    setActiveRule(null)
  }

  const run = () => {
    if (issues.length > 0 || busy) return
    setBusy(true)
    setActiveRule(null)
    setManualCode(null)
    setManual('')
    showModel.current = true
    // Yield one frame so the button reaches its pending state before the
    // search blocks the main thread.
    window.setTimeout(() => {
      try {
        setResult(
          solveLock(params, {
            limit: DEFAULT_LIMIT,
            nodeBudget: DEFAULT_NODE_BUDGET
          })
        )
        setSolvedWith(params)
        setSelected(0)
      } finally {
        setBusy(false)
      }
    }, 0)
  }

  const calculate: React.ComponentProps<'form'>['onSubmit'] = (event) => {
    event.preventDefault()
    run()
  }

  useFieldShortcuts(singleShortcuts, run)

  const select = (index: number) => {
    setSelected(index)
    setManual('')
    setManualCode(null)
    setActiveRule(null)
    revealModel(model.current)
  }

  return (
    <div className='space-y-6'>
      <form onSubmit={calculate} className='space-y-5'>
        {singleGroups.map((group) => (
          <fieldset key={group.title} className='panel rounded-soft p-4 sm:p-5'>
            <legend className='px-1 text-sm font-semibold'>
              {group.title}
            </legend>
            <p className='text-muted-foreground mb-4 text-xs'>{group.note}</p>
            <FieldGrid columns={group.columns}>
              {group.fields.map((field) => (
                <NumberField
                  key={field.key}
                  field={field}
                  value={params[field.key as NumericField]}
                  issue={issueFor(field.key)}
                  onChange={(value) =>
                    setParams((current) => ({
                      ...current,
                      [field.key]: value === '' ? 0 : Number(value)
                    }))
                  }
                />
              ))}
            </FieldGrid>
            {group.title === 'Spacing rule' && (
              <DropToggles
                dropUniform={params.dropUniform}
                dropLadder={params.dropLadder}
                onChange={(key, value) =>
                  setParams((current) => ({ ...current, [key]: value }))
                }
              />
            )}
          </fieldset>
        ))}

        <div className='flex flex-wrap items-center gap-3'>
          <Button
            type='submit'
            disabled={issues.length > 0 || busy}
            title={`Shortcut: ${RUN_KEY}`}
          >
            {busy ? 'Calculating…' : 'Calculate'}
            <kbd className='font-mono text-xs opacity-70'>{RUN_KEY}</kbd>
          </Button>
          <Button type='button' variant='outline' onClick={reset}>
            <RotateCcw /> Reset
          </Button>
          <p className='text-muted-foreground text-sm'>
            {space === null
              ? 'Fix the highlighted fields.'
              : `Code space ${formatBig(space)} bittings.`}
          </p>
        </div>
      </form>

      <section
        ref={model}
        data-key-model
        className='panel rounded-soft p-4 sm:p-5'
        aria-label='Key model'
      >
        <div className='overflow-x-auto'>
          <KeyProfile
            pins={view.pins}
            holes={view.holes}
            code={code}
            requiredPin={view.requiredPin}
            requiredHole={view.requiredHole}
            forbiddenPin={view.forbiddenPin}
            forbiddenHole={view.forbiddenHole}
            longPinFloor={view.longPinFloor}
            maxStep={view.maxStep}
            highlight={activeRule?.holes ?? []}
            highlightLabel={
              activeRule
                ? `${ruleLabels[activeRule.rule].letter || '—'} · ${activeRule.detail}`
                : undefined
            }
          />
        </div>
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <p className='font-mono text-lg' aria-live='polite'>
            {bitting || '—'}
          </p>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={doCopy}
            disabled={!bitting}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <div className='min-w-40 flex-1'>
            <label htmlFor='lock-manual' className='sr-only'>
              Check a bitting by hand
            </label>
            <Input
              id='lock-manual'
              value={manual}
              placeholder={`Check a bitting, e.g. ${'1'.repeat(Math.min(view.holes, 6))}`}
              onChange={(event) => {
                setManual(event.target.value)
                setActiveRule(null)
                setManualCode(parseCode(event.target.value, view))
              }}
              className='font-mono'
            />
          </div>
        </div>
        {manual !== '' && manualCode === null && (
          <p className='text-accent-text mt-2 text-xs' role='status'>
            Enter {view.holes} pin numbers between 1 and {view.pins}.
          </p>
        )}
        {copyError && (
          <p className='text-muted-foreground mt-2 text-xs'>
            Could not copy. Select the bitting and copy it manually.
          </p>
        )}
        {reports.length > 0 && (
          <RuleChips reports={reports} onActivate={setActiveRule} />
        )}
        <p className='text-muted-foreground mt-3 text-xs'>
          Hover a rule to mark the chambers it points at. Rule I compares two
          bittings, so it has no single-key verdict.
        </p>
      </section>

      <div role='status' aria-live='polite'>
        {result && (
          <p className='text-muted-foreground text-sm'>
            {numberFormat.format(codes.length)} of {formatBig(result.total)}{' '}
            bittings kept
            {result.nearDuplicates > 0 &&
              `, ${numberFormat.format(result.nearDuplicates)} dropped by rule I`}
            {result.truncated === 'limit' &&
              `, stopped at the first ${numberFormat.format(DEFAULT_LIMIT)}`}
            {result.truncated === 'budget' &&
              ', stopped on the search budget — tighten the rules'}
            .
          </p>
        )}
      </div>

      {codes.length > 0 && (
        <section aria-label='Generated bittings' className='space-y-3'>
          <div className='flex flex-wrap items-center gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() =>
                downloadCsv(toCsv(codes, solvedWith), codeFileName(solvedWith))
              }
            >
              <Download /> Download CSV
            </Button>
            <p className='text-muted-foreground text-xs'>
              Hover a bitting for its key, select it to study it above.
            </p>
          </div>
          <ul className='panel rounded-soft focus-visible:outline-ring grid max-h-[26rem] grid-cols-3 gap-2 overflow-y-auto p-3 outline-offset-2 focus-visible:outline-2 sm:grid-cols-5 lg:grid-cols-6'>
            {codes.slice(0, VISIBLE_CODES).map((item, index) => (
              <li key={formatCode(item, view.pins)}>
                <CodeButton
                  text={formatCode(item, view.pins)}
                  current={!manualCode && index === selected}
                  preview={
                    <KeyProfile
                      {...view}
                      code={item}
                      displayWidth={320}
                      highlightLabel=' '
                    />
                  }
                  onSelect={() => select(index)}
                />
              </li>
            ))}
          </ul>
          {codes.length > VISIBLE_CODES && (
            <p className='text-muted-foreground text-xs'>
              Showing the first {VISIBLE_CODES} bittings. Download the CSV for
              the rest.
            </p>
          )}
        </section>
      )}
    </div>
  )
}

function DoubleRow() {
  const [params, setParams] =
    React.useState<DoubleLockParams>(defaultDoubleParams)
  const [result, setResult] = React.useState<DoubleSolveResult | null>(null)
  const [solvedWith, setSolvedWith] =
    React.useState<DoubleLockParams>(defaultDoubleParams)
  const [selected, setSelected] = React.useState(0)
  const [manual, setManual] = React.useState('')
  const [manualCode, setManualCode] = React.useState<DoubleCode | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [activeRule, setActiveRule] = React.useState<DoubleRuleReport | null>(
    null
  )
  const model = React.useRef<HTMLElement>(null)
  const showModel = React.useRef(false)

  // Bring the key into view once a search the user asked for has rendered.
  React.useEffect(() => {
    if (!result || !showModel.current) return
    showModel.current = false
    model.current?.scrollIntoView({
      block: 'start',
      behavior: scrollBehavior()
    })
  }, [result])

  const issues = validateDoubleParams(params)
  const issueFor = (field: string) =>
    issues.find((issue) => issue.field === field)?.message
  const space = issues.length
    ? null
    : BigInt(params.rows[0].pins) ** BigInt(params.rows[0].holes) *
      BigInt(params.rows[1].pins) ** BigInt(params.rows[1].holes)

  const codes = result?.codes ?? []
  const view = issues.length > 0 ? solvedWith : params
  const picked = manualCode ?? codes[selected] ?? null
  const fits = (row: readonly number[], index: 0 | 1) =>
    row.length === view.rows[index].holes &&
    row.every((pin) => pin <= view.rows[index].pins)
  const code = picked && fits(picked.a, 0) && fits(picked.b, 1) ? picked : null
  const reports = code ? explainDoubleCode(view, code) : []
  const bitting = code ? formatDoubleCode(code, view) : ''
  const { copied, error: copyError, doCopy } = useClipboard(bitting)

  const setRow = (row: 0 | 1, key: string, value: string) =>
    setParams((current) => {
      const rows: DoubleLockParams['rows'] = [
        { ...current.rows[0] },
        { ...current.rows[1] }
      ]
      rows[row] = { ...rows[row], [key]: value === '' ? 0 : Number(value) }
      return { ...current, rows }
    })

  const reset = () => {
    setParams(defaultDoubleParams)
    setResult(null)
    setManual('')
    setManualCode(null)
    setActiveRule(null)
  }

  const run = () => {
    if (issues.length > 0 || busy) return
    setBusy(true)
    setActiveRule(null)
    setManualCode(null)
    setManual('')
    showModel.current = true
    window.setTimeout(() => {
      try {
        setResult(
          solveDoubleLock(params, {
            limit: DEFAULT_LIMIT,
            nodeBudget: DEFAULT_NODE_BUDGET
          })
        )
        setSolvedWith(params)
        setSelected(0)
      } finally {
        setBusy(false)
      }
    }, 0)
  }

  const calculate: React.ComponentProps<'form'>['onSubmit'] = (event) => {
    event.preventDefault()
    run()
  }

  useFieldShortcuts(doubleShortcuts, run)

  const select = (index: number) => {
    setSelected(index)
    setManual('')
    setManualCode(null)
    setActiveRule(null)
    revealModel(model.current)
  }

  // Results are ordered row A first, so they group into one block per row A
  // bitting; that keeps the repeated prefix out of every button.
  const groupedCodes = React.useMemo(() => {
    const groups: { rowA: string; items: { index: number; text: string }[] }[] =
      []
    codes.slice(0, VISIBLE_CODES).forEach((item, index) => {
      const rowA = formatCode(item.a, view.rows[0].pins)
      const text = formatCode(item.b, view.rows[1].pins)
      const last = groups.at(-1)
      if (last?.rowA === rowA) last.items.push({ index, text })
      else groups.push({ rowA, items: [{ index, text }] })
    })
    return groups
  }, [codes, view])

  const highlight = activeRule
    ? activeRule.row === 'pair'
      ? { a: activeRule.holes, b: activeRule.otherHoles ?? activeRule.holes }
      : { [activeRule.row]: activeRule.holes }
    : undefined

  const renderGroup = (group: FieldGroup) => (
    <fieldset key={group.title} className='panel rounded-soft p-4 sm:p-5'>
      <legend className='px-1 text-sm font-semibold'>{group.title}</legend>
      <p className='text-muted-foreground mb-4 text-xs'>{group.note}</p>
      <FieldGrid columns={group.columns}>
        {group.fields.map((field) => {
          const [prefix, name] = field.key.includes('.')
            ? field.key.split('.')
            : [null, field.key]
          const row = prefix === 'a' ? 0 : 1
          return (
            <NumberField
              key={field.key}
              field={field}
              value={
                prefix
                  ? (params.rows[row][
                      name as keyof DoubleLockParams['rows'][0]
                    ] as number)
                  : (params[name as keyof DoubleLockParams] as number)
              }
              issue={issueFor(field.key)}
              onChange={(value) =>
                prefix
                  ? setRow(row as 0 | 1, name, value)
                  : setParams((current) => ({
                      ...current,
                      [name]: value === '' ? 0 : Number(value)
                    }))
              }
            />
          )
        })}
      </FieldGrid>
      {group.title === 'Spacing rule' && (
        <DropToggles
          dropUniform={params.dropUniform}
          dropLadder={params.dropLadder}
          onChange={(key, value) =>
            setParams((current) => ({ ...current, [key]: value }))
          }
        />
      )}
    </fieldset>
  )

  return (
    <div className='space-y-6'>
      <form onSubmit={calculate} className='space-y-5'>
        <div className='grid gap-5 lg:grid-cols-2'>
          {doubleGroups.slice(0, 2).map(renderGroup)}
        </div>
        {doubleGroups.slice(2).map(renderGroup)}

        <div className='flex flex-wrap items-center gap-3'>
          <Button
            type='submit'
            disabled={issues.length > 0 || busy}
            title={`Shortcut: ${RUN_KEY}`}
          >
            {busy ? 'Calculating…' : 'Calculate'}
            <kbd className='font-mono text-xs opacity-70'>{RUN_KEY}</kbd>
          </Button>
          <Button type='button' variant='outline' onClick={reset}>
            <RotateCcw /> Reset
          </Button>
          <p className='text-muted-foreground text-sm'>
            {space === null
              ? 'Fix the highlighted fields.'
              : `Code space ${formatBig(space)} paired bittings.`}
          </p>
        </div>
      </form>

      <section
        ref={model}
        data-key-model
        className='panel rounded-soft p-4 sm:p-5'
        aria-label='Key model'
      >
        <div className='overflow-x-auto'>
          <KeyProfilePair
            params={view}
            code={code}
            highlight={highlight}
            highlightLabel={
              activeRule
                ? `${activeRule.row === 'pair' ? 'H′' : `${activeRule.row.toUpperCase()} · ${ruleLabels[activeRule.rule].letter || '—'}`} · ${activeRule.detail}`
                : undefined
            }
          />
        </div>
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <p className='font-mono text-lg' aria-live='polite'>
            {bitting || '—'}
          </p>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={doCopy}
            disabled={!bitting}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <div className='min-w-40 flex-1'>
            <label htmlFor='lock-manual-double' className='sr-only'>
              Check a paired bitting by hand
            </label>
            <Input
              id='lock-manual-double'
              value={manual}
              placeholder={`Check a pair, e.g. ${'1'.repeat(Math.min(view.rows[0].holes, 6))} / ${'1'.repeat(Math.min(view.rows[1].holes, 6))}`}
              onChange={(event) => {
                setManual(event.target.value)
                setActiveRule(null)
                setManualCode(parseDoubleCode(event.target.value, view))
              }}
              className='font-mono'
            />
          </div>
        </div>
        {manual !== '' && manualCode === null && (
          <p className='text-accent-text mt-2 text-xs' role='status'>
            Enter row A and row B separated by a slash: {view.rows[0].holes}{' '}
            pins up to {view.rows[0].pins}, then {view.rows[1].holes} pins up to{' '}
            {view.rows[1].pins}.
          </p>
        )}
        {copyError && (
          <p className='text-muted-foreground mt-2 text-xs'>
            Could not copy. Select the bitting and copy it manually.
          </p>
        )}
        {reports.length > 0 && (
          <RuleChips
            reports={reports}
            prefix={(report) =>
              report.row === 'pair' ? '' : `${report.row.toUpperCase()} `
            }
            onActivate={setActiveRule}
          />
        )}
        <p className='text-muted-foreground mt-3 text-xs'>
          Row rules are checked per row; H′ adds both depths of one chamber.
          Rule I compares two paired bittings, so it has no single-key verdict.
        </p>
      </section>

      <div role='status' aria-live='polite'>
        {result && (
          <p className='text-muted-foreground text-sm'>
            {numberFormat.format(codes.length)} of {formatBig(result.total)}{' '}
            paired bittings kept, from{' '}
            {numberFormat.format(result.rowCounts[0])} row A and{' '}
            {numberFormat.format(result.rowCounts[1])} row B bittings
            {result.nearDuplicates > 0 &&
              `, ${numberFormat.format(result.nearDuplicates)} dropped by rule I`}
            {result.truncated === 'limit' &&
              `, stopped at the first ${numberFormat.format(DEFAULT_LIMIT)}`}
            {result.truncated === 'budget' &&
              ', stopped on the pairing budget — tighten the rules'}
            {result.truncated === 'rows' &&
              ', a row search hit its own limit — tighten the row rules'}
            .
          </p>
        )}
      </div>

      {codes.length > 0 && (
        <section aria-label='Generated paired bittings' className='space-y-3'>
          <div className='flex flex-wrap items-center gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() =>
                downloadCsv(
                  toDoubleCsv(codes, solvedWith),
                  doubleCodeFileName(solvedWith)
                )
              }
            >
              <Download /> Download CSV
            </Button>
            <p className='text-muted-foreground text-xs'>
              Rows are grouped by row A. Hover a row B bitting for its key.
            </p>
          </div>
          <div className='panel rounded-soft focus-visible:outline-ring max-h-[26rem] space-y-4 overflow-y-auto p-3 outline-offset-2 focus-visible:outline-2'>
            {groupedCodes.map((group) => (
              <section key={group.rowA} aria-label={`Row A ${group.rowA}`}>
                <h3 className='bg-background/95 text-muted-foreground sticky top-0 z-10 py-1 text-xs'>
                  Row A{' '}
                  <span className='text-foreground font-mono'>
                    {group.rowA}
                  </span>{' '}
                  · {group.items.length} row B
                  {group.items.length === 1 ? ' bitting' : ' bittings'}
                </h3>
                <ul className='mt-1 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6'>
                  {group.items.map(({ index, text }) => (
                    <li key={text}>
                      <CodeButton
                        text={text}
                        current={!manualCode && index === selected}
                        preview={
                          <KeyProfilePair
                            params={view}
                            code={codes[index]}
                            displayWidth={320}
                            highlightLabel=' '
                          />
                        }
                        onSelect={() => select(index)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          {codes.length > VISIBLE_CODES && (
            <p className='text-muted-foreground text-xs'>
              Showing the first {VISIBLE_CODES} pairs. Download the CSV for the
              rest.
            </p>
          )}
        </section>
      )}
    </div>
  )
}

export default function LockKit() {
  const [tab, setTab] = React.useState('single')
  const [help, setHelp] = React.useState(false)
  const helpButton = React.useRef<HTMLButtonElement>(null)
  const dialog = React.useRef<HTMLDialogElement>(null)
  const opener = React.useRef<HTMLElement | null>(null)

  useGlobalShortcuts({ onTab: setTab, onHelp: setHelp })

  // A native dialog brings the focus trap, the backdrop and Escape with it.
  React.useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (help && !node.open) {
      opener.current = document.activeElement as HTMLElement | null
      node.showModal()
    } else if (!help && node.open) {
      node.close()
    }
  }, [help])

  // Dismiss on a click outside the card; the backdrop is the dialog itself.
  React.useEffect(() => {
    const node = dialog.current
    if (!node) return
    const onClick = (event: MouseEvent) => {
      if (event.target === node) setHelp(false)
    }
    node.addEventListener('click', onClick)
    return () => node.removeEventListener('click', onClick)
  }, [])

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={400}>
      <Tabs value={tab} onValueChange={setTab} className='mt-8'>
        <div className='flex flex-wrap items-center gap-3'>
          <TabsList>
            <TabsTrigger value='single' title='Shortcut: 1'>
              Single row 单排
            </TabsTrigger>
            <TabsTrigger value='double' title='Shortcut: 2'>
              Double row 双排
            </TabsTrigger>
          </TabsList>
          <Button
            ref={helpButton}
            type='button'
            variant='outline'
            size='icon'
            aria-haspopup='dialog'
            title={`Keyboard shortcuts: ${HELP_KEY}`}
            onClick={() => setHelp(true)}
          >
            <CircleHelp />
            <span className='sr-only'>Keyboard shortcuts</span>
          </Button>
          <p className='text-muted-foreground text-xs'>
            Press{' '}
            <kbd className='chip rounded-md px-1.5 py-0.5 font-mono'>
              {HELP_KEY}
            </kbd>{' '}
            for the keyboard shortcuts.
          </p>
        </div>

        <TabsContent value='single'>
          <SingleRow />
        </TabsContent>
        <TabsContent value='double'>
          <DoubleRow />
        </TabsContent>
      </Tabs>

      <dialog
        ref={dialog}
        aria-labelledby='lock-shortcuts-title'
        className='panel rounded-soft text-foreground m-auto w-[min(92vw,34rem)] max-h-[85vh] overflow-y-auto p-5 backdrop:bg-black/40'
        onClose={() => {
          setHelp(false)
          opener.current?.focus()
        }}
      >
        <div className='flex items-start justify-between gap-3'>
          <h2 id='lock-shortcuts-title' className='text-base font-semibold'>
            Keyboard shortcuts
          </h2>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={() => setHelp(false)}
          >
            <X />
            <span className='sr-only'>Close</span>
          </Button>
        </div>
        <dl className='mt-4 grid gap-x-4 gap-y-2.5 text-sm sm:grid-cols-[auto_1fr]'>
          {shortcutHelp.map((entry) => (
            <React.Fragment key={entry.what}>
              <dt className='flex items-center gap-1'>
                {entry.keys.map((key) =>
                  key === '…' ? (
                    <span key={key} className='text-muted-foreground'>
                      …
                    </span>
                  ) : (
                    <kbd
                      key={key}
                      className='chip text-accent-text rounded-md px-1.5 py-0.5 font-mono text-xs'
                    >
                      {key}
                    </kbd>
                  )
                )}
              </dt>
              <dd className='text-muted-foreground'>{entry.what}</dd>
            </React.Fragment>
          ))}
        </dl>
        <p className='text-muted-foreground mt-4 text-xs'>
          Shortcuts stand down while a text field has focus, so the manual
          bitting field keeps every letter.
        </p>
      </dialog>
    </TooltipProvider>
  )
}
