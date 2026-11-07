#!/usr/bin/env node
/**
 * Release gate for dsh-design-studio.
 *
 * Verifies that the checked-out tree is a coherent, reproducible release
 * artifact for the tag being built: tag/version/commit identity, generated
 * client freshness, required display resources, package contents, and a
 * coarse secret scan. Prints one PASS/FAIL line per check, writes
 * `release-report.json`, and exits non-zero when anything fails.
 *
 * Usage:
 *   node scripts/verify-release.mjs [--tag v1.3.1] [--report release-report.json]
 *
 * The tag defaults to $GITHUB_REF_NAME (set by Actions on tag pushes) or to
 * `git describe --tags --exact-match` on a local checked-out tag.
 */

import { execFileSync, execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const checks = []
const failures = []

function argValue(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : ''
}

const reportPath = argValue('--report') || join(root, 'release-report.json')

/** Run a command and return trimmed stdout, or throw a compact error. */
function git(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch (error) {
    const detail = String(error?.stderr || error?.message || error).trim().split('\n')[0]
    throw new Error(`git ${args.join(' ')} failed: ${detail}`)
  }
}

async function readJson(relPath) {
  return JSON.parse(await readFile(join(root, relPath), 'utf8'))
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

async function record(name, fn) {
  try {
    const detail = await fn()
    checks.push({ name, ok: true, detail: detail === undefined ? '' : String(detail) })
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`)
  } catch (error) {
    const failure = { name, ok: false, error: error instanceof Error ? error.message : String(error) }
    failures.push(failure)
    console.log(`FAIL  ${name} — ${failure.error}`)
  }
}

const fragments = (await readdir(join(root, 'src', 'client'))).filter((name) => name.endsWith('.js')).sort()

/** Normalise text the same way scripts/build-client.mjs does. */
const normalize = (text) => String(text).replace(/\r\n/g, '\n').replace(/\n+$/u, '')

await record('tag ↔ package version', () => {
  const explicit = argValue('--tag')
  const tag = explicit || process.env.GITHUB_REF_NAME || git(['describe', '--tags', '--exact-match'])
  const pkg = awaitPackageVersion()
  assert(tag.length > 0, 'no tag supplied and no exact-match tag on HEAD')
  assert(tag === `v${pkg}`, `tag ${tag} does not match package version ${pkg}`)
  checks.tag = tag
  checks.version = pkg
  return `${tag} == v${pkg}`
})

function awaitPackageVersion() {
  // Synchronous by design: the package version is needed inside record().
  const raw = execFileSync(process.execPath, ['-e', 'process.stdout.write(require("./package.json").version)'], { cwd: root, encoding: 'utf8' })
  return raw.trim()
}

await record('tag is annotated', () => {
  const tag = checks.tag
  assert(tag, 'tag check has not run')
  const type = git(['cat-file', '-t', `refs/tags/${tag}`])
  assert(type === 'tag', `refs/tags/${tag} is a ${type}, expected an annotated tag object`)
  return 'annotated tag object'
})

await record('tag commit is HEAD', () => {
  const tag = checks.tag
  const head = git(['rev-parse', 'HEAD'])
  const tagged = git(['rev-list', '-n', '1', `refs/tags/${tag}`])
  assert(head === tagged, `HEAD ${head.slice(0, 12)} != tag ${tagged.slice(0, 12)}`)
  checks.commit = head
  return head.slice(0, 12)
})

await record('tag commit is on main', () => {
  const tag = checks.tag
  git(['merge-base', '--is-ancestor', `refs/tags/${tag}`, 'origin/main'])
  return 'reachable from origin/main'
})

await record('version constants match package.json', async () => {
  const pkg = awaitPackageVersion()
  const service = await readFile(join(root, 'lib', 'service.js'), 'utf8')
  const head = await readFile(join(root, 'src', 'client', '00-head.js'), 'utf8')
  const serviceVersion = /SERVICE_VERSION = '([^']+)'/u.exec(service)?.[1]
  const clientVersion = /const VERSION = "([^"]+)"/u.exec(head)?.[1]
  assert(serviceVersion === pkg, `SERVICE_VERSION ${serviceVersion} != ${pkg}`)
  assert(clientVersion === pkg, `client VERSION ${clientVersion} != ${pkg}`)
  return `service=${serviceVersion} client=${clientVersion}`
})

await record('client.js is generated from src/client fragments', async () => {
  const parts = await Promise.all(fragments.map((name) => readFile(join(root, 'src', 'client', name), 'utf8')))
  const source = parts.join('\n')
  const current = await readFile(join(root, 'client.js'), 'utf8')
  assert(normalize(source) === normalize(current), 'client.js is stale; run: node scripts/build-client.mjs')
  checks.artifacts = checks.artifacts || {}
  checks.artifacts.clientBytes = Buffer.byteLength(current, 'utf8')
  checks.artifacts.fragments = fragments
  return `${fragments.length} fragments, ${Buffer.byteLength(current, 'utf8')} bytes`
})

await record('built client exposes the v1.3 wizard surface', async () => {
  const client = await readFile(join(root, 'client.js'), 'utf8')
  for (const marker of ['__test__', 'buildStartPrompt', 'handoffPlan', 'fallbackIntakeGroups', 'answersToIntake']) {
    assert(client.includes(marker), `client.js is missing ${marker}`)
  }
  return 'wizard + handoff helpers present'
})

await record('release notes are present', async () => {
  const docs = await readdir(join(root, 'docs'))
  const notes = docs.filter((name) => /^RELEASE-v\d+\.\d+\.\d+\.md$/u.test(name))
  assert(notes.length > 0, 'docs/RELEASE-v*.md is missing')
  return notes.sort().join(', ')
})

await record('required artifacts exist and are non-empty', async () => {
  const required = [
    'index.js',
    'client.js',
    'lib/intake.js',
    'lib/service.js',
    'lib/panel.js',
    'lib/tools.js',
    'scripts/build-client.mjs',
    'locale/zh.json',
    'locale/en.json',
    'icon.svg',
    'cordis.patch.yml',
    'LICENSE',
    'README.md',
    'CHANGELOG.md',
    'docs/DESIGN.md',
    'docs/FLOW.md',
    'docs/UX-MAP.md',
    'docs/VERIFICATION.md',
  ]
  const rows = []
  for (const rel of required) {
    const info = await stat(join(root, rel))
    assert(info.isFile() && info.size > 0, `${rel} is missing or empty`)
    rows.push(rel)
  }
  return `${rows.length} files`
})

await record('package and locale JSON are valid', async () => {
  const pkg = await readJson('package.json')
  assert(pkg.name === 'dsh-design-studio', `unexpected package name ${pkg.name}`)
  assert(pkg.private === true, 'package must stay private (no npm publish in this release)')
  assert(pkg.license === 'MIT', `unexpected license ${pkg.license}`)
  assert(pkg.dsh?.bundle?.patch === './cordis.patch.yml', 'missing dsh.bundle.patch')
  assert(pkg.dsh?.client?.platform === 'web', 'missing dsh.client.platform')
  const zh = await readJson('locale/zh.json')
  const en = await readJson('locale/en.json')
  assert(zh.meta?.title && en.meta?.title, 'locale meta.title missing')
  return `${pkg.name}@${pkg.version}, zh/en locale parse OK`
})

await record('cordis patch references the plugin', async () => {
  const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8')
  assert(patch.includes('dsh-design-studio'), 'cordis.patch.yml does not reference dsh-design-studio')
  return `${Buffer.byteLength(patch, 'utf8')} bytes`
})

await record('npm pack contents are limited to shippable files', async () => {
  const raw = execSync('npm pack --dry-run --json --ignore-scripts', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const parsed = JSON.parse(raw)
  const files = Array.isArray(parsed) ? parsed[0]?.files ?? [] : parsed.files ?? []
  const paths = files.map((row) => String(row.path ?? ''))
  const has = (suffix) => paths.some((path) => path === suffix || path.endsWith(`/${suffix}`))
  for (const required of ['package/client.js', 'package/lib/intake.js', 'package/locale/zh.json', 'package/cordis.patch.yml']) {
    assert(has(required.replace(/^package\//u, '')), `tarball is missing ${required}`)
  }
  assert(!paths.some((path) => path.startsWith('test/') || path.startsWith('.github/')), 'tarball must not include tests or workflows')
  assert(!paths.some((path) => path.includes('node_modules')), 'tarball must not include node_modules')
  return `${paths.length} files in tarball`
})

await record('no credential-like secrets in shipped text', async () => {
  const patterns = [/gho_[A-Za-z0-9]{20,}/u, /github_pat_[A-Za-z0-9_]{20,}/u, /sk-[A-Za-z0-9]{20,}/u, /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/u]
  const candidates = ['README.md', 'CHANGELOG.md', 'index.js', 'client.js', 'cordis.patch.yml', 'package.json', 'locale/zh.json', 'locale/en.json']
  for (const rel of candidates) {
    const text = await readFile(join(root, rel), 'utf8')
    for (const pattern of patterns) {
      assert(!pattern.test(text), `${rel} looks like it contains a secret (${pattern})`)
    }
  }
  return `${candidates.length} files scanned`
})

const pkgVersion = awaitPackageVersion()
const clientHash = createHash('sha256').update(await readFile(join(root, 'client.js'))).digest('hex')
const packageHash = createHash('sha256').update(await readFile(join(root, 'package.json'))).digest('hex')

const report = {
  generatedAt: new Date().toISOString(),
  tag: checks.tag || '',
  version: pkgVersion,
  commit: checks.commit || '',
  node: process.version,
  platform: `${process.platform}/${process.arch}`,
  artifacts: {
    clientBytes: checks.artifacts?.clientBytes ?? null,
    fragments: checks.artifacts?.fragments ?? fragments,
    clientSha256: clientHash,
    packageJsonSha256: packageHash,
    nodeModules: false,
  },
  checks,
  failures,
  ok: failures.length === 0,
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`\n${report.ok ? 'RELEASE OK' : 'RELEASE BLOCKED'} — ${checks.length - failures.length}/${checks.length} checks passed; report: ${relative(process.cwd(), reportPath) || reportPath}`)
if (!report.ok) process.exit(1)
