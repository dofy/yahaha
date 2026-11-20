type Tone = readonly [offset: number, frequency: number, length: number, level: number]

const cues = {
  hover: { duration: 0.075, paper: 0, tones: [[0, 659.25, 0.075, 0.052]] },
  tap: { duration: 0.11, paper: 0, tones: [[0, 440, 0.11, 0.06]] },
  select: { duration: 0.21, paper: 0, tones: [[0, 587.33, 0.15, 0.075], [0.04, 880, 0.17, 0.035]] },
  fly: { duration: 0.59, paper: 0.14, tones: [[0.04, 329.63, 0.24, 0.058], [0.13, 440, 0.25, 0.055], [0.23, 587.33, 0.34, 0.048]] },
  return: { duration: 0.57, paper: 0.11, tones: [[0.01, 440, 0.24, 0.057], [0.11, 369.99, 0.27, 0.05], [0.21, 293.66, 0.36, 0.052]] }
} satisfies Record<string, { duration: number; paper: number; tones: Tone[] }>

type Cue = keyof typeof cues

function renderCue(context: AudioContext, name: Cue) {
  const { duration, paper, tones } = cues[name]
  const rate = 24_000
  const buffer = context.createBuffer(1, Math.ceil(duration * rate), rate)
  const samples = buffer.getChannelData(0)
  for (const [offset, frequency, length, level] of tones) {
    const start = Math.round(offset * rate)
    for (let i = start; i < Math.min(samples.length, start + Math.round(length * rate)); i++) {
      const t = (i - start) / rate
      const phase = 2 * Math.PI * frequency * t
      const envelope = Math.min(1, t / 0.009, (length - t) / 0.025) * Math.exp(-4.5 * t / length)
      samples[i] += level * envelope * (Math.sin(phase) + 0.24 * Math.sin(2 * phase) + 0.08 * Math.sin(3 * phase))
    }
  }
  if (paper) {
    let soft = 0
    let body = 0
    for (let i = 0; i < samples.length; i++) {
      const noise = Math.random() * 2 - 1
      soft += 0.28 * (noise - soft)
      body += 0.05 * (noise - body)
      const swell = Math.sin(Math.PI * i / samples.length)
      samples[i] += paper * (soft - body) * swell ** 2
    }
  }
  return buffer
}

const labels = {
  'zh-CN': ['音效', '交互音效'],
  'zh-Hant': ['音效', '互動音效'],
  ja: ['効果音', '操作の効果音'],
  en: ['Effects', 'Sound effects']
}

const preferenceKey = 'yahaha-map-effects'

export function mountMapEffects(map: HTMLElement, button: HTMLButtonElement) {
  if (typeof AudioContext !== 'function') return
  let context: AudioContext | undefined
  const buffers = new Map<Cue, AudioBuffer>()
  let voice: { name: Cue; source: AudioBufferSourceNode; gain: GainNode } | undefined
  let resuming = false
  let pending: Cue | undefined
  let lastHover = -Infinity
  let enabled = true
  try { enabled = localStorage.getItem(preferenceKey) !== 'off' } catch { /* storage is optional */ }

  function stopSound() {
    if (!voice) return
    const { source, gain } = voice
    const now = source.context.currentTime
    gain.gain.setTargetAtTime(0, now, 0.005)
    source.stop(now + 0.025)
    voice = undefined
  }

  function play(name: Cue) {
    if (!enabled || document.hidden) return
    if (context?.state !== 'running') {
      if (resuming && name !== 'hover') pending = name
      return
    }
    const buffer = buffers.get(name) ?? renderCue(context, name)
    buffers.set(name, buffer)
    stopSound()
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    source.connect(gain).connect(context.destination)
    source.onended = () => {
      source.disconnect()
      gain.disconnect()
      if (voice?.source === source) voice = undefined
    }
    voice = { name, source, gain }
    source.start()
  }

  async function resumeSound() {
    if (!enabled || resuming || context?.state === 'running') return
    resuming = true
    try {
      context ??= new AudioContext()
      await context.resume()
      if (pending) play(pending)
    } catch {
      // A later interaction can retry if the browser interrupted audio.
    } finally {
      pending = undefined
      resuming = false
    }
  }

  const unlock = (event: Event) => {
    if (event.isTrusted && navigator.userActivation?.isActive !== false) void resumeSound()
  }
  for (const event of ['pointerup', 'keydown', 'click']) document.addEventListener(event, unlock, true)

  function playHover() {
    const now = performance.now()
    if (!enabled || document.hidden || now - lastHover < 100 || (voice && voice.name !== 'hover')) return
    try {
      // Browsers that allow sound immediately can play hover cues without a click.
      context ??= new AudioContext()
    } catch {
      return
    }
    if (context.state === 'running') {
      lastHover = now
      play('hover')
    }
  }

  const updatePressed = () => button.setAttribute('aria-pressed', String(enabled))
  button.addEventListener('click', () => {
    enabled = !enabled
    updatePressed()
    try { localStorage.setItem(preferenceKey, enabled ? 'on' : 'off') } catch { /* storage is optional */ }
    if (enabled) {
      void resumeSound()
      play('tap')
    } else {
      pending = undefined
      stopSound()
    }
  })

  map.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch' || event.buttons || !(event.target instanceof Element)) return
    const target = event.target.closest('button:not(:disabled), a[href]')
    if (target && !(event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) playHover()
  })

  // Canvas picking marks the hovered town or building on its map label.
  const mapLabels = map.querySelector('#labels')!
  let hovered = mapLabels.querySelector('.c-tag.hot, .d-tag.hot')
  const hoverObserver = new MutationObserver(() => {
    const target = mapLabels.querySelector('.c-tag.hot, .d-tag.hot')
    if (target && target !== hovered) playHover()
    hovered = target
  })
  hoverObserver.observe(mapLabels, { subtree: true, attributeFilter: ['class'] })

  const crumb = map.querySelector('#crumb')!
  const language = document.documentElement
  const updateLabel = () => {
    const [label, name] = labels[language.lang as keyof typeof labels] ?? labels.en
    button.querySelector('.t')!.textContent = label
    button.setAttribute('aria-label', name)
    button.title = name
  }
  // The map updates the breadcrumb and selection together for pointer, keyboard and tour navigation.
  const location = () => ({
    city: crumb.querySelector('button ~ .here')?.textContent ?? '',
    building: map.querySelector('[data-sel][aria-current="true"]')?.getAttribute('data-sel') ??
      map.querySelector('.d-tag.sel')?.getAttribute('data-id') ?? ''
  })
  let previous = location()
  const observer = new MutationObserver((changes) => {
    if (changes.some(({ target }) => target === language)) updateLabel()
    const current = location()
    const changed = (attribute: string, selector: string) => changes.some(({ target, attributeName, oldValue }) =>
      attributeName === attribute && target instanceof Element && target.matches(selector) && target.getAttribute(attribute) !== oldValue
    )
    if (current.city !== previous.city) play(current.city ? 'fly' : 'return')
    else if (current.building !== previous.building) play(current.building ? 'select' : 'tap')
    else if (changed('aria-pressed', '#b-top, #b-spin')) play('fly')
    else if (changed('aria-pressed', '#b-tour') ||
      changed('aria-expanded', '#b-keys, #b-cities[aria-expanded="true"], #b-lang[aria-expanded="true"]') ||
      changed('lang', 'html')) play('tap')
    previous = current
  })
  observer.observe(crumb, { childList: true })
  observer.observe(map.querySelector('.tools')!, { subtree: true, attributeFilter: ['aria-pressed', 'aria-expanded'], attributeOldValue: true })
  observer.observe(language, { attributeFilter: ['lang'], attributeOldValue: true })
  map.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('#fold, .bubble-close')) play('tap')
  })
  updateLabel()
  updatePressed()
  button.hidden = false
}
