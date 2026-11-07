/**
 * Unit tests for lib/scaffolds.js, the locale files, the icon and the docs
 * resources owned by `content-display` (CONTRACT §3 and §6).
 *
 * The scaffolds are content, not logic, so these tests assert the content
 * contract precisely: every id returns one self-contained HTML document with
 * the Claude edit-mode protocol, no external requests, and the per-kind extras
 * (deck screens / print CSS, A3 poster, A4 document). The writer tests run in a
 * throwaway temp directory and never touch a real project.
 */

import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_SCAFFOLD_BY_KIND,
  SCAFFOLDS,
  scaffoldContent,
  scaffoldForKind,
  scaffoldMeta,
  writeScaffold,
} from '../../lib/scaffolds.js'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const IDS = ['browser', 'ios', 'android', 'macos', 'deck', 'canvas', 'tweaks', 'anim', 'poster', 'doc']
const KINDS = new Set(['web', 'mobile', 'deck', 'poster', 'doc'])
const tempDirs = []

/** Read a plugin resource as UTF-8. */
async function readResource(relative) {
  return readFile(join(ROOT, relative), 'utf8')
}

/** Create a throwaway directory that is removed after the suite. */
async function scratchDir() {
  const dir = await mkdtemp(join(tmpdir(), 'dsg-scaffolds-'))
  tempDirs.push(dir)
  return dir
}

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true })
  }
})

describe('registry metadata', () => {
  it('registers exactly the ten contract ids in order', () => {
    assert.deepEqual(SCAFFOLDS.map((row) => row.id), IDS)
  })

  it('gives every row a valid, complete, frozen metadata shape', () => {
    assert.ok(Object.isFrozen(SCAFFOLDS))
    const seen = new Set()
    for (const row of SCAFFOLDS) {
      assert.ok(Object.isFrozen(row))
      assert.equal(typeof row.label, 'string')
      assert.ok(row.label.length >= 4, `${row.id} label too short`)
      assert.ok(KINDS.has(row.kind), `${row.id} has an unknown kind: ${row.kind}`)
      assert.equal(typeof row.description, 'string')
      assert.ok(row.description.length >= 12, `${row.id} description too short`)
      assert.equal(typeof row.bytes, 'number')
      assert.ok(Number.isInteger(row.bytes) && row.bytes > 4000, `${row.id} bytes not a real size`)
      assert.ok(row.bytes < 64 * 1024, `${row.id} exceeds the 64 KiB tool-content budget`)
      assert.ok(!seen.has(row.id), `duplicate scaffold id ${row.id}`)
      seen.add(row.id)
    }
    assert.equal(seen.size, IDS.length)
  })

  it('reports bytes that equal the real UTF-8 byte length', () => {
    for (const row of SCAFFOLDS) {
      const content = scaffoldContent(row.id)
      assert.equal(typeof content, 'string')
      assert.equal(row.bytes, Buffer.byteLength(content, 'utf8'), `${row.id} bytes mismatch`)
    }
  })

  it('marks the kind -> default scaffold map as complete', () => {
    for (const kind of KINDS) {
      const id = DEFAULT_SCAFFOLD_BY_KIND[kind]
      assert.ok(IDS.includes(id), `kind ${kind} maps to unknown scaffold ${id}`)
      assert.equal(scaffoldForKind(kind), id)
    }
    assert.equal(scaffoldForKind('nope'), 'browser')
    assert.equal(scaffoldMeta('deck')?.id, 'deck')
    assert.equal(scaffoldMeta('nope'), null)
  })
})

describe('scaffoldContent()', () => {
  it('returns null for unknown or non-string ids', () => {
    for (const value of ['nope', '', undefined, null, 42, {}, ['deck']]) {
      assert.equal(scaffoldContent(value), null)
    }
  })

  it('accepts a padded id', () => {
    assert.equal(scaffoldContent(' deck '), scaffoldContent('deck'))
  })
})

describe('every scaffold is a self-contained document', () => {
  for (const id of IDS) {
    it(`${id}: document shell, inline assets, no external requests`, () => {
      const html = scaffoldContent(id)
      assert.ok(html.startsWith('<!DOCTYPE html>'), `${id} lacks <!DOCTYPE html>`)
      assert.match(html, /<html lang="(zh|en)">/, `${id} lacks a lang attribute`)
      assert.match(html, /<meta charset="utf-8">/i, `${id} lacks a charset`)
      assert.match(html, /<meta name="viewport" content="width=device-width/, `${id} lacks a viewport meta`)
      assert.match(html, /<title>[^<]{3,}<\/title>/, `${id} lacks a meaningful title`)
      assert.ok(html.includes('<style>'), `${id} lacks an inline style block`)
      assert.ok(html.includes('<script>'), `${id} lacks an inline script block`)

      // Zero external requests: no http(s) URL at all, no remote link/import/img.
      assert.equal(/https?:\/\//i.test(html), false, `${id} references an http(s) URL`)
      assert.equal(/<link\b/i.test(html), false, `${id} uses <link>`)
      assert.equal(/@import/i.test(html), false, `${id} uses @import`)
      assert.equal(/url\(\s*['"]?(?:https?:)?\/\//i.test(html), false, `${id} has an external CSS url()`)
      assert.equal(/<img\b/i.test(html), false, `${id} embeds an image element`)

      assert.ok(html.trim().length > 4000, `${id} looks like a stub`)
    })

    it(`${id}: EDITMODE block, apply hook and edit-mode protocol`, () => {
      const html = scaffoldContent(id)
      assert.equal(countOf(html, '/*EDITMODE-BEGIN*/'), 1, `${id} must have exactly one EDITMODE block`)
      assert.equal(countOf(html, '/*EDITMODE-END*/'), 1, `${id} must close the EDITMODE block`)

      const begin = html.indexOf('/*EDITMODE-BEGIN*/')
      const end = html.indexOf('/*EDITMODE-END*/')
      assert.ok(begin > 0 && end > begin, `${id} EDITMODE markers are out of order`)
      const json = html.slice(begin + '/*EDITMODE-BEGIN*/'.length, end)
      let tweaks
      assert.doesNotThrow(() => {
        tweaks = JSON.parse(json)
      }, `${id} EDITMODE body is not valid JSON`)

      assert.equal(typeof tweaks, 'object')
      assert.ok(!Array.isArray(tweaks))
      const keys = Object.keys(tweaks)
      assert.ok(keys.length >= 3 && keys.length <= 6, `${id} needs 3–6 tweak keys, got ${keys.length}`)
      for (const key of keys) {
        assert.match(key, /^[A-Za-z][A-Za-z0-9]*$/, `${id} tweak key ${key} is not an identifier`)
      }
      const valueTypes = new Set(keys.map((key) => typeof tweaks[key]))
      assert.ok(valueTypes.has('string'), `${id} tweaks need at least one string value`)
      assert.ok(valueTypes.has('number'), `${id} tweaks need at least one number value`)
      assert.ok(valueTypes.has('boolean'), `${id} tweaks need at least one boolean value`)

      assert.match(html, /window\.__dsApplyTweaks\s*=\s*function|window\.__dsApplyTweaks\s*=/, `${id} lacks __dsApplyTweaks`)
      assert.ok(html.includes('__edit_mode_available'), `${id} never announces edit-mode support`)
      assert.ok(html.includes('__activate_edit_mode'), `${id} ignores activation`)
      assert.ok(html.includes('__deactivate_edit_mode'), `${id} ignores deactivation`)
      assert.ok(html.includes('__edit_mode_set_keys'), `${id} never posts partial tweak updates`)

      // The protocol rule: register the listener BEFORE announcing availability.
      const listener = html.indexOf("addEventListener('message'")
      const announce = html.indexOf('__edit_mode_available')
      assert.ok(listener > 0, `${id} has no message listener`)
      assert.ok(
        listener < announce,
        `${id} announces edit mode before its message listener is registered`,
      )
    })
  }
})

describe('per-kind extras', () => {
  it('deck: numbered screens, keyboard nav, localStorage restore, print pages', () => {
    const html = scaffoldContent('deck')
    const labels = [...html.matchAll(/data-screen-label="(\d{2}) ([^"]+)"/g)]
    assert.ok(labels.length >= 4, 'deck needs at least four labelled screens')
    labels.forEach((match, index) => {
      assert.equal(Number(match[1]), index + 1, 'screen labels must be 1-indexed and sequential')
      assert.match(match[2], /\S/, 'screen label needs a title')
    })
    assert.ok(html.includes('@page { size: 1920px 1080px; margin: 0; }'), 'deck needs the 16:9 @page rule')
    assert.ok(html.includes('page-break-after'), 'deck needs a forced page break per screen')
    assert.ok(html.includes('localStorage'), 'deck must persist the current screen')
    assert.ok(html.includes('ArrowRight') && html.includes('ArrowLeft'), 'deck needs arrow-key navigation')
    assert.ok(html.includes("'Home'") && html.includes("'End'"), 'deck needs Home/End navigation')
    assert.ok(html.includes('prefers-reduced-motion'), 'deck should respect reduced motion')
  })

  it('poster prints on A3', () => {
    const html = scaffoldContent('poster')
    assert.match(html, /@page\s*\{\s*size:\s*A3;/, 'poster needs @page size A3')
    assert.ok(html.includes('print-color-adjust'), 'poster needs print-safe colors')
  })

  it('doc prints one A4 page', () => {
    const html = scaffoldContent('doc')
    assert.match(html, /@page\s*\{\s*size:\s*A4;/, 'doc needs @page size A4')
    assert.ok(html.includes('print-color-adjust'), 'doc needs print-safe colors')
  })

  it('mobile scaffolds use real device metrics and touch targets', () => {
    const ios = scaffoldContent('ios')
    assert.ok(ios.includes('393px') && ios.includes('852px'), 'ios scaffold needs 393 × 852 metrics')
    assert.ok(ios.includes('--w: 393px') || ios.includes('393px'), 'ios width metric missing')
    const android = scaffoldContent('android')
    assert.ok(android.includes('412px') && android.includes('915px'), 'android scaffold needs 412 × 915 metrics')
    for (const [id, html] of [['ios', ios], ['android', android]]) {
      assert.ok(/min-height:\s*4[4-9]px/.test(html) || /height:\s*4[4-9]px/.test(html), `${id} needs 44px touch targets`)
      assert.ok(html.includes('safe-area') || html.includes('home-indicator') || html.includes('gesture'), `${id} should model safe areas`)
    }
  })

  it('a11y basics shared by every scaffold', () => {
    for (const id of IDS) {
      const html = scaffoldContent(id)
      assert.ok(/aria-label=/.test(html), `${id} should label icon-only controls`)
      assert.ok(html.includes(':focus-visible'), `${id} should keep a visible focus style`)
    }
  })
})

describe('writeScaffold()', () => {
  it('writes the scaffold and returns design-relative and absolute paths', async () => {
    const designDir = await scratchDir()
    const result = await writeScaffold({ designDir, id: 'browser', file: 'a.html' })
    assert.equal(result.file, 'a.html')
    assert.equal(result.path, join(designDir, 'a.html'))
    assert.equal(result.designFile.endsWith('a.html'), true)
    assert.equal(result.bytes, Buffer.byteLength(scaffoldContent('browser'), 'utf8'))
    assert.equal(await readFile(result.path, 'utf8'), scaffoldContent('browser'))
  })

  it('creates the design directory and nested target folders', async () => {
    const parent = await scratchDir()
    const designDir = join(parent, 'design')
    const result = await writeScaffold({ designDir, id: 'deck', file: 'variants/b.html' })
    assert.equal(result.file, 'variants/b.html')
    assert.equal(await readFile(join(designDir, 'variants', 'b.html'), 'utf8'), scaffoldContent('deck'))
    assert.equal((await stat(designDir)).isDirectory(), true)
  })

  it('defaults the file name to <id>.html', async () => {
    const designDir = await scratchDir()
    const result = await writeScaffold({ designDir, id: 'doc' })
    assert.equal(result.file, 'doc.html')
    assert.equal(await readFile(result.path, 'utf8'), scaffoldContent('doc'))
  })

  it('refuses to overwrite without force, then overwrites with force', async () => {
    const designDir = await scratchDir()
    const target = join(designDir, 'a.html')
    await writeFile(target, 'old content', 'utf8')
    await assert.rejects(writeScaffold({ designDir, id: 'ios', file: 'a.html' }), (error) => {
      assert.equal(error.code, 'invalid_input')
      assert.match(error.message, /already exists/)
      assert.equal(error.repair.action, 'retry_with_force')
      return true
    })
    assert.equal(await readFile(target, 'utf8'), 'old content')
    await writeScaffold({ designDir, id: 'ios', file: 'a.html', force: true })
    assert.equal(await readFile(target, 'utf8'), scaffoldContent('ios'))
  })

  it('rejects unknown ids, missing directories and escaping paths', async () => {
    await assert.rejects(writeScaffold({ designDir: '', id: 'browser' }), (error) => error.code === 'invalid_input')
    const designDir = await scratchDir()
    await assert.rejects(writeScaffold({ designDir, id: 'zzz' }), (error) => error.code === 'not_found')
    await assert.rejects(writeScaffold({ designDir, id: 'browser', file: '../escape.html' }), (error) => error.code === 'invalid_input')
    await assert.rejects(writeScaffold({ designDir, id: 'browser', file: '..\\escape.html' }), (error) => error.code === 'invalid_input')
    await assert.rejects(writeScaffold({ designDir, id: 'browser', file: join(designDir, 'abs.html') }), (error) => error.code === 'invalid_input')
  })
})

describe('display resources', () => {
  it('locale files are valid JSON with meta.title and meta.description', async () => {
    for (const [file, title] of [['locale/zh.json', '设计台'], ['locale/en.json', 'Design studio']]) {
      const raw = await readResource(file)
      let data
      assert.doesNotThrow(() => {
        data = JSON.parse(raw)
      }, `${file} is not valid JSON`)
      assert.equal(data.meta.title, title)
      assert.equal(typeof data.meta.description, 'string')
      assert.ok(data.meta.description.length >= 20, `${file} description is too short`)
      assert.ok(data.meta.description.length <= 220, `${file} description is too long`)
      if (data.panel !== undefined) {
        assert.equal(typeof data.panel.label, 'string')
      }
    }
  })

  it('icon is a small, text-free SVG with no external references', async () => {
    const svg = await readResource('icon.svg')
    assert.match(svg.trimStart(), /^<svg\b/)
    assert.match(svg, /viewBox="0 0 24 24"/)
    assert.equal(/<text\b/i.test(svg), false, 'icon must not contain text')
    assert.equal(/<image\b/i.test(svg), false, 'icon must not reference external images')
    assert.equal(/https?:\/\//i.test(svg.replace('xmlns="http://www.w3.org/2000/svg"', '')), false)
    assert.ok(Buffer.byteLength(svg, 'utf8') < 16 * 1024, 'icon must stay under 16 KiB')
    assert.ok(svg.includes('currentColor'), 'icon should inherit the panel foreground color')
    assert.ok(svg.includes('#b4552f'), 'icon should carry the restrained accent')
  })

  it('LICENSE is MIT for YansongG-HKU', async () => {
    const license = await readResource('LICENSE')
    assert.match(license, /MIT License/)
    assert.match(license, /Copyright \(c\) 2026 YansongG-HKU/)
    assert.match(license, /THE SOFTWARE IS PROVIDED "AS IS"/)
  })

  it('ships README, CHANGELOG and docs/DESIGN.md', async () => {
    for (const file of ['README.md', 'CHANGELOG.md', 'docs/DESIGN.md']) {
      const text = await readResource(file)
      assert.ok(text.length > 800, `${file} is too thin`)
    }
    const readme = await readResource('README.md')
    for (const needle of ['design_start', 'design_check', 'design_export', 'plugin_manager', 'npm test']) {
      assert.ok(readme.includes(needle), `README should mention ${needle}`)
    }
    const changelog = await readResource('CHANGELOG.md')
    assert.match(changelog, /## 1\.0\.0/)
  })
})

/** Count non-overlapping occurrences of a literal needle. */
function countOf(haystack, needle) {
  let count = 0
  let index = haystack.indexOf(needle)
  while (index !== -1) {
    count += 1
    index = haystack.indexOf(needle, index + needle.length)
  }
  return count
}
