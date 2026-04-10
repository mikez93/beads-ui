import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { debug } from './logging.js';
import { registerWorkspace } from './registry-watcher.js';

const log = debug('auto-discover');

/**
 * Default scan paths when BDUI_DISCOVER_PATHS is not set.
 * Covers the typical project layout: ~/www for dev repos, ~/Documents for misc.
 */
const DEFAULT_DISCOVER_PATHS = [
  path.join(os.homedir(), 'www'),
  path.join(os.homedir(), 'Documents')
];

/** Default maximum directory depth when scanning for beads repos. */
const DEFAULT_DISCOVER_DEPTH = 4;

/** Directories to skip during recursive scan (performance + correctness). */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.venv',
  '__pycache__',
  '.Trash',
  'Library'
]);

/**
 * Discover all beads-enabled repositories under the configured scan paths
 * and register each one as a bdui workspace.
 *
 * A directory is considered a beads repo when it contains either
 * `.beads/metadata.json` (Dolt backend) or a `.beads/*.db` file (SQLite).
 *
 * Environment variables:
 *
 * - `BDUI_DISCOVER_PATHS` — colon-separated list of root directories to scan.
 *   Default: `~/www:~/Documents`.
 * - `BDUI_DISCOVER_DEPTH` — max directory depth to recurse. Default: `4`.
 * - `BDUI_DISCOVER` — set to `false` to disable auto-discover entirely.
 *
 * @returns {number} Number of workspaces discovered and registered.
 */
export function discoverAndRegisterWorkspaces() {
  if (process.env.BDUI_DISCOVER === 'false') {
    log('auto-discover disabled via BDUI_DISCOVER=false');
    return 0;
  }

  const raw_paths = process.env.BDUI_DISCOVER_PATHS;
  const scan_paths = raw_paths
    ? raw_paths.split(':').filter(Boolean)
    : DEFAULT_DISCOVER_PATHS;

  const max_depth = Number.parseInt(
    process.env.BDUI_DISCOVER_DEPTH || String(DEFAULT_DISCOVER_DEPTH),
    10
  );

  let count = 0;
  for (const scan_root of scan_paths) {
    const resolved = path.resolve(scan_root);
    if (!fs.existsSync(resolved)) {
      log('skip non-existent scan path: %s', resolved);
      continue;
    }
    const repos = findBeadsRepos(resolved, max_depth);
    for (const repo_path of repos) {
      const beads_dir = path.join(repo_path, '.beads');
      registerWorkspace({ path: repo_path, database: beads_dir });
      count++;
    }
  }

  log('auto-discovered %d beads workspace(s)', count);
  return count;
}

/**
 * Recursively find directories that contain a beads installation.
 *
 * Detection: a directory is a beads repo when `.beads/metadata.json` exists
 * (Dolt backend) or when any `.beads/*.db` file exists (SQLite backend).
 * Once a beads repo is found, its children are not scanned (a repo can't
 * nest inside another repo).
 *
 * @param {string} dir - Directory to scan.
 * @param {number} max_depth - Maximum recursion depth from the scan root.
 * @param {number} [current_depth=0]
 * @returns {string[]} Repo root directories containing `.beads/`.
 */
function findBeadsRepos(dir, max_depth, current_depth = 0) {
  if (current_depth > max_depth) {
    return [];
  }

  // Check if this directory IS a beads repo
  if (isBeadsRepo(dir)) {
    return [dir];
  }

  // Recurse into subdirectories
  /** @type {fs.Dirent[]} */
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    // Permission denied, broken symlink, etc.
    return [];
  }

  /** @type {string[]} */
  const results = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const name = entry.name;
    if (name.startsWith('.') || SKIP_DIRS.has(name)) {
      continue;
    }
    results.push(
      ...findBeadsRepos(path.join(dir, name), max_depth, current_depth + 1)
    );
  }
  return results;
}

/**
 * Check whether a directory contains a beads installation.
 *
 * @param {string} dir
 * @returns {boolean}
 */
function isBeadsRepo(dir) {
  const beads_dir = path.join(dir, '.beads');
  // Fast check: does .beads/ even exist?
  if (!fs.existsSync(beads_dir)) {
    return false;
  }
  // Dolt backend: .beads/metadata.json
  if (fs.existsSync(path.join(beads_dir, 'metadata.json'))) {
    return true;
  }
  // SQLite backend: .beads/*.db
  try {
    const files = fs.readdirSync(beads_dir);
    return files.some((f) => f.endsWith('.db'));
  } catch {
    return false;
  }
}
