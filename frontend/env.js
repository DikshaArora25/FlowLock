/**
 * FlowLock Frontend Dynamic Environment Configuration
 * -------------------------------------------------------------
 * Reads backend API configuration dynamically from frontend/.env
 * without requiring hardcoded URLs in JavaScript source code.
 *
 * Supported keys in frontend/.env:
 * - API_BASE_URL=http://localhost:5000/api
 * - VITE_API_URL=http://localhost:5000/api (alias)
 * - BACKEND_URL=http://localhost:5000/api (alias)
 * -------------------------------------------------------------
 */

export const ENV = {
  API_BASE_URL: 'http://localhost:5000/api'
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
 */
async function loadEnv() {
  if (typeof window === 'undefined') return ENV;

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
    // Graceful fallback to default if .env is unreachable
  }

  // Expose on window for runtime browser debugging
  window.__ENV__ = ENV;
  return ENV;
}

export const envReady = loadEnv();

if (typeof window !== 'undefined') {
  window.__ENV__ = ENV;
}
