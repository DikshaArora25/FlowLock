/**
 * FlowLock Frontend Dynamic Environment Configuration
 * -------------------------------------------------------------
 * - In Local Development: Dynamically loads configuration from frontend/.env
 * - In Production (Vercel): Uses production backend URL without making dead
 *   fetch calls to .env (which is gitignored and blocked on production).
 * -------------------------------------------------------------
 */

const isProduction =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

export const ENV = {
  // Configurable backend URL:
  // - In production: uses your deployed backend or window override
  // - In local: defaults to http://localhost:5000/api (overridden by local frontend/.env if present)
  API_BASE_URL: isProduction
    ? (window.FLOWLOCK_API_URL || 'https://flowlock-backend.onrender.com/api')
    : 'http://localhost:5000/api'
};

/**
 * Parse raw .env file text into key-value pairs
 * Handles comments (#), whitespace, and quotes
 */
function parseEnv(text) {
  const result = {};
  if (!text) return result;

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let val = trimmed.slice(eqIndex + 1).trim();

    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }

    result[key] = val;
  }
  return result;
}

/**
 * Asynchronously fetch and parse frontend/.env relative to this file
 * Only runs in local development since .env is gitignored and blocked by Vercel in production
 */
async function loadEnv() {
  if (typeof window === 'undefined') return ENV;

  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  // Do not fetch .env on public production domains (Vercel) to avoid 404 errors
  if (!isLocal) {
    window.__ENV__ = ENV;
    return ENV;
  }

  try {
    const envFileUrl = new URL('.env', import.meta.url).href;
    const response = await fetch(envFileUrl, { cache: 'no-cache' });
    if (response.ok) {
      const text = await response.text();
      const parsed = parseEnv(text);

      const resolvedUrl =
        parsed.API_BASE_URL ||
        parsed.VITE_API_URL ||
        parsed.BACKEND_URL;

      if (resolvedUrl) {
        ENV.API_BASE_URL = resolvedUrl.replace(/\/+$/, '');
      }

      Object.assign(ENV, parsed);
    }
  } catch (err) {
    // Graceful fallback to default if local .env is missing
  }

  // Expose on window for runtime browser debugging
  window.__ENV__ = ENV;
  return ENV;
}

export const envReady = loadEnv();

if (typeof window !== 'undefined') {
  window.__ENV__ = ENV;
}
