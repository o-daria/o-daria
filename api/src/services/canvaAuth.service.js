/**
 * canvaAuth.service.js
 * Handles Canva OAuth 2.0 token lifecycle:
 *  - Initial authorization code exchange (PKCE)
 *  - Ongoing refresh via refresh_token grant
 *  - In-memory caching with proactive renewal before expiry
 */

import crypto from "crypto";

const CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const CANVA_AUTH_BASE = "https://www.canva.com/api/oauth/authorize";
const CANVA_REDIRECT_URI = process.env.CANVA_REDIRECT_URI
  ?? (process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/api/canva/auth/callback`
    : "http://127.0.0.1:3300/canva/auth/callback");
const CANVA_SCOPES = [
  "design:content:write",
  "design:meta:read",
  "asset:read",
  "asset:write",
  "brandtemplate:meta:read",
  "brandtemplate:content:read",
].join(" ");

// In-memory token cache
let tokenCache = {
  accessToken: null,
  expiresAt: null, // epoch ms
};

// PKCE state store (keyed by state param, short-lived)
const pendingAuth = new Map(); // state → { codeVerifier, expiresAt }

/**
 * Returns true when the cached token is missing or expires within 60 s.
 */
function isTokenExpired() {
  if (!tokenCache.accessToken || !tokenCache.expiresAt) return true;
  return Date.now() >= tokenCache.expiresAt - 60_000;
}

/**
 * Stores a fresh token response in the in-memory cache and updates
 * process.env so the refresh token survives across service restarts
 * (within the same process lifetime).
 */
function storeTokenResponse({ access_token, refresh_token, expires_in }) {
  tokenCache = {
    accessToken: access_token,
    expiresAt: Date.now() + expires_in * 1000,
  };

  // Canva rotates refresh tokens — persist the new one when provided
  if (refresh_token) {
    process.env.CANVA_REFRESH_TOKEN = refresh_token;
  }

  console.log(
    `[CanvaAuth] Token stored. Expires in ${expires_in}s ` +
      `(at ${new Date(tokenCache.expiresAt).toISOString()})`
  );
}

function basicCredentials() {
  const { CANVA_CLIENT_ID, CANVA_CLIENT_SECRET } = process.env;
  if (!CANVA_CLIENT_ID || !CANVA_CLIENT_SECRET) {
    throw new Error(
      "Missing CANVA_CLIENT_ID or CANVA_CLIENT_SECRET in environment variables."
    );
  }
  return Buffer.from(`${CANVA_CLIENT_ID}:${CANVA_CLIENT_SECRET}`).toString("base64");
}

/**
 * Fetches a fresh access token using the refresh_token grant.
 */
async function fetchNewToken() {
  const refreshToken = process.env.CANVA_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      "No CANVA_REFRESH_TOKEN available. Complete the OAuth flow first via GET /canva/auth"
    );
  }

  const res = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicCredentials()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Canva token refresh failed (${res.status}): ${text}`);
  }

  const tokenData = JSON.parse(text);
  storeTokenResponse(tokenData);
  return tokenData.access_token;
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

/**
 * Generates the Canva authorization URL and records the PKCE verifier.
 * Call this to start the OAuth flow; redirect the user to the returned URL.
 *
 * @returns {{ authUrl: string, state: string }}
 */
export function beginAuthFlow() {
  const codeVerifier = crypto.randomBytes(64).toString("base64url").slice(0, 96);
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  const state = crypto.randomBytes(32).toString("base64url");

  // Keep state for 10 minutes
  pendingAuth.set(state, { codeVerifier, expiresAt: Date.now() + 10 * 60_000 });

  const authUrl =
    `${CANVA_AUTH_BASE}?` +
    new URLSearchParams({
      response_type: "code",
      client_id: process.env.CANVA_CLIENT_ID,
      redirect_uri: CANVA_REDIRECT_URI,
      scope: CANVA_SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    }).toString();

  return { authUrl, state };
}

/**
 * Completes the OAuth flow: validates state, exchanges the code for tokens,
 * and primes the in-memory cache.
 *
 * @param {string} code   — authorization code from Canva callback
 * @param {string} state  — state param from Canva callback
 * @returns {Promise<void>}
 */
export async function completeAuthFlow(code, state) {
  const pending = pendingAuth.get(state);
  if (!pending) throw new Error("Unknown or expired OAuth state parameter.");
  if (Date.now() > pending.expiresAt) {
    pendingAuth.delete(state);
    throw new Error("OAuth state has expired. Please restart the auth flow.");
  }
  pendingAuth.delete(state);

  const res = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicCredentials()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: CANVA_REDIRECT_URI,
      code_verifier: pending.codeVerifier,
    }).toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Canva token exchange failed (${res.status}): ${text}`);
  }

  console.log(text)

  storeTokenResponse(JSON.parse(text));
}

/**
 * Returns a valid access token, fetching a new one only when necessary.
 *
 * @returns {Promise<string>}
 */
export async function getAccessToken() {
  if (isTokenExpired()) {
    return fetchNewToken();
  }
  return tokenCache.accessToken;
}