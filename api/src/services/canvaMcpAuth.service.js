/**
 * canvaMcpAuth.service.js
 * Handles OAuth 2.0 token lifecycle for the Canva MCP server (mcp.canva.com).
 *
 * This is a separate auth flow from canvaAuth.service.js (api.canva.com).
 * The MCP server is an independent OAuth authorization server that requires
 * its own client registration (DCR) and user authorization.
 *
 * One-time setup:
 *   1. Call registerMcpClient() or hit GET /canva-mcp/register to get a client_id
 *      → set CANVA_MCP_CLIENT_ID in your .env
 *   2. User visits GET /canva-mcp/auth → completes OAuth → token stored automatically
 *
 * After setup, getMcpAccessToken() returns a valid token on every call.
 */

import crypto from 'crypto';

const MCP_REGISTER_URL  = 'https://mcp.canva.com/register';
const MCP_AUTH_BASE     = 'https://mcp.canva.com/authorize';
const MCP_TOKEN_URL     = 'https://mcp.canva.com/token';
const MCP_REDIRECT_URI  = 'http://127.0.0.1:3300/canva-mcp/auth/callback';

// In-memory token cache
let tokenCache = {
  accessToken: null,
  expiresAt: null,
};

// PKCE state store (keyed by state param, short-lived)
const pendingAuth = new Map();

function isTokenExpired() {
  if (!tokenCache.accessToken || !tokenCache.expiresAt) return true;
  return Date.now() >= tokenCache.expiresAt - 60_000;
}

function storeTokenResponse({ access_token, refresh_token, expires_in }) {
  tokenCache = {
    accessToken: access_token,
    expiresAt: Date.now() + (expires_in ?? 3600) * 1000,
  };

  if (refresh_token) {
    process.env.CANVA_MCP_REFRESH_TOKEN = refresh_token;
  }

  console.log(
    `[CanvaMcpAuth] Token stored. Expires in ${expires_in}s ` +
    `(at ${new Date(tokenCache.expiresAt).toISOString()})`
  );
}

function getClientId() {
  const id = process.env.CANVA_MCP_CLIENT_ID;
  if (!id) {
    throw new Error(
      'Missing CANVA_MCP_CLIENT_ID. Run GET /canva-mcp/register first.'
    );
  }
  return id;
}

// ── DCR ──────────────────────────────────────────────────────────────────────

/**
 * Registers this app as an OAuth client with the Canva MCP server.
 * Call once — stores client_id in process.env.CANVA_MCP_CLIENT_ID.
 * Re-registration is safe (creates a new client_id each time).
 */
export async function registerMcpClient() {
  const res = await fetch(MCP_REGISTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'o-daria-api',
      redirect_uris: [MCP_REDIRECT_URI],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`MCP client registration failed (${res.status}): ${text}`);
  }

  const data = JSON.parse(text);
  process.env.CANVA_MCP_CLIENT_ID = data.client_id;
  console.log(`[CanvaMcpAuth] Registered — client_id: ${data.client_id}`);
  return data;
}

// ── PKCE Auth Flow ───────────────────────────────────────────────────────────

/**
 * Generates the MCP authorization URL. Redirect the user to this URL.
 * @returns {{ authUrl: string, state: string }}
 */
export function beginMcpAuthFlow() {
  const codeVerifier  = crypto.randomBytes(64).toString('base64url').slice(0, 96);
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state         = crypto.randomBytes(32).toString('base64url');

  pendingAuth.set(state, { codeVerifier, expiresAt: Date.now() + 10 * 60_000 });

  const authUrl =
    `${MCP_AUTH_BASE}?` +
    new URLSearchParams({
      response_type: 'code',
      client_id:     getClientId(),
      redirect_uri:  MCP_REDIRECT_URI,
      state,
      code_challenge:        codeChallenge,
      code_challenge_method: 'S256',
    }).toString();

  return { authUrl, state };
}

/**
 * Completes the OAuth flow: validates state, exchanges code for tokens.
 * @param {string} code
 * @param {string} state
 */
export async function completeMcpAuthFlow(code, state) {
  const pending = pendingAuth.get(state);
  if (!pending) throw new Error('Unknown or expired OAuth state parameter.');
  if (Date.now() > pending.expiresAt) {
    pendingAuth.delete(state);
    throw new Error('OAuth state has expired. Please restart the auth flow.');
  }
  pendingAuth.delete(state);

  const res = await fetch(MCP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     getClientId(),
      code,
      redirect_uri:  MCP_REDIRECT_URI,
      code_verifier: pending.codeVerifier,
    }).toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`MCP token exchange failed (${res.status}): ${text}`);
  }
  console.log(text)
  storeTokenResponse(JSON.parse(text));
}

// ── Token access ─────────────────────────────────────────────────────────────

async function fetchNewMcpToken() {
  const refreshToken = process.env.CANVA_MCP_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      'No CANVA_MCP_REFRESH_TOKEN available. Complete the MCP OAuth flow via GET /canva-mcp/auth'
    );
  }

  const res = await fetch(MCP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     getClientId(),
      refresh_token: refreshToken,
    }).toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`MCP token refresh failed (${res.status}): ${text}`);
  }

  const tokenData = JSON.parse(text);
  storeTokenResponse(tokenData);
  return tokenData.access_token;
}

/**
 * Returns a valid MCP access token, refreshing if needed.
 * @returns {Promise<string>}
 */
export async function getMcpAccessToken() {
  if (isTokenExpired()) {
    return fetchNewMcpToken();
  }
  return tokenCache.accessToken;
}

/**
 * Returns true if the MCP auth has been set up (refresh token exists).
 */
export function isMcpAuthConfigured() {
  return !!(process.env.CANVA_MCP_CLIENT_ID && process.env.CANVA_MCP_REFRESH_TOKEN);
}
