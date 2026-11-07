/**
 * Unit tests for lib/intake.js — question bank, normalisation, merge, summary.
 * Run: node --test test/unit/intake.test.mjs
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  INTAKE_DELIVERABLES,
  INTAKE_QUESTIONS,
  INTAKE_SOURCES,
  intakeCompleteness,
  intakeQuestionList,
  intakeSummary,
  mergeIntake,
  normalizeIntake,
} from '../../lib/intake.js'

/** A complete, valid intake used by several tests. */
const FULL = {
  kind: 'web',
  goal: '做一个运营仪表盘落地页',
  audience: 'B2B 运营负责人，桌面端为主',
  contextSources: ['existing-design-system', 'url'],
  references: ['https://example.com/pricing'],
  brandConstraints: '主色 #b4552f，衬线标题，禁止紫色渐变',
  variations: { count: 3, dimensions: ['visual', 'layout'], range: '基础→进阶' },
  tweaks: ['color', 'spacing'],
  contentMust: '价格三档、真实客户 Logo',
  contentAvoid: '不要假评价、不要 lorem ipsum',
  deliverables: ['html', 'pdf'],
  responsive: ['desktop', 'mobile'],
  success: ['check>=90', 'no-overflow'],
  openQuestions: ['目标市场待定'],
  completedAt: '2026-11-08T03:00:00.000Z',
  source: 'wizard',
}

test('the question bank has six canonical groups and a stable question shape', () => {
  assert.equal(INTAKE_QUESTIONS.length, 6)
  assert.deepEqual(
    INTAKE_QUESTIONS.map((group) => group.id),
    ['start', 'audience', 'context', 'variations', 'tweaks', 'delivery'],
  )
  const ids = new Set()
  let total = 0
  for (const group of INTAKE_QUESTIONS) {
    assert.ok(typeof group.title === 'string' && group.title.length > 0)
    assert.ok(group.questions.length >= 1, `${group.id} has questions`)
    for (const question of group.questions) {
      total += 1
      ids.add(question.id)
      assert.ok(typeof question.id === 'string' && question.id.length > 0)
      assert.ok(typeof question.label === 'string' && question.label.length > 0)
      assert.ok(['single', 'multi', 'text'].includes(question.type), `${question.id} type`)
      assert.ok(Array.isArray(question.options))
      if (question.type === 'text') assert.equal(question.options.length, 0)
      else assert.ok(question.options.length > 0, `${question.id} options`)
      assert.equal(typeof question.required, 'boolean')
      assert.equal(typeof question.allowSkip, 'boolean')
      assert.ok(typeof question.hint === 'string')
      assert.equal(question.group, undefined, 'public questions do not leak group (it is added by the flat list)')
    }
  }
  assert.ok(total >= 10, `bank must have at least 10 questions (has ${total})`)
  assert.equal(ids.size, total, 'question ids are unique')
  const flat = intakeQuestionList()
  assert.equal(flat.length, total)
  assert.ok(flat.every((question) => typeof question.group === 'string'))
  const byId = new Map(flat.map((question) => [question.id, question]))
  assert.deepEqual(byId.get('kind').options, ['web', 'mobile', 'deck', 'poster', 'doc'])
  assert.deepEqual(byId.get('contextSources').options, ['existing-design-system', 'url', 'repo', 'screenshots', 'none'])
  assert.deepEqual(byId.get('deliverables').options, [...INTAKE_DELIVERABLES])
  assert.equal(byId.get('kind').required, true)
  assert.equal(byId.get('contentAvoid').allowSkip, true)
})

test('normalizeIntake fills every field with safe defaults', () => {
  const empty = normalizeIntake(undefined)
  assert.deepEqual(Object.keys(empty), [
    'kind',
    'goal',
    'audience',
    'contextSources',
    'references',
    'brandConstraints',
    'variations',
    'tweaks',
    'contentMust',
    'contentAvoid',
    'deliverables',
    'responsive',
    'success',
    'openQuestions',
    'completedAt',
    'source',
  ])
  assert.equal(empty.kind, '')
  assert.equal(empty.goal, '')
  assert.deepEqual(empty.contextSources, [])
  assert.deepEqual(empty.variations, { count: 3, dimensions: [], range: '' })
  assert.equal(empty.completedAt, '')
  assert.equal(empty.source, '')
  // non-object input never throws
  for (const value of [null, 42, 'text', [], true]) assert.doesNotThrow(() => normalizeIntake(value))
})

test('normalizeIntake trims, caps, dedupes and filters by type', () => {
  const intake = normalizeIntake({
    kind: '  DECK ',
    goal: `  ${'g'.repeat(3000)}  `,
    audience: 42,
    contextSources: ['url', 'URL', 'repo', 'bogus', 'url'],
    references: 'https://a.example/x\nhttps://b.example/y, https://a.example/x',
    brandConstraints: null,
    variations: { count: 9, dimensions: ['visual', 'visual', 'nope'], range: '  基础→进阶  ' },
    tweaks: ['color', 'Color', 'sound'],
    deliverables: ['html', 'docx', 'pdf'],
    responsive: ['desktop', 'watch'],
    success: 'check>=90, no-overflow',
    completedAt: 'not-a-date',
    source: 'robot',
    unknownKey: 'dropped',
  })
  assert.equal(intake.kind, 'deck')
  assert.equal(intake.goal.length, 2000)
  assert.equal(intake.audience, '')
  assert.deepEqual(intake.contextSources, ['url', 'repo'])
  assert.deepEqual(intake.references, ['https://a.example/x', 'https://b.example/y'])
  assert.equal(intake.brandConstraints, '')
  assert.deepEqual(intake.variations, { count: 3, dimensions: ['visual'], range: '基础→进阶' })
  assert.deepEqual(intake.tweaks, ['color'])
  assert.deepEqual(intake.deliverables, ['html', 'pdf'])
  assert.deepEqual(intake.responsive, ['desktop'])
  assert.deepEqual(intake.success, ['check>=90', 'no-overflow'])
  assert.equal(intake.completedAt, '')
  assert.equal(intake.source, '')
  assert.equal(intake.unknownKey, undefined)
})

test('normalizeIntake accepts the flat variation aliases and keeps limits', () => {
  const intake = normalizeIntake({ variationsCount: '4', variationDimensions: ['layout', 'motion'], variationRange: '规则→前卫' })
  assert.deepEqual(intake.variations, { count: 4, dimensions: ['layout', 'motion'], range: '规则→前卫' })
  const tooMany = normalizeIntake({ references: Array.from({ length: 30 }, (_, index) => `https://x${index}.example`) })
  assert.equal(tooMany.references.length, 12)
})

test('mergeIntake keeps old answers for absent keys and replaces provided ones', () => {
  const base = normalizeIntake({ ...FULL, source: 'wizard' })
  const merged = mergeIntake(base, { goal: '改成报价页', tweaks: ['copy'], variations: { dimensions: ['motion'] } })
  assert.equal(merged.goal, '改成报价页')
  assert.deepEqual(merged.tweaks, ['copy'])
  assert.equal(merged.audience, base.audience, 'absent keys keep their value')
  assert.equal(merged.kind, 'web')
  assert.equal(merged.variations.count, 3, 'nested merge keeps count')
  assert.equal(merged.variations.range, base.variations.range)
  assert.deepEqual(merged.variations.dimensions, ['motion'])
  // Aliases merge the same way.
  const aliased = mergeIntake(base, { variationsCount: 2 })
  assert.equal(aliased.variations.count, 2)
  assert.deepEqual(aliased.variations.dimensions, base.variations.dimensions)
  // A non-object patch is a no-op, never a throw.
  assert.deepEqual(mergeIntake(base, null), base)
})

test('intakeCompleteness scores required questions higher and reports missing ids', () => {
  const empty = intakeCompleteness({})
  assert.ok(empty.score >= 0 && empty.score < 20, `empty score ${empty.score}`)
  assert.ok(empty.missing.includes('goal'))
  assert.ok(empty.missing.includes('audience'))
  assert.ok(!empty.filled.includes('goal'))
  const half = intakeCompleteness({ kind: 'web', goal: '做落地页' })
  assert.ok(half.score > empty.score)
  assert.ok(half.filled.includes('kind') && half.filled.includes('goal'))
  assert.ok(half.missing.includes('audience'))
  const full = intakeCompleteness(FULL)
  assert.equal(full.score, 100)
  assert.deepEqual(full.missing, [])
  assert.ok(full.filled.length >= 10)
  // Every reported id belongs to the question bank.
  const ids = new Set(intakeQuestionList().map((question) => question.id))
  for (const id of [...empty.missing, ...half.filled, ...full.filled]) assert.ok(ids.has(id), id)
})

test('intakeSummary renders a bounded handoff-ready block', () => {
  const summary = intakeSummary(FULL)
  assert.match(summary, /类型：web/u)
  assert.match(summary, /目标：做一个运营仪表盘落地页/u)
  assert.match(summary, /受众\/场景/u)
  assert.match(summary, /变体：3 档 · visual、layout · 基础→进阶/u)
  assert.match(summary, /交付格式：html、pdf/u)
  assert.match(summary, /完整度：100%/u)
  assert.doesNotMatch(summary, /undefined/u)
  assert.ok(summary.length < 4000)
  const empty = intakeSummary({})
  assert.match(empty, /完整度：/u)
  assert.doesNotMatch(empty, /目标：/u)
})

test('the question bank covers every persisted intake field', () => {
  const normalised = normalizeIntake(FULL)
  for (const key of ['kind', 'goal', 'audience', 'contextSources', 'references', 'brandConstraints', 'tweaks', 'contentMust', 'contentAvoid', 'deliverables', 'responsive', 'success', 'openQuestions']) {
    assert.ok(Object.prototype.hasOwnProperty.call(normalised, key), key)
  }
  assert.deepEqual(normalised.variations, FULL.variations)
  assert.equal(INTAKE_SOURCES.includes('wizard'), true)
})
