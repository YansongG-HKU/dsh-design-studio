import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

/**
 * Evaluate the built client bundle in a browser-shaped sandbox and return the
 * module definition the DSH dynamic-client loader would receive.
 */
function loadClient() {
  const source = readFileSync(new URL('../../client.js', import.meta.url), 'utf8')
  let definition = null
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(next) {
          definition = next
        },
      },
      localStorage: {
        store: new Map(),
        getItem(key) {
          return this.store.has(key) ? this.store.get(key) : null
        },
        setItem(key, value) {
          this.store.set(key, String(value))
        },
      },
      matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    },
    navigator: { clipboard: { writeText: async () => {} } },
    document: { addEventListener() {}, removeEventListener() {} },
    console,
    Symbol,
    Object,
    JSON,
    Math,
    Date,
    Array,
    Map,
    Set,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    Promise,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
  }
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: 'client.js' })
  return definition
}

/** A fake React module good enough to construct elements and run apply(). */
function fakeReact() {
  const element = (type, props, ...children) => ({ type, props: props || {}, children })
  return {
    createElement: element,
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
  }
}

/**
 * Values built inside the vm realm have that realm's prototypes, so
 * deepStrictEqual reports "same structure but not reference-equal". Normalise
 * through JSON before comparing structure.
 */
function plain(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function instrumentedCtx(registrations) {
  return {
    effect: (fn, label) => {
      registrations.push({ kind: 'effect', label })
      return fn()
    },
    locale: {
      register: (namespace, dictionaries) => {
        registrations.push({ kind: 'locale', namespace, dictionaries })
        return () => {}
      },
      bind: (namespace) => (key) => namespace + ':' + key,
    },
    slots: {
      inject: (name, factory) => {
        registrations.push({ kind: 'inject', name })
        return factory()
      },
      register: (options, component) => {
        registrations.push({ kind: 'register', options, component })
        return () => {}
      },
    },
  }
}

function boot() {
  const definition = loadClient()
  const module = definition.factory(() => fakeReact())
  return { definition, module }
}

test('client bundle registers under the package id and exposes a factory', () => {
  const { definition } = boot()
  assert.equal(definition.id, 'dsh-design-studio')
  assert.equal(typeof definition.factory, 'function')
})

test('client injects locale + slots and registers the sidebar panel and main page', () => {
  const { module } = boot()
  assert.deepEqual([...module.inject], ['slots', 'locale', 'layout'])
  assert.equal(typeof module.apply, 'function')

  const registrations = []
  module.apply(instrumentedCtx(registrations))

  const locale = registrations.find((row) => row.kind === 'locale')
  assert.equal(locale.namespace, 'dsh-design-studio')
  assert.ok(locale.dictionaries.zh)
  assert.ok(locale.dictionaries.en)

  const registered = registrations.filter((row) => row.kind === 'register')
  assert.equal(registered.length, 2)
  assert.equal(registered[0].options.name, 'sidebar.panellist')
  assert.equal(registered[0].options.id, 'dsh-design-studio')
  assert.equal(registered[0].options.order, 24)
  assert.equal(typeof registered[0].component, 'function')
  assert.equal(registered[1].options.name, 'main')
  assert.equal(registered[1].options.key, 'dsh-design-studio')
  assert.equal(typeof registered[1].component, 'function')

  const injections = registrations.filter((row) => row.kind === 'inject').map((row) => row.name)
  assert.deepEqual(injections, ['sidebar.pannellist', 'main'].map((name) => (name === 'sidebar.pannellist' ? 'sidebar.panellist' : name)))
})

test('zh and en dictionaries cover the same keys and interpolate values', () => {
  const { module } = boot()
  const { DICTIONARIES, makeT } = module.__test__
  assert.deepEqual(Object.keys(DICTIONARIES.zh).sort(), Object.keys(DICTIONARIES.en).sort())
  assert.ok(Object.keys(DICTIONARIES.zh).length > 180)
  for (const key of Object.keys(DICTIONARIES.zh)) {
    assert.equal(typeof DICTIONARIES.zh[key], 'string', 'zh ' + key)
    assert.equal(typeof DICTIONARIES.en[key], 'string', 'en ' + key)
  }
  assert.equal(makeT('zh')('panel'), '设计台')
  assert.equal(makeT('en')('panel'), 'Design Studio')
  assert.equal(makeT('zh')('checkRound', { n: 3 }), '第 3 轮')
  assert.equal(makeT('en')('variantsCount', { n: 4 }), '4 variants')
  assert.equal(makeT('zh')('checkCounts', { c: 1, h: 2, m: 0, l: 3 }), '致命 1 · 高 2 · 中 0 · 低 3')
  assert.equal(makeT('en')('checkCounts', { c: 1, h: 2, m: 0, l: 3 }), 'critical 1 · high 2 · medium 0 · low 3')
  assert.equal(makeT('zh')('missing.key'), 'missing.key')
})

test('score maps to grade and tone per CONTRACT §7 bands', () => {
  const { module } = boot()
  const { scoreGrade, scoreTone, gradeTone, isPassing } = module.__test__
  assert.equal(scoreGrade(95), 'A')
  assert.equal(scoreGrade(90), 'A')
  assert.equal(scoreGrade(89), 'B')
  assert.equal(scoreGrade(80), 'B')
  assert.equal(scoreGrade(79), 'C')
  assert.equal(scoreGrade(60), 'D')
  assert.equal(scoreGrade(59), 'F')
  assert.equal(scoreGrade(null), '')
  assert.equal(scoreGrade(undefined), '')
  assert.equal(scoreGrade(''), '')
  assert.equal(scoreGrade('nope'), '')
  assert.equal(scoreTone(95), 'ok')
  assert.equal(scoreTone(85), 'warn')
  assert.equal(scoreTone(45), 'danger')
  assert.equal(gradeTone('A'), 'ok')
  assert.equal(gradeTone('F'), 'danger')
  assert.equal(gradeTone(''), '')
  assert.equal(isPassing(90), true)
  assert.equal(isPassing(89.9), false)
})

test('time and byte formatting is stable and localized', () => {
  const { module } = boot()
  const { fmtTime, fmtClock, fmtBytes, fmtDuration, makeT } = module.__test__
  const iso = (minutesAgo) => new Date(Date.now() - minutesAgo * 60000).toISOString()
  assert.equal(fmtTime(iso(0.2), makeT('en')), 'just now')
  assert.equal(fmtTime(iso(10), makeT('en')), '10 min ago')
  assert.equal(fmtTime(iso(10), makeT('zh')), '10 分钟前')
  assert.equal(fmtTime(iso(90), makeT('en')), '2 h ago')
  assert.match(fmtClock('2026-11-08T01:02:03.000Z'), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  assert.equal(fmtTime('', makeT('zh')), '')
  assert.equal(fmtBytes(0), '–')
  assert.equal(fmtBytes(512), '512 B')
  assert.equal(fmtBytes(2048), '2.0 KB')
  assert.equal(fmtBytes(3 * 1024 * 1024), '3.0 MB')
  assert.equal(fmtDuration(900), '900 ms')
  assert.equal(fmtDuration(1500), '1.5 s')
  assert.equal(fmtDuration(90000), '1 min 30 s')
})

test('zoom steps clamp to the supported range', () => {
  const { module } = boot()
  const { clampZoom, stepZoom, fitZoom, fmtPct, ZOOM_MIN, ZOOM_MAX } = module.__test__
  assert.equal(clampZoom(9), ZOOM_MAX)
  assert.equal(clampZoom(0.01), ZOOM_MIN)
  assert.equal(clampZoom(0.6), 0.6)
  assert.equal(clampZoom('x'), 1)
  assert.equal(stepZoom(1, 'in'), 1.25)
  assert.equal(stepZoom(1, 'out'), 0.75)
  assert.equal(stepZoom(2, 'in'), ZOOM_MAX)
  assert.equal(stepZoom(0.15, 'out'), ZOOM_MIN)
  const fit = fitZoom(1440, 900, 900, 900)
  assert.ok(fit > 0 && fit < 1)
  assert.equal(fmtPct(0.567), '57%')
  assert.equal(ZOOM_MIN < ZOOM_MAX, true)
})

test('device presets pick a frame from the viewport width and kind', () => {
  const { module } = boot()
  const { DEVICE_PRESETS, devicePreset, pickDeviceForWidth } = module.__test__
  assert.equal(DEVICE_PRESETS.browser.chromeHeight, 34)
  assert.equal(DEVICE_PRESETS.phone.radius, 34)
  assert.equal(devicePreset('phone').id, 'phone')
  assert.equal(devicePreset('nope').id, 'browser')
  assert.equal(pickDeviceForWidth(375, 'web'), 'phone')
  assert.equal(pickDeviceForWidth(390, 'mobile'), 'phone')
  assert.equal(pickDeviceForWidth(1440, 'web'), 'browser')
  assert.equal(pickDeviceForWidth(768, 'web'), 'browser')
})

test('default viewports and heights follow the kind table', () => {
  const { module } = boot()
  const { defaultViewports, heightForWidth, KIND_VIEWPORTS } = module.__test__
  assert.deepEqual(plain(defaultViewports('web')), [1440, 768, 375])
  assert.deepEqual(plain(defaultViewports('mobile')), [390, 375])
  assert.deepEqual(plain(defaultViewports('deck')), [1920])
  assert.deepEqual(plain(defaultViewports('poster')), [1080])
  assert.deepEqual(plain(defaultViewports('doc')), [794])
  assert.deepEqual(plain(defaultViewports('unknown')), [1440, 768, 375])
  const copy = defaultViewports('web')
  copy.push(1)
  assert.deepEqual(plain(KIND_VIEWPORTS.web), [1440, 768, 375])
  assert.equal(heightForWidth(1440), 900)
  assert.equal(heightForWidth(375), 812)
  assert.equal(heightForWidth(390), 844)
  assert.equal(heightForWidth(600), 480)
})

test('selector formatting and breadcrumbs stay readable', () => {
  const { module } = boot()
  const { shortSelector, selectorLabel, breadcrumbOf } = module.__test__
  assert.equal(selectorLabel({ tag: 'div', id: 'app', classes: ['card', 'x'] }), 'div#app.card.x')
  assert.equal(selectorLabel({ tag: 'H2', classes: [] }), 'h2')
  assert.equal(selectorLabel(null), '')
  assert.equal(shortSelector('#app > section > div.card > h2'), '… > section > div.card > h2')
  assert.equal(shortSelector('#app > section > div.card > h2', 2), '… > div.card > h2')
  assert.equal(shortSelector(''), '')
  assert.deepEqual(plain(breadcrumbOf('#app > section > h2')), ['#app', 'section', 'h2'])
})

test('comments sort unresolved first, then newest first', () => {
  const { module } = boot()
  const { sortComments, openCommentCount } = module.__test__
  const rows = [
    { id: 'resolved-new', createdAt: '2026-01-03T00:00:00Z', resolvedAt: '2026-01-04T00:00:00Z' },
    { id: 'open-old', createdAt: '2026-01-01T00:00:00Z', resolvedAt: null },
    { id: 'open-new', createdAt: '2026-01-02T00:00:00Z', resolvedAt: null },
  ]
  const sorted = sortComments(rows)
  assert.deepEqual(plain(sorted.map((row) => row.id)), ['open-new', 'open-old', 'resolved-new'])
  assert.equal(openCommentCount(rows), 2)
  assert.deepEqual(plain(sortComments(null)), [])
})

test('tweaks normalise from the raw EDITMODE object into typed rows', () => {
  const { module } = boot()
  const { normalizeTweakRows, tweakType } = module.__test__
  assert.equal(tweakType('#b4552f'), 'color')
  assert.equal(tweakType(16), 'number')
  assert.equal(tweakType(false), 'boolean')
  assert.equal(tweakType('Fraunces'), 'text')
  const rows = normalizeTweakRows({ primaryColor: '#b4552f', fontSize: 16, dark: false, heading: 'Serif' })
  assert.deepEqual(plain(rows.map((row) => [row.key, row.type])), [
    ['primaryColor', 'color'],
    ['fontSize', 'number'],
    ['dark', 'boolean'],
    ['heading', 'text'],
  ])
  assert.deepEqual(plain(normalizeTweakRows(null)), [])
  assert.deepEqual(plain(normalizeTweakRows([{ key: 'radius', value: 8 }]).map((row) => row.key)), ['radius'])
})

test('check detail parses host-core check.json shape and groups findings', () => {
  const { module } = boot()
  const { checkVariants, pickCheckVariant, groupFindings, countFindings, categoryRows, viewportRows, findingList } = module.__test__
  const check = {
    round: 2,
    at: '2026-11-08T01:00:00Z',
    variant: 'all',
    score: 88,
    grade: 'B',
    pass: false,
    variants: [
      {
        variant: 'a',
        score: 92,
        grade: 'A',
        pass: true,
        categories: [{ id: 'a11y', label: 'A11y', score: 94, weight: 0.3, findings: [{ code: 'contrast', severity: 'high', message: 'Low contrast', fix: 'Raise contrast' }] }],
        viewports: [{ width: 1440, score: 92, findings: [] }],
        counts: { critical: 0, high: 1, medium: 0, low: 0 },
        screenshots: [{ width: 1440, path: 'checks/round-2/a/capture-1440.png' }],
      },
      { variant: 'b', score: 84, grade: 'B', pass: false, categories: [], viewports: [], counts: { critical: 1, high: 0, medium: 2, low: 1 }, screenshots: [] },
    ],
    issues: 2,
  }
  const rows = checkVariants(check)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].variant, 'a')
  assert.equal(rows[0].findings.length, 1)
  assert.equal(rows[1].grade, 'B')
  assert.equal(pickCheckVariant(check, 'b').score, 84)
  assert.equal(pickCheckVariant(check, 'zzz').variant, 'a')

  const groups = groupFindings([{ severity: 'low' }, { severity: 'critical' }, { severity: 'high', code: 'x' }])
  assert.deepEqual(plain(groups.map((group) => group.severity)), ['critical', 'high', 'low'])
  assert.deepEqual(plain(countFindings([{ severity: 'critical' }, { severity: 'low' }, { severity: 'low' }])), { critical: 1, high: 0, medium: 0, low: 2 })
  assert.deepEqual(plain(categoryRows({ categories: [{ id: 'a11y', label: 'A11y', score: 90, weight: 0.3 }] })), [{ id: 'a11y', label: 'A11y', score: 90, weight: 0.3 }])
  assert.deepEqual(plain(viewportRows({ viewports: [{ width: 768, score: 80 }] })), [{ width: 768, score: 80, findings: [] }])
  assert.equal(findingList({ categories: [{ findings: [{ code: 'a' }] }, { findings: [{ code: 'b' }] }] }).length, 2)
})

test('project detail helpers read variant scores and rounds defensively', () => {
  const { module } = boot()
  const { variantScore, variantLabel, latestCheckRound, statusMeta, jobProgress, jobRunning } = module.__test__
  const detail = {
    project: { variantLabels: { a: '规范版' } },
    variants: [
      { id: 'a', score: null },
      { id: 'b', score: 84 },
    ],
    latestCheck: { round: 3, variants: [{ variant: 'a', score: 92 }] },
    checks: [{ round: 1 }, { round: 2 }, { round: 3 }],
  }
  assert.equal(variantScore(detail, 'a'), 92)
  assert.equal(variantScore(detail, 'b'), 84)
  assert.equal(variantScore(detail, 'c'), null)
  assert.equal(variantLabel(detail.project, 'a'), '规范版')
  assert.equal(variantLabel(detail.project, 'c'), 'C')
  assert.equal(latestCheckRound(detail), 3)
  assert.equal(latestCheckRound({ latestCheck: null, checks: [] }), null)
  assert.equal(statusMeta('ready', (key) => key).tone, 'ok')
  assert.equal(statusMeta('checked', (key) => key).tone, 'signal')
  assert.equal(statusMeta('draft', (key) => key).tone, '')
  assert.deepEqual(plain(jobProgress({ progress: 'capturing 768px' })), { pct: null, label: 'capturing 768px' })
  assert.deepEqual(plain(jobProgress({ progress: { phase: 'audit', message: 'scoring', pct: 40 } })), { pct: 40, label: 'audit · scoring' })
  assert.equal(jobRunning({ status: 'running' }), true)
  assert.equal(jobRunning({ status: 'done' }), false)
})

test('API URL helpers stay inside the frozen §4 route space', () => {
  const { module } = boot()
  const { previewUrl, fileUrl, exportFileUrl, screenshotUrl, safeJsonParse } = module.__test__
  assert.equal(previewUrl('dsg-1', 'a'), '/dsh-design-studio/preview/dsg-1/v/a')
  assert.match(fileUrl('dsg-1', '/checks/round-1/a.png'), /^\/dsh-design-studio\/api\/projects\/dsg-1\/file\?path=checks%2Fround-1%2Fa\.png$/)
  assert.match(exportFileUrl('dsg-1', 'exports/x.zip'), /^\/dsh-design-studio\/api\/projects\/dsg-1\/export-file\?path=exports%2Fx\.zip$/)
  assert.match(screenshotUrl('dsg-1', 'capture-1440.png', 2, 'a'), /checks%2Fround-2%2Fa%2Fcapture-1440\.png$/)
  assert.match(screenshotUrl('dsg-1', 'checks/round-2/a/capture-1440.png', 2, 'a'), /^.*path=checks%2Fround-2%2Fa%2Fcapture-1440\.png$/)
  assert.deepEqual(plain(safeJsonParse('{"a":1}')), { ok: true, value: { a: 1 } })
  assert.equal(safeJsonParse('{').ok, false)
})

test('dictionary entries are unique, paired and cover every kind and export card', () => {
  const { module } = boot()
  const { TEXT_ENTRIES, DICTIONARIES, KINDS, EXPORT_KINDS } = module.__test__
  const keys = TEXT_ENTRIES.map((row) => row[0])
  assert.ok(keys.length > 180)
  assert.equal(new Set(keys).size, keys.length, 'duplicate dictionary key')
  assert.equal(Object.keys(DICTIONARIES.zh).length, new Set(keys).size)
  assert.equal(Object.keys(DICTIONARIES.en).length, new Set(keys).size)
  for (const row of TEXT_ENTRIES) {
    assert.equal(row.length, 3, 'entry ' + row[0])
    assert.ok(String(row[1]).length > 0, 'missing zh for ' + row[0])
    assert.ok(String(row[2]).length > 0, 'missing en for ' + row[0])
  }
  for (const kind of KINDS) {
    assert.ok(DICTIONARIES.zh[kind.labelKey], kind.labelKey)
    assert.ok(DICTIONARIES.en[kind.labelKey], kind.labelKey)
    assert.ok(DICTIONARIES.zh[kind.hintKey], kind.hintKey)
    assert.ok(DICTIONARIES.en[kind.hintKey], kind.hintKey)
  }
  for (const item of EXPORT_KINDS) {
    assert.ok(DICTIONARIES.zh[item.labelKey] && DICTIONARIES.zh[item.descKey], item.labelKey)
    assert.ok(DICTIONARIES.en[item.labelKey] && DICTIONARIES.en[item.descKey], item.labelKey)
  }
})

test('every statically referenced translation key exists in both dictionaries', () => {
  const { module } = boot()
  const { DICTIONARIES } = module.__test__
  const source = readFileSync(new URL('../../client.js', import.meta.url), 'utf8')
  const keys = new Set()
  const pattern = /\bt\("([A-Za-z0-9_.]+)"\s*[,)]/g
  let match = pattern.exec(source)
  while (match) {
    keys.add(match[1])
    match = pattern.exec(source)
  }
  assert.ok(keys.size > 100, 'expected many static translation calls, saw ' + keys.size)
  const missing = []
  for (const key of keys) {
    if (typeof DICTIONARIES.zh[key] !== 'string' || typeof DICTIONARIES.en[key] !== 'string') missing.push(key)
  }
  assert.deepEqual(missing, [])
})

/* ---------------- v2 pure helpers ---------------- */

test('colour parsing and WCAG contrast maths', () => {
  const { module } = boot()
  const { parseCssColor, relativeLuminance, contrastRatio, contrastLevel, contrastTone } = module.__test__
  assert.deepEqual(plain(parseCssColor('#fff')), { r: 255, g: 255, b: 255, a: 1 })
  assert.deepEqual(plain(parseCssColor('#b4552f')), { r: 180, g: 85, b: 47, a: 1 })
  assert.deepEqual(plain(parseCssColor('rgba(10, 20, 30, 0.5)')), { r: 10, g: 20, b: 30, a: 0.5 })
  assert.equal(parseCssColor('transparent'), null)
  assert.equal(parseCssColor('nope'), null)
  assert.equal(relativeLuminance('#000000'), 0)
  assert.equal(Math.round(relativeLuminance('#ffffff') * 100) / 100, 1)
  assert.equal(contrastRatio('#000', '#fff'), 21)
  assert.ok(contrastRatio('#777', '#fff') > 4.4 && contrastRatio('#777', '#fff') < 4.6)
  assert.equal(contrastRatio('#fff', '#fff'), 1)
  assert.equal(contrastRatio('nope', '#fff'), null)
  assert.equal(contrastLevel(7.1), 'aaa')
  assert.equal(contrastLevel(4.6), 'aa')
  assert.equal(contrastLevel(3.2), 'large')
  assert.equal(contrastLevel(2.1), 'fail')
  assert.equal(contrastTone(8), 'ok')
  assert.equal(contrastTone(3.2), 'warn')
  assert.equal(contrastTone(1.2), 'danger')
})

test('cssFromStyles emits kebab-case declarations', () => {
  const { module } = boot()
  const { cssFromStyles } = module.__test__
  assert.equal(cssFromStyles({ backgroundColor: '#fff', fontSize: '16px', opacity: 0.5 }), 'background-color: #fff;\nfont-size: 16px;\nopacity: 0.5;')
  assert.equal(cssFromStyles(null), '')
  assert.equal(cssFromStyles({ color: '', margin: null }), '')
})

test('align math snaps a rect to every parent edge', () => {
  const { module } = boot()
  const { alignOffset, formatRect } = module.__test__
  const rect = { x: 10, y: 20, w: 100, h: 50 }
  const parent = { x: 0, y: 0, w: 400, h: 300 }
  assert.deepEqual(plain(alignOffset(rect, parent, 'left')), { dx: -10, dy: 0 })
  assert.deepEqual(plain(alignOffset(rect, parent, 'center')), { dx: 140, dy: 0 })
  assert.deepEqual(plain(alignOffset(rect, parent, 'right')), { dx: 290, dy: 0 })
  assert.deepEqual(plain(alignOffset(rect, parent, 'top')), { dx: 0, dy: -20 })
  assert.deepEqual(plain(alignOffset(rect, parent, 'middle')), { dx: 0, dy: 105 })
  assert.deepEqual(plain(alignOffset(rect, parent, 'bottom')), { dx: 0, dy: 230 })
  assert.deepEqual(plain(alignOffset(rect, parent, 'unknown')), { dx: 0, dy: 0 })
  assert.equal(formatRect({ w: 541.4, h: 200.2 }), '541 × 200')
  assert.equal(formatRect(null), '–')
})

test('layers flatten with expansion and query matching', () => {
  const { module } = boot()
  const { flattenLayers } = module.__test__
  const tree = [
    {
      selector: 'body',
      tag: 'body',
      children: [
        {
          selector: 'body > header',
          tag: 'header',
          children: [
            { selector: 'body > header > h1', tag: 'h1', text: 'Hello', children: [] },
            { selector: 'body > header > nav', tag: 'nav', children: [{ selector: 'body > header > nav > a', tag: 'a', children: [] }] },
          ],
        },
        { selector: 'body > main', tag: 'main', children: [] },
      ],
    },
  ]
  const collapsed = flattenLayers(tree, { expanded: [] })
  assert.deepEqual(plain(collapsed.map((row) => [row.key, row.depth, row.hasChildren, row.expanded])), [['body', 0, true, false]])
  const open = flattenLayers(tree, { expanded: ['body', 'body > header'] })
  assert.deepEqual(plain(open.map((row) => row.key)), ['body', 'body > header', 'body > header > h1', 'body > header > nav', 'body > main'])
  assert.deepEqual(plain(open.map((row) => row.depth)), [0, 1, 2, 2, 1])
  const query = flattenLayers(tree, { expanded: [], query: 'nav' })
  assert.deepEqual(plain(query.map((row) => row.key)), ['body', 'body > header', 'body > header > nav', 'body > header > nav > a'])
  const matchedKeys = query.filter((row) => row.matched).map((row) => row.key);
  assert.ok(matchedKeys.indexOf('body > header > nav') !== -1)
  assert.ok(matchedKeys.length >= 1)
  assert.equal(flattenLayers([], {}).length, 0)
})

test('layer lookup helpers and tag icons', () => {
  const { module } = boot()
  const { findLayerAncestors, findLayerBySelector, countLayers, layerLabel, iconForTag, layerMatches } = module.__test__
  const tree = [{ selector: 'body', tag: 'body', classes: [], children: [{ selector: 'body > div.card', tag: 'div', classes: ['card', 'wide'], children: [{ selector: 'body > div.card > h2', tag: 'h2', children: [] }] }] }]
  assert.deepEqual(plain(findLayerAncestors(tree, 'body > div.card > h2')), ['body', 'body > div.card', 'body > div.card > h2'])
  assert.deepEqual(plain(findLayerAncestors(tree, 'missing')), [])
  assert.equal(findLayerBySelector(tree, 'body > div.card > h2').tag, 'h2')
  assert.equal(findLayerBySelector(tree, 'missing'), null)
  assert.equal(countLayers(tree), 3)
  assert.equal(layerLabel({ tag: 'DIV', classes: ['card', 'wide', 'x'] }), 'div.card.wide')
  assert.equal(layerLabel({ tag: 'p', text: '  Hello   world  ' }), 'p "Hello world"')
  assert.equal(iconForTag('ul'), 'list')
  assert.equal(iconForTag('svg'), 'code')
  assert.equal(iconForTag('unknown-tag'), 'layers')
  assert.equal(layerMatches({ tag: 'div', classes: ['hero'] }, 'hero'), true)
  assert.equal(layerMatches({ tag: 'div', classes: ['hero'] }, 'footer'), false)
})

test('command palette fuzzy filtering and ordering', () => {
  const { module } = boot()
  const { filterCommands, fuzzyScore } = module.__test__
  const commands = [
    { id: 'save', label: '保存画布', keywords: 'save canvas', groupLabel: '文件' },
    { id: 'fit', label: '适应画布', keywords: 'fit', groupLabel: '缩放' },
    { id: 'grid', label: '切换 8px 网格', keywords: 'grid 网格', groupLabel: '视图' },
    { id: 'dark', label: '主题：深色', keywords: 'theme dark', groupLabel: '主题' },
  ]
  assert.equal(filterCommands(commands, '').length, 4)
  assert.deepEqual(plain(filterCommands(commands, 'grid').map((row) => row.id)), ['grid'])
  assert.deepEqual(plain(filterCommands(commands, '主题').map((row) => row.id)), ['dark'])
  assert.deepEqual(plain(filterCommands(commands, 'zzz').map((row) => row.id)), [])
  assert.ok(fuzzyScore('保存画布', '保存') > fuzzyScore('保存画布', '画'))
  assert.equal(fuzzyScore('abc', ''), 0)
  assert.equal(fuzzyScore('abc', 'z'), -1)
  assert.equal(fuzzyScore('save canvas', 'save'), 800 - 'save canvas'.length)
})

test('theme resolution, layout normalisation and panel width clamp', () => {
  const { module } = boot()
  const { resolveTheme, clampPanelWidth, normalizeLayout, DEFAULT_LAYOUT, LEFT_MIN, LEFT_MAX, RIGHT_MIN, RIGHT_MAX } = module.__test__
  assert.equal(resolveTheme('auto', true, false), 'dark')
  assert.equal(resolveTheme('auto', false, true), 'dark')
  assert.equal(resolveTheme('auto', false, false), 'light')
  assert.equal(resolveTheme('light', true, true), 'light')
  assert.equal(resolveTheme('dark', false, false), 'dark')
  assert.equal(resolveTheme('bogus', false, false), 'light')
  assert.equal(clampPanelWidth(500, LEFT_MIN, LEFT_MAX), LEFT_MAX)
  assert.equal(clampPanelWidth(10, LEFT_MIN, LEFT_MAX), LEFT_MIN)
  assert.equal(clampPanelWidth(248.4, LEFT_MIN, LEFT_MAX), 248)
  assert.equal(clampPanelWidth('x', RIGHT_MIN, RIGHT_MAX, 300), 300)
  assert.deepEqual(plain(normalizeLayout({ left: 9999, right: 10, leftCollapsed: true })), { left: LEFT_MAX, right: RIGHT_MIN, leftCollapsed: true, rightCollapsed: false })
  assert.deepEqual(plain(normalizeLayout(null)), plain(DEFAULT_LAYOUT))
})

test('zoom input parsing and preset stepping', () => {
  const { module } = boot()
  const { parseZoomInput, zoomPresetNext, ZOOM_PRESETS, ZOOM_MIN, ZOOM_MAX } = module.__test__
  assert.equal(parseZoomInput('42%', 1), 0.42)
  assert.equal(parseZoomInput('50', 1), 0.5)
  assert.equal(parseZoomInput('bad', 0.75), 0.75)
  assert.equal(parseZoomInput('', 1), 1)
  assert.equal(zoomPresetNext(1, 'in'), 1.5)
  assert.equal(zoomPresetNext(1, 'out'), 0.75)
  assert.equal(zoomPresetNext(1.1, 'out'), 1)
  assert.equal(zoomPresetNext(ZOOM_MAX, 'in'), ZOOM_MAX)
  assert.equal(zoomPresetNext(ZOOM_MIN, 'out'), ZOOM_MIN)
  assert.ok(ZOOM_PRESETS.indexOf(1) !== -1)
})

/* ---------------- v1.2 requirement flow (UX-MAP §6) ---------------- */

test('brief draft / filled / dirty helpers normalise all five fields', () => {
  const { module } = boot()
  const { briefDraftFrom, briefIsFilled, briefEquals } = module.__test__
  const draft = briefDraftFrom({ goal: '做一个落地页' })
  assert.deepEqual(plain(draft), { goal: '做一个落地页', audience: '', layout: '', content: '', constraints: '' })
  assert.equal(briefIsFilled({}), false)
  assert.equal(briefIsFilled(null), false)
  assert.equal(briefIsFilled({ audience: '运营' }), true)
  assert.equal(briefEquals({ goal: 'a' }, { goal: 'a' }), true)
  assert.equal(briefEquals({ goal: 'a' }, { goal: 'b' }), false)
  assert.equal(briefEquals({ goal: 'a', constraints: 'x' }, { goal: 'a' }), false)
  assert.equal(briefEquals(null, {}), true)
})

test('handoff prompt builders follow the UX-MAP §6 template', () => {
  const { module } = boot()
  const { buildHandoffPrompt, buildIssuesPrompt, buildCommentsPrompt } = module.__test__
  const project = { name: '盐线', id: 'dsg-1', kind: 'web' }
  const prompt = buildHandoffPrompt({ project, variant: 'b', selector: '#hero > h1', openComments: 2, openIssues: 3, requirement: ' 再加一屏客户评价 ' })
  assert.ok(prompt.startsWith('【设计台】项目 盐线（dsg-1），类型 web'))
  assert.ok(prompt.indexOf('当前变体：b；选中元素：#hero > h1；未解决评论：2；未修复问题：3') !== -1)
  assert.ok(prompt.indexOf('需求：再加一屏客户评价') !== -1)
  assert.ok(prompt.indexOf('design/b.html') !== -1)
  assert.ok(prompt.indexOf('design_check') !== -1 && prompt.indexOf('design_export') !== -1)
  assert.ok(buildHandoffPrompt({ project, variant: 'a' }).indexOf('需求：（未填写）') !== -1)

  const issuesPrompt = buildIssuesPrompt({
    project,
    variant: 'a',
    issues: [
      { severity: 'critical', code: 'contrast', message: '文字对比度不足', fix: '提高对比度', selector: '.caption' },
      { severity: 'low', code: 'spacing', message: '间距不在 4px 网格', fix: '改成 8px' },
    ],
  })
  assert.ok(issuesPrompt.indexOf('本轮质检问题（2）') !== -1)
  assert.ok(issuesPrompt.indexOf('[critical] contrast — 文字对比度不足（修法：提高对比度） 选择器：.caption') !== -1)
  assert.ok(issuesPrompt.indexOf('[low] spacing') !== -1)

  const commentsPrompt = buildCommentsPrompt({
    project,
    variant: 'b',
    comments: [
      { id: 'c-1', variant: 'a', selector: '#hero', note: '标题小一档', element: { text: '运营仪表盘' } },
      { id: 'c-2', variant: 'a', selector: '#footer', note: '已处理', resolvedAt: '2026-01-01' },
    ],
  })
  assert.ok(commentsPrompt.indexOf('未解决评论（1）') !== -1)
  assert.ok(commentsPrompt.indexOf('标题小一档') !== -1)
  assert.ok(commentsPrompt.indexOf('已处理') === -1)
  assert.ok(commentsPrompt.indexOf('design_comments resolve') !== -1)
})

test('flow derivation highlights current stage and next action', () => {
  const { module } = boot()
  const { deriveFlow } = module.__test__
  const empty = deriveFlow({ project: { brief: {} }, variants: [], comments: [], versions: [], exports: [] })
  assert.equal(empty.stages.length, 6)
  assert.deepEqual(plain(empty.stages.map((stage) => stage.id)), ['brief', 'context', 'variants', 'iterate', 'check', 'export'])
  assert.equal(empty.currentId, 'brief')
  assert.equal(empty.nextId, 'context')
  assert.equal(empty.allDone, false)
  assert.equal(empty.stages[0].done, false)

  const almost = deriveFlow({
    project: { brief: { goal: '做仪表盘' }, system: { name: 'x' }, bestScore: 96 },
    variants: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    comments: [],
    latestCheck: { round: 1, score: 96 },
    versions: [],
    exports: [],
  })
  assert.equal(almost.currentId, 'export')
  assert.equal(almost.stages[0].done, true)
  assert.equal(almost.stages[4].done, true)
  assert.equal(almost.stages[5].done, false)

  const done = deriveFlow({
    project: { brief: { goal: 'x' }, context: [{ kind: 'url' }], bestScore: 92 },
    variants: [{ id: 'a' }, { id: 'b' }],
    comments: [],
    latestCheck: { round: 2, score: 92 },
    versions: [],
    exports: [{ kind: 'html' }],
  })
  assert.equal(done.allDone, true)
  assert.equal(done.currentId, '')
  assert.equal(done.nextId, '')
})

test('context chips serialise the attached requirement context', () => {
  const { module } = boot()
  const { contextChips, serializeContext, makeT } = module.__test__
  const t = makeT('zh')
  const chips = contextChips({ variant: 'b', selector: '#app > header > h1', openComments: 2, openIssues: 0 }, t)
  assert.deepEqual(plain(chips.map((chip) => chip.id)), ['variant', 'selection', 'comments'])
  assert.equal(chips[0].label, '变体 B')
  assert.equal(chips[1].label, '选中 … > header > h1')
  assert.equal(chips[2].label, '未解决评论 2')
  const withIssues = contextChips({ variant: 'a', selector: '', openComments: 0, openIssues: 3 }, t)
  assert.equal(withIssues.filter((chip) => chip.id === 'selection')[0].label, '无选中元素')
  assert.equal(withIssues.filter((chip) => chip.id === 'issues')[0].label, '待修问题 3')
  const serialized = serializeContext({ variant: 'b', selector: '#hero', openComments: 2, openIssues: 3 })
  assert.equal(serialized, '当前变体：b；选中元素：#hero；未解决评论：2；未修复问题：3')
})

test('handoff plan falls back gracefully without the chat layout service', () => {
  const { module } = boot()
  const { handoffPlan } = module.__test__
  const ok = handoffPlan({ prompt: '【设计台】x', hasLayout: true })
  assert.deepEqual(plain(ok), { ok: true, copy: true, switchPanel: true, toastKey: 'handoffCopied' })
  const fallback = handoffPlan({ prompt: '需求', hasLayout: false })
  assert.deepEqual(plain(fallback), { ok: true, copy: true, switchPanel: false, toastKey: 'handoffCopiedNoLayout' })
  const empty = handoffPlan({ prompt: '   ', hasLayout: true })
  assert.equal(empty.ok, false)
  assert.equal(empty.copy, false)
  assert.equal(empty.toastKey, 'handoffPromptMissing')
})

test('onboarding flag is remembered through localStorage', () => {
  const { module } = boot()
  const { readOnboarded, markOnboarded, ONBOARD_KEY } = module.__test__
  assert.equal(ONBOARD_KEY, 'dsh-design-studio.onboarded')
  assert.equal(readOnboarded(), false)
  markOnboarded()
  assert.equal(readOnboarded(), true)
})

/* ---------------- v1.3 start wizard + intake ---------------- */

test('fallback intake question set covers the six FLOW groups', () => {
  const { module } = boot()
  const { fallbackIntakeGroups } = module.__test__
  const groups = fallbackIntakeGroups()
  assert.equal(groups.length, 6)
  assert.deepEqual(plain(groups.map((group) => group.id)), ['basics', 'audience', 'context', 'variants', 'tweaks', 'delivery'])
  const questions = groups.flatMap((group) => group.questions)
  assert.equal(questions.length, 17)
  const required = questions.filter((question) => question.required).map((question) => question.id)
  assert.deepEqual(plain(required), ['kind', 'goal', 'audience', 'contextSources', 'variationsCount', 'dimensions'])
  assert.equal(questions.filter((question) => question.id === 'range')[0].type, 'range')
  assert.equal(questions.filter((question) => question.id === 'contextSources')[0].options.length, 5)
  // a fresh copy each call (wizard mutates nothing shared)
  assert.notEqual(fallbackIntakeGroups()[0], fallbackIntakeGroups()[0])
})

test('host intake questions normalise into the wizard shape', () => {
  const { module } = boot()
  const { normalizeIntakeGroups, fallbackIntakeGroups } = module.__test__
  assert.equal(normalizeIntakeGroups(null).length, 6)
  assert.equal(normalizeIntakeGroups([]).length, 6)
  const normalized = normalizeIntakeGroups([
    {
      id: 'custom',
      title: '自定义',
      questions: [
        { id: 'goal', label: '目标', type: 'textarea', required: true, hint: '一句话' },
        { id: 'chips', label: '多选', type: 'multiselect', options: ['a', { value: 'b', label: 'B' }] },
      ],
    },
  ])
  assert.equal(normalized.length, 1)
  assert.equal(normalized[0].title, '自定义')
  assert.equal(normalized[0].questions[0].required, true)
  assert.deepEqual(plain(normalized[0].questions[1].options), [{ value: 'a', label: 'a' }, { value: 'b', label: 'B' }])
  assert.equal(normalizeIntakeGroups([{ id: 'g', questions: [] }]).length, 6)
  assert.ok(fallbackIntakeGroups().length === 6)
})

test('wizard reducer answers, navigates, delegates and skips', () => {
  const { module } = boot()
  const { wizardReduce, fallbackIntakeGroups } = module.__test__
  const groups = fallbackIntakeGroups()
  let state = { step: 0, answers: {}, delegated: [] }
  state = wizardReduce(state, { type: 'answer', id: 'kind', value: 'web' })
  assert.equal(state.answers.kind, 'web')
  state = wizardReduce(state, { type: 'next', total: 6 })
  assert.equal(state.step, 1)
  state = wizardReduce(state, { type: 'back' })
  assert.equal(state.step, 0)
  state = wizardReduce(state, { type: 'goto', step: 4 })
  assert.equal(state.step, 4)
  state = wizardReduce(state, { type: 'skipStep', questions: groups[4].questions })
  assert.equal(state.step, 5)
  state = wizardReduce(state, { type: 'delegate', id: 'goal' })
  assert.ok(state.delegated.indexOf('goal') !== -1)
  state = wizardReduce(state, { type: 'answer', id: 'goal', value: '做一个落地页' })
  assert.ok(state.delegated.indexOf('goal') === -1)
  assert.equal(state.answers.goal, '做一个落地页')
  assert.equal(wizardReduce({ step: 0, answers: {}, delegated: [] }, { type: 'next', total: 6 }).step, 1)
})

test('wizard validation and open-question collection', () => {
  const { module } = boot()
  const { validateWizardStep, collectOpenQuestions, fallbackIntakeGroups, makeT } = module.__test__
  const t = makeT('zh')
  const groups = fallbackIntakeGroups()
  const basics = groups[0].questions
  assert.deepEqual(plain(validateWizardStep(basics, {}, [])), ['kind', 'goal'])
  assert.deepEqual(plain(validateWizardStep(basics, { kind: 'web', goal: 'x' }, [])), [])
  assert.deepEqual(plain(validateWizardStep(basics, { kind: 'web' }, ['goal'])), [])
  const open = collectOpenQuestions(groups, { kind: 'web' }, ['goal'], t)
  assert.ok(open.indexOf(t('qGoal')) !== -1)
  const answered = collectOpenQuestions(groups, { kind: 'web', goal: 'x' }, [], t)
  assert.ok(answered.indexOf(t('qGoal')) === -1)
  assert.ok(answered.length > 0)
})

test('answers map into brief and the intake schema, and back', () => {
  const { module } = boot()
  const { answersToBrief, answersToIntake, answersFromIntake, fallbackIntakeGroups } = module.__test__
  const answers = {
    kind: 'web',
    goal: '  做一个运营仪表盘落地页  ',
    audience: '运营团队',
    scenario: '周会大屏',
    tone: '克制',
    contextSources: ['existing-design-system', 'url'],
    references: 'https://example.com/a\n\nhttps://example.com/b',
    brandConstraints: '强调色 #b4552f',
    variationsCount: '3',
    dimensions: ['visual', 'layout'],
    range: 80,
    tweaks: ['color'],
    contentMust: '真实指标',
    contentAvoid: '不要假头像',
    deliverables: ['html', 'pdf'],
    responsive: ['desktop'],
    success: ['check>=90'],
  }
  const brief = answersToBrief(answers)
  assert.equal(brief.goal, '做一个运营仪表盘落地页')
  assert.equal(brief.audience, '运营团队')
  assert.equal(brief.content, '真实指标')
  assert.equal(brief.constraints, '强调色 #b4552f\n不要假头像')
  const intake = answersToIntake(answers, { groups: fallbackIntakeGroups(), now: '2026-11-08T00:00:00.000Z', delegated: [] })
  assert.equal(intake.kind, 'web')
  assert.equal(intake.audience, '运营团队 · 周会大屏 · 克制')
  assert.deepEqual(plain(intake.contextSources), ['existing-design-system', 'url'])
  assert.deepEqual(plain(intake.references), ['https://example.com/a', 'https://example.com/b'])
  assert.deepEqual(plain(intake.variations), { count: 3, dimensions: ['visual', 'layout'], range: 'avant-garde' })
  assert.equal(intake.completedAt, '2026-11-08T00:00:00.000Z')
  assert.equal(intake.source, 'wizard')
  const back = answersFromIntake(intake)
  assert.equal(back.goal, '做一个运营仪表盘落地页')
  assert.equal(back.variationsCount, '3')
  assert.equal(back.range, 90)
  assert.equal(back.references, 'https://example.com/a\nhttps://example.com/b')
  assert.equal(answersToIntake({ goal: 'x' }, {}).variations.count, 3)
})

test('answersToIntake / answersFromIntake bridge host-bank ids and option labels', () => {
  const { module } = boot()
  const { answersToIntake, answersFromIntake, fallbackIntakeGroups } = module.__test__
  const hostAnswers = {
    kind: 'web',
    goal: '港口值班台',
    audience: 'B2B 港务',
    contextSources: ['existing-design-system'],
    variationsCount: '3',
    variationDimensions: ['visual', 'layout'],
    variationRange: '规则→前卫',
    tweaks: ['toggle', 'toggles', 'color'],
    deliverables: ['html'],
  }
  const intake = answersToIntake(hostAnswers, { groups: fallbackIntakeGroups(), now: '2026-11-08T00:00:00.000Z', delegated: [] })
  assert.deepEqual(plain(intake.variations), { count: 3, dimensions: ['visual', 'layout'], range: 'balanced' })
  assert.deepEqual(plain(intake.tweaks), ['toggle', 'color'])
  const back = answersFromIntake(intake)
  assert.deepEqual(plain(back.variationDimensions), ['visual', 'layout'])
  assert.deepEqual(plain(back.dimensions), ['visual', 'layout'])
  assert.equal(back.variationRange, '规则→前卫')
  assert.equal(back.range, 50)
  // The fallback bank's numeric slider maps to the same canonical labels.
  assert.equal(answersToIntake({ goal: 'x', range: 15 }).variations.range, 'basic')
  assert.equal(answersToIntake({ goal: 'x', range: 90 }).variations.range, 'avant-garde')
  assert.equal(answersToIntake({ goal: 'x' }).variations.range, 'balanced')
})

test('intake merge, completeness and summary groups', () => {
  const { module } = boot()
  const { mergeIntake, intakeCompleteness, intakeSummaryGroups, makeT } = module.__test__
  const merged = mergeIntake(
    { goal: 'a', contextSources: ['url'], source: 'wizard', completedAt: '2026-01-01T00:00:00.000Z', variations: { count: 3, dimensions: ['visual'] } },
    { goal: 'b', contextSources: ['repo'], source: 'agent', variations: { range: 'bold' }, tweaks: ['color'] },
  )
  assert.equal(merged.goal, 'b')
  assert.deepEqual(plain(merged.contextSources), ['url', 'repo'])
  assert.deepEqual(plain(merged.variations), { count: 3, dimensions: ['visual'], range: 'bold' })
  assert.equal(merged.source, 'mixed')
  assert.equal(merged.completedAt, '2026-01-01T00:00:00.000Z')
  assert.deepEqual(plain(intakeCompleteness(null)), { percent: 0, answered: 0, total: 12 })
  const partial = intakeCompleteness({ kind: 'web', goal: 'x', contextSources: ['url'], variations: { count: 3 } })
  assert.ok(partial.percent > 0 && partial.percent < 100)
  assert.equal(intakeCompleteness({ kind: 'web', goal: 'x', audience: 'a', contextSources: ['url'], brandConstraints: 'b', variations: { count: 3 }, tweaks: ['color'], contentMust: 'c', contentAvoid: 'd', deliverables: ['html'], responsive: ['desktop'], success: ['check>=90'] }).percent, 100)
  const t = makeT('zh')
  const groups = intakeSummaryGroups({ goal: '目标', contextSources: ['url'], variations: { count: 2, dimensions: ['visual'], range: 'basic' }, tweaks: ['color'], deliverables: ['html'] }, t)
  assert.deepEqual(plain(groups.map((group) => group.id)), ['basics', 'context', 'variants', 'tweaks', 'delivery'])
  assert.ok(groups[2].items.indexOf('2 档') !== -1)
})

test('start prompt lists confirmed intake and open questions', () => {
  const { module } = boot()
  const { buildStartPrompt } = module.__test__
  const prompt = buildStartPrompt({
    project: { id: 'dsg-1', name: '盐线' },
    intake: {
      kind: 'web',
      goal: '运营仪表盘',
      audience: '运营团队 · 周会',
      contextSources: ['url'],
      references: ['https://example.com'],
      variations: { count: 3, dimensions: ['visual', 'layout'], range: 'balanced' },
      tweaks: ['color'],
      contentMust: '真实指标',
      deliverables: ['html'],
      success: ['check>=90'],
    },
    openQuestions: ['语气是否可以更锋利？'],
  })
  assert.ok(prompt.startsWith('【设计台】开始一个新设计'))
  assert.ok(prompt.indexOf('项目：盐线（dsg-1），类型 web') !== -1)
  assert.ok(prompt.indexOf('已确认信息：') !== -1)
  assert.ok(prompt.indexOf('- 目标：运营仪表盘') !== -1)
  assert.ok(prompt.indexOf('3 档 · visual / layout · 偏好 balanced') !== -1)
  assert.ok(prompt.indexOf('请先追问以下未确认项（≤8 个）：') !== -1)
  assert.ok(prompt.indexOf('1. 语气是否可以更锋利？') !== -1)
  assert.ok(prompt.indexOf('design_start（带 intake）') !== -1)
  const noOpen = buildStartPrompt({ project: { id: 'x' }, intake: { kind: 'poster' }, openQuestions: [] })
  assert.ok(noOpen.indexOf('没有未确认项，可以直接开始。') !== -1)
})

test('flow derivation treats a completed intake as the start stage', () => {
  const { module } = boot()
  const { deriveFlow } = module.__test__
  const intakeOnly = deriveFlow({
    project: { intake: { completedAt: '2026-11-08T00:00:00.000Z' } },
    variants: [],
    comments: [],
    versions: [],
    exports: [],
  })
  assert.equal(intakeOnly.stages[0].done, true)
  assert.equal(intakeOnly.currentId, 'context')
  const intakeNoStamp = deriveFlow({ project: { intake: {} }, variants: [], comments: [], versions: [], exports: [] })
  assert.equal(intakeNoStamp.stages[0].done, false)
})
