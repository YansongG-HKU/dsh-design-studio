/**
 * Unit tests for lib/pptx.js — package parts, content types, relationships,
 * 16:9 canvas, per-slide media and XML well-formedness.
 *
 * Run: node --test test/unit/pptx.test.mjs
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { encodePng } from '../../lib/png.js'
import { createPptx } from '../../lib/pptx.js'
import { assertRelationshipsResolve, entryOf, readZip, xmlProblems } from '../fixtures/zip-reader.mjs'

/** Build a tiny solid-colour PNG. */
function pngOf(r, g, b, width = 4, height = 4) {
  const rgba = new Uint8Array(width * height * 4)
  for (let index = 0; index < width * height; index += 1) {
    rgba[index * 4] = r
    rgba[index * 4 + 1] = g
    rgba[index * 4 + 2] = b
    rgba[index * 4 + 3] = 255
  }
  return encodePng(rgba, width, height)
}

/** The package parts every PPTX must contain. */
const REQUIRED_PARTS = [
  '[Content_Types].xml',
  '_rels/.rels',
  'docProps/core.xml',
  'docProps/app.xml',
  'ppt/presentation.xml',
  'ppt/_rels/presentation.xml.rels',
  'ppt/slideMasters/slideMaster1.xml',
  'ppt/slideMasters/_rels/slideMaster1.xml.rels',
  'ppt/slideLayouts/slideLayout1.xml',
  'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
  'ppt/theme/theme1.xml',
]

test('createPptx builds the required OOXML parts for every slide', () => {
  const png1 = pngOf(250, 249, 246)
  const png2 = pngOf(168, 64, 28)
  const buffer = createPptx({
    title: '潮汐季报 & <封面>',
    slides: [
      { png: png1, width: 1920, height: 1080 },
      { png: png2, width: 1920, height: 1080 },
    ],
  })
  assert.ok(Buffer.isBuffer(buffer))
  const zip = readZip(buffer)
  for (const name of REQUIRED_PARTS) entryOf(zip, name)
  entryOf(zip, 'ppt/slides/slide1.xml')
  entryOf(zip, 'ppt/slides/slide2.xml')
  entryOf(zip, 'ppt/slides/_rels/slide1.xml.rels')
  entryOf(zip, 'ppt/slides/_rels/slide2.xml.rels')
  assert.deepEqual(entryOf(zip, 'ppt/media/image1.png').content, png1)
  assert.deepEqual(entryOf(zip, 'ppt/media/image2.png').content, png2)
  assert.equal(zip.count, REQUIRED_PARTS.length + 3 * 2)
})

test('every XML part is well formed and every relationship resolves', () => {
  const zip = readZip(createPptx({ slides: [{ png: pngOf(20, 30, 40) }] }))
  for (const entry of zip.entries) {
    if (!entry.name.endsWith('.xml') && !entry.name.endsWith('.rels')) continue
    const text = entry.content.toString('utf8')
    assert.ok(text.startsWith('<?xml'), entry.name + ' must start with the XML prolog')
    assert.deepEqual(xmlProblems(text), [], entry.name + ' is not well formed')
  }
  assertRelationshipsResolve(zip)
})

test('presentation.xml uses the 16:9 canvas and lists every slide', () => {
  const zip = readZip(createPptx({ slides: [{ png: pngOf(1, 2, 3) }, { png: pngOf(4, 5, 6) }, { png: pngOf(7, 8, 9) }] }))
  const presentation = entryOf(zip, 'ppt/presentation.xml').content.toString('utf8')
  assert.match(presentation, /<p:sldSz cx="12192000" cy="6858000"/u)
  assert.match(presentation, /<p:notesSz cx="6858000" cy="9144000"/u)
  assert.equal((presentation.match(/<p:sldId id=/gu) ?? []).length, 3)
  const rels = entryOf(zip, 'ppt/_rels/presentation.xml.rels').content.toString('utf8')
  assert.equal((rels.match(/Type="[^"]*\/slide"/gu) ?? []).length, 3)
  assert.match(rels, /Type="[^"]*\/slideMaster"/u)
})

test('each slide places its image full-bleed and the content types list every slide', () => {
  const zip = readZip(createPptx({ slides: [{ png: pngOf(9, 9, 9) }, { png: pngOf(8, 8, 8) }] }))
  for (const index of [1, 2]) {
    const slide = entryOf(zip, 'ppt/slides/slide' + index + '.xml').content.toString('utf8')
    assert.match(slide, /<a:blip r:embed="rId2"\/>/u)
    assert.match(slide, new RegExp('<a:ext cx="12192000" cy="6858000"/>', 'u'))
    const rels = entryOf(zip, 'ppt/slides/_rels/slide' + index + '.xml.rels').content.toString('utf8')
    assert.match(rels, new RegExp('Target="..\/media\/image' + index + '.png"', 'u'))
    assert.match(rels, /Type="[^"]*\/slideLayout"/u)
  }
  const contentTypes = entryOf(zip, '[Content_Types].xml').content.toString('utf8')
  assert.match(contentTypes, /PartName="\/ppt\/slides\/slide1.xml"/u)
  assert.match(contentTypes, /PartName="\/ppt\/slides\/slide2.xml"/u)
  assert.match(contentTypes, /Default Extension="png" ContentType="image\/png"/u)
})

test('the title is escaped in the core properties', () => {
  const zip = readZip(createPptx({ title: 'A & B <C> "D"', slides: [{ png: pngOf(1, 1, 1) }] }))
  const core = entryOf(zip, 'docProps/core.xml').content.toString('utf8')
  assert.ok(core.includes('A &amp; B &lt;C&gt; &quot;D&quot;'))
  assert.ok(!core.includes('<C>'))
})

test('createPptx rejects empty and malformed slide lists', () => {
  assert.throws(() => createPptx({ slides: [] }), (error) => error.code === 'invalid_input')
  assert.throws(() => createPptx({}), (error) => error.code === 'invalid_input')
  assert.throws(() => createPptx({ slides: [{ width: 10 }] }), (error) => error.code === 'invalid_input')
  assert.throws(() => createPptx({ slides: [{ png: Buffer.alloc(0) }] }), (error) => error.code === 'invalid_input')
})

test('a single-slide deck parses with exactly one media part', () => {
  const zip = readZip(createPptx({ slides: [{ png: pngOf(100, 100, 100) }] }))
  assert.equal(zip.entries.filter((entry) => entry.name.startsWith('ppt/media/')).length, 1)
  assert.equal(zip.entries.filter((entry) => entry.name.startsWith('ppt/slides/slide')).length, 1)
})
