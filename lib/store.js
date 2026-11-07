/**
 * dsh-design-studio — the durable project store.
 *
 * Layout under `<dataDir>/projects/<projectId>/` (CONTRACT §2):
 *   project.json            versioned project record (atomically replaced)
 *   design/                 the agent writes variant HTML here (a.html, b.html, …)
 *   system/                 tokens.json + DESIGN.md
 *   context/                imported references + evidence.json
 *   checks/round-<n>/       one quality check per round
 *   exports/                exported html/zip/pdf/png/pptx files
 *   versions/<v-n>/          explicit snapshot of design/ + system/
 *   history/                previous variant content on panel save
 *   comments.json           inline comment records (atomic)
 *
 * Two invariants keep concurrent panel/tool traffic safe:
 *   - every write to one project is serialised through that project's promise lock;
 *   - every file path is confined inside the project root (no `..`, no absolute
 *     paths, no symlink escapes) before any read or write.
 */

import { readdir, readFile, realpath, rm, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { SCHEMA_VERSION } from './config.js'
import {
  ensureDir,
  isPlainObject,
  messageOf,
  nowIso,
  pathExists,
  readJsonFile,
  writeFileAtomic,
  writeJsonAtomic,
} from './util.js'

/** Project ids are `dsg-YYYYMMDD-HHMMSS-xxxx` (CONTRACT §0). */
const PROJECT_ID_PATTERN = /^dsg-[a-z0-9-]+$/u

/** All folders a project owns. */
const PROJECT_DIRS = ['design', 'system', 'context', 'checks', 'exports', 'versions', 'history']

/** Every path of one project, resolved from its id. */
export function projectPaths(dataDir, id) {
  const root = join(dataDir, 'projects', id)
  return {
    root,
    record: join(root, 'project.json'),
    design: join(root, 'design'),
    system: join(root, 'system'),
    context: join(root, 'context'),
    checks: join(root, 'checks'),
    exports: join(root, 'exports'),
    versions: join(root, 'versions'),
    history: join(root, 'history'),
    comments: join(root, 'comments.json'),
  }
}

/** True when `id` looks like a project id (used before touching the disk). */
export function isValidProjectId(id) {
  return typeof id === 'string' && PROJECT_ID_PATTERN.test(id)
}

/** Structural validation for a record read back from disk. */
export function validProjectRecord(value) {
  if (!isPlainObject(value)) return false
  if (value.schemaVersion !== SCHEMA_VERSION) return false
  if (!isValidProjectId(value.id)) return false
  if (typeof value.kind !== 'string' || value.kind.length === 0) return false
  if (!Array.isArray(value.checks) && value.checks !== undefined) return false
  return true
}

/** A structured store error (`code` is mapped to an HTTP status by the panel). */
function storeError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

/** Reject a relative path that could leave the project root. */
function rejectRelative(rel) {
  if (typeof rel !== 'string' || rel.trim().length === 0) return 'path is required'
  if (rel.includes('\0')) return 'path contains a NUL byte'
  const normalized = rel.replace(/\\/gu, '/')
  if (normalized.startsWith('/')) return 'absolute paths are not allowed'
  if (/^[a-zA-Z]:/u.test(normalized)) return 'absolute paths are not allowed'
  for (const segment of normalized.split('/')) {
    if (segment === '..') return 'path traversal is not allowed'
  }
  return ''
}

/**
 * Resolve `rel` inside a project root, or null when it is not confined.
 * Lexical containment only — `readFile`-style callers rely on it, writes also
 * pass {@link realContained} to defeat symlink escapes.
 */
function resolveInside(root, rel) {
  const reason = rejectRelative(rel)
  if (reason.length > 0) return null
  const target = resolve(root, rel.replace(/\\/gu, '/'))
  const relToRoot = relative(root, target)
  if (relToRoot === '' || relToRoot.startsWith('..') || isAbsolute(relToRoot)) return null
  return target
}

/** Resolve a path relative to the data dir, or null when it escapes. */
function resolveInsideData(dataDir, rel) {
  const reason = rejectRelative(rel)
  if (reason.length > 0) return null
  const target = resolve(dataDir, rel.replace(/\\/gu, '/'))
  const relToRoot = relative(dataDir, target)
  if (relToRoot === '' || relToRoot.startsWith('..') || isAbsolute(relToRoot)) return null
  return target
}

/**
 * Verify that the deepest existing ancestor of `target` resolves (through
 * symlinks) inside `root`. Missing targets are fine as long as their ancestors
 * are confined; a symlinked folder pointing elsewhere is rejected.
 */
async function realContained(root, target) {
  let realRoot
  try {
    realRoot = await realpath(root)
  } catch {
    return true // root does not exist yet; lexical containment is all there is
  }
  let probe = target
  for (let depth = 0; depth < 48; depth += 1) {
    try {
      const real = await realpath(probe)
      const relToRoot = relative(realRoot, real)
      return relToRoot === '' || (!relToRoot.startsWith('..') && !isAbsolute(relToRoot))
    } catch {
      const parent = dirname(probe)
      if (parent === probe) return false
      probe = parent
    }
  }
  return false
}

/**
 * Create the project store.
 * @param {{dir: string, log?: {warn?: Function}}} options
 */
export function createStore({ dir, log } = {}) {
  if (typeof dir !== 'string' || dir.trim().length === 0) throw new Error('the project store needs a directory')
  const dataDir = dir
  const projectsDir = join(dataDir, 'projects')
  /** Serialise writes per project id. */
  const locks = new Map()

  const warn = (message) => {
    try {
      log?.warn?.(message)
    } catch {
      /* logging never breaks the store */
    }
  }

  /** Run one action under the project's write lock. */
  const withLock = async (id, action) => {
    const previous = locks.get(id) ?? Promise.resolve()
    const run = previous.then(action, action)
    const tail = run.catch(() => {})
    locks.set(id, tail)
    try {
      return await run
    } finally {
      if (locks.get(id) === tail) locks.delete(id)
    }
  }

  /** Validate an id and return its path bundle, or throw invalid_input. */
  function pathsFor(id) {
    if (!isValidProjectId(id)) throw storeError('invalid_input', `not a project id: ${JSON.stringify(id)}`)
    return projectPaths(dataDir, id)
  }

  /** Write one record atomically, bumping updatedAt. */
  async function writeRecord(project) {
    const paths = pathsFor(project.id)
    project.updatedAt = nowIso()
    await writeJsonAtomic(paths.record, project)
  }

  /** Read one record, or null when missing/corrupt/not a valid id. */
  async function readProject(id) {
    if (!isValidProjectId(id)) return null
    const value = await readJsonFile(projectPaths(dataDir, id).record, null)
    if (!validProjectRecord(value)) {
      if (value !== null) warn(`project ${id} has a corrupt project.json and was skipped`)
      return null
    }
    return value
  }

  /** The absolute path of a confined project file, or throw invalid_input. */
  async function confinedPath(id, rel) {
    const paths = pathsFor(id)
    const target = resolveInside(paths.root, rel)
    if (!target) throw storeError('invalid_input', `path is not allowed inside the project: ${JSON.stringify(rel)}`)
    if (!(await realContained(paths.root, target))) {
      throw storeError('invalid_input', `path escapes the project through a symlink: ${JSON.stringify(rel)}`)
    }
    return target
  }

  return {
    dataDir,
    projectsDir,

    /** Ensure the store root exists. */
    async init() {
      await ensureDir(projectsDir)
      return this
    },

    /** Create a project folder tree plus its record. */
    async createProject(record) {
      if (!isPlainObject(record) || !isValidProjectId(record.id)) {
        throw storeError('invalid_input', 'createProject needs a record with a valid dsg-* id')
      }
      const paths = pathsFor(record.id)
      await ensureDir(paths.root)
      await this.ensureDirs(record.id)
      await writeRecord({ ...record })
      if (!pathExists(paths.comments)) await writeJsonAtomic(paths.comments, [])
      return readProject(record.id)
    },

    /** Read one full project record, or null. */
    readProject,

    /** Replace one record atomically (serialised per project). */
    async writeProject(project) {
      if (!isPlainObject(project) || !isValidProjectId(project.id)) {
        throw storeError('invalid_input', 'writeProject needs a record with a valid dsg-* id')
      }
      return withLock(project.id, async () => {
        await writeRecord(project)
        return project
      })
    },

    /**
     * Atomically mutate one project. The mutator may be async; returning
     * `false` from it skips the write. Throws `not_found` when the id is gone.
     */
    async updateProject(id, mutate) {
      if (typeof mutate !== 'function') throw storeError('invalid_input', 'updateProject needs a mutator function')
      return withLock(id, async () => {
        const project = await readProject(id)
        if (!project) throw storeError('not_found', `project ${JSON.stringify(id)} does not exist`)
        const result = await mutate(project)
        if (result === false) return project
        await writeRecord(project)
        return project
      })
    },

    /** Every valid project record, newest first. Corrupt records are skipped. */
    async listProjects() {
      let entries = []
      try {
        entries = await readdir(projectsDir, { withFileTypes: true })
      } catch {
        return []
      }
      const rows = []
      for (const entry of entries) {
        if (!entry.isDirectory() || !isValidProjectId(entry.name)) continue
        const record = await readProject(entry.name)
        if (record) rows.push(record)
      }
      rows.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
      return rows
    },

    /** Delete one project and every file it owns. True when it existed. */
    async deleteProject(id) {
      if (!isValidProjectId(id)) return false
      return withLock(id, async () => {
        const paths = projectPaths(dataDir, id)
        if (!pathExists(paths.root)) return false
        await rm(paths.root, { recursive: true, force: true })
        return true
      })
    },

    /** Absolute path bundle for one project (no disk access). */
    projectPaths(id) {
      return pathsFor(id)
    },

    /** Create the standard folder tree. */
    async ensureDirs(id) {
      const paths = pathsFor(id)
      for (const name of PROJECT_DIRS) await ensureDir(paths[name])
      return paths
    },

    /** File existence + size + mtime, or null. */
    async statFile(id, rel) {
      const paths = pathsFor(id)
      const target = resolveInside(paths.root, rel)
      if (!target || !(await realContained(paths.root, target))) return null
      try {
        const info = await stat(target)
        return info.isFile() ? { path: target, size: info.size, mtime: info.mtime.toISOString() } : null
      } catch {
        return null
      }
    },

    /** Read a bounded binary file under the project root, or null. */
    async readFile(id, rel) {
      let target
      try {
        target = await confinedPath(id, rel)
      } catch {
        return null
      }
      try {
        return await readFile(target)
      } catch {
        return null
      }
    },

    /** Read a UTF-8 file under the project root, or the fallback. */
    async readText(id, rel, fallback = null) {
      const data = await this.readFile(id, rel)
      return data === null ? fallback : data.toString('utf8')
    },

    /** Write one confined file atomically; returns `{path, bytes}`. */
    async writeFile(id, rel, data) {
      const target = await confinedPath(id, rel)
      const payload = Buffer.isBuffer(data) ? data : Buffer.from(typeof data === 'string' ? data : String(data ?? ''), 'utf8')
      await ensureDir(dirname(target))
      if (!(await realContained(projectPaths(dataDir, id).root, target))) {
        throw storeError('invalid_input', `path escapes the project through a symlink: ${JSON.stringify(rel)}`)
      }
      await writeFileAtomic(target, payload)
      return { path: target, bytes: payload.length }
    },

    /** Delete one confined file (missing is fine). True when it was removed. */
    async deleteFile(id, rel) {
      let target
      try {
        target = await confinedPath(id, rel)
      } catch {
        return false
      }
      try {
        const info = await stat(target)
        if (!info.isFile()) return false
        await rm(target, { force: true })
        return true
      } catch {
        return false
      }
    },

    /** Read one JSON file under the project root, or the fallback. */
    async readJson(id, rel, fallback = null) {
      let target
      try {
        target = await confinedPath(id, rel)
      } catch {
        return fallback
      }
      return readJsonFile(target, fallback)
    },

    /** Write one JSON file atomically; returns `{path, bytes}`. */
    async writeJson(id, rel, value) {
      const target = await confinedPath(id, rel)
      const text = JSON.stringify(value, null, 2) + '\n'
      await ensureDir(dirname(target))
      if (!(await realContained(projectPaths(dataDir, id).root, target))) {
        throw storeError('invalid_input', `path escapes the project through a symlink: ${JSON.stringify(rel)}`)
      }
      await writeFileAtomic(target, text)
      return { path: target, bytes: Buffer.byteLength(text, 'utf8') }
    },

    /** List one directory's files: `[{name, size, mtime}]`, sorted by name. */
    async listDir(id, rel) {
      const paths = pathsFor(id)
      const base = typeof rel === 'string' ? rel.replace(/\\/gu, '/').replace(/\/+$/u, '') : ''
      const target = base === '' || base === '.' ? paths.root : resolveInside(paths.root, base)
      if (!target || !(await realContained(paths.root, target))) return []
      let entries = []
      try {
        entries = await readdir(target, { withFileTypes: true })
      } catch {
        return []
      }
      const rows = []
      for (const entry of entries) {
        if (!entry.isFile()) continue
        const info = await stat(join(target, entry.name)).catch(() => null)
        if (!info) continue
        rows.push({ name: entry.name, size: info.size, mtime: info.mtime.toISOString() })
      }
      rows.sort((a, b) => a.name.localeCompare(b.name))
      return rows
    },

    /** Resolve a data-dir-relative path (used for locale/assets lookups). */
    resolveDataPath(rel) {
      return resolveInsideData(dataDir, rel)
    },
  }
}

/** The path separator, re-exported so callers can normalise display paths. */
export const PATH_SEP = sep

/** Exported for focused tests: a confined project-relative file path or null. */
export function confineProjectPath(dataDir, id, rel) {
  if (!isValidProjectId(id)) return null
  return resolveInside(projectPaths(dataDir, id).root, rel)
}
