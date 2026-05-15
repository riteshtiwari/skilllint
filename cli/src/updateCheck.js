import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';

const PACKAGE_NAME = '@tiwariritesh/skilllint';
const CACHE_FILE = join(homedir(), '.skilllint-update-cache');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Allow slow-network users to tune or disable the timeout.
const FETCH_TIMEOUT_MS = (() => {
  const raw = process.env.SKILLLINT_UPDATE_TIMEOUT;
  if (!raw) return 5000;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 5000;
})();

// Returns [major, minor, patch] as integers, or null if the string is not a
// stable semver. Pre-release suffixes (1.0.0-beta) are rejected intentionally —
// we only report updates when a stable release exists.
function parseVersion(v) {
  if (typeof v !== 'string') return null;
  const m = v.replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

// Returns true only when fetched is strictly greater than current.
function isNewer(fetched, current) {
  const f = parseVersion(fetched);
  const c = parseVersion(current);
  if (!f || !c) return false;
  for (let i = 0; i < 3; i++) {
    if (f[i] > c[i]) return true;
    if (f[i] < c[i]) return false;
  }
  return false; // equal
}

function readCache() {
  try {
    const raw = readFileSync(CACHE_FILE, 'utf8');
    const data = JSON.parse(raw);
    // Validate schema — any missing or wrong-typed field discards the cache.
    if (typeof data.version !== 'string') return null;
    if (typeof data.timestamp !== 'number') return null;
    if (!parseVersion(data.version)) return null;
    return data;
  } catch {
    return null;
  }
}

// Atomic write via temp file + rename so concurrent processes never see a
// partial write. Temp file is cleaned up on rename failure.
function writeCache(version) {
  const tmp = CACHE_FILE + '.' + randomBytes(4).toString('hex');
  try {
    writeFileSync(
      tmp,
      JSON.stringify({ version, timestamp: Date.now() }),
      { encoding: 'utf8', mode: 0o600 }
    );
    renameSync(tmp, CACHE_FILE);
  } catch {
    try { unlinkSync(tmp); } catch { /* ignore cleanup failure */ }
    // Cache write failed — silently continue. Next run will retry.
  }
}

// Resolves with the latest stable version string if one is available and newer
// than currentVersion, or null otherwise. Never throws or rejects.
export async function checkForUpdate(currentVersion) {
  // Never run in CI — output must be clean for automation.
  if (process.env.CI) return null;

  // Use cached result if it is fresh enough.
  const cached = readCache();
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return isNewer(cached.version, currentVersion) ? cached.version : null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(
        `https://registry.npmjs.org/${PACKAGE_NAME}/latest`,
        {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        }
      );
      // Do not attempt JSON parse on non-2xx responses (body will be HTML).
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const v = data && data.version;
      if (!parseVersion(v)) throw new Error('unexpected version format in registry response');
      writeCache(v);
      return isNewer(v, currentVersion) ? v : null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Network errors, timeouts, JSON parse failures, and bad versions all fall
    // here. Fail silently — a version check must never break linting.
    return null;
  }
}
