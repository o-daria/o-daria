/**
 * tokenManager.js — Canva OAuth Token Management
 *
 * Provides a valid Canva access token, refreshing automatically when expired.
 * In dev mode: reads from process.env. In production: reads/writes DB (future).
 *
 * Reuses the token exchange pattern from canva_auth.js.
 */

import fs from 'fs';
import path from 'path';

const TOKEN_ENDPOINT = 'https://api.canva.com/rest/v1/oauth/token';

// ─── Refresh lock (prevents concurrent refresh_token usage) ─────────────────

let refreshPromise = null;

// ─── .env helpers (dev mode) ─────────────────────────────────────────────────

function saveEnvKey(key, value) {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf-8');
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedKey}=.*$`, 'm');

  const newLine = `${key}="${value}"`;
  const updated = pattern.test(content)
    ? content.replace(pattern, newLine)
    : content.trimEnd() + `\n${newLine}\n`;

  fs.writeFileSync(envPath, updated);
}

// ─── Token refresh ───────────────────────────────────────────────────────────

/**
 * Refresh the Canva access token using the refresh token.
 * Updates process.env and .env file with new tokens.
 *
 * @returns {Promise<string>} New access token
 */
export async function refreshCanvaToken() {
  // If a refresh is already in flight, piggyback on it instead of
  // burning the single-use refresh token a second time.
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = _doRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function _doRefresh() {
  const clientId     = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  const refreshToken = process.env.CANVA_REFRESH_TOKEN;

  if (!clientId || !clientSecret) {
    throw new Error('CANVA_CLIENT_ID and CANVA_CLIENT_SECRET must be set. Run: node canva_auth.js');
  }
  if (!refreshToken) {
    throw new Error('CANVA_REFRESH_TOKEN is not set. Run: node canva_auth.js');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Canva token refresh failed (${res.status}): ${text}. ` +
      'The refresh token may be revoked — run: node canva_auth.js'
    );
  }

  const tokens = JSON.parse(text);

  // Update in-memory env
  process.env.CANVA_TOKEN = tokens.access_token;
  if (tokens.refresh_token) {
    process.env.CANVA_REFRESH_TOKEN = tokens.refresh_token;
  }

  // Persist to .env (dev mode)
  saveEnvKey('CANVA_TOKEN', tokens.access_token);
  if (tokens.refresh_token) {
    saveEnvKey('CANVA_REFRESH_TOKEN', tokens.refresh_token);
  }

  console.log('[TokenManager] Canva token refreshed successfully');
  return tokens.access_token;
}

// ─── Main entry ──────────────────────────────────────────────────────────────

/**
 * Get a valid Canva access token. Attempts refresh if the current token
 * appears missing or fails a test request.
 *
 * @returns {Promise<string>} Valid access token
 */
export async function getCanvaToken() {
  const token = process.env.CANVA_TOKEN;

  if (!token) {
    console.log('[TokenManager] No CANVA_TOKEN found, attempting refresh...');
    return refreshCanvaToken();
  }

  return token;
}

/**
 * Wrapper for Canva API calls that retries once on 401 with a refreshed token.
 *
 * @param {function} apiFn - async function receiving (token) and making a Canva API call
 * @returns {Promise<*>} Result from apiFn
 */
export async function withTokenRefresh(apiFn) {
  let token = await getCanvaToken();

  try {
    return await apiFn(token);
  } catch (err) {
    if (err.status === 401 || err.message?.includes('401')) {
      console.log('[TokenManager] Got 401, refreshing token and retrying...');
      // If another concurrent call already refreshed the token,
      // use the new one directly instead of triggering another refresh.
      const currentToken = process.env.CANVA_TOKEN;
      token = (currentToken && currentToken !== token)
        ? currentToken
        : await refreshCanvaToken();
      return apiFn(token);
    }
    throw err;
  }
}
