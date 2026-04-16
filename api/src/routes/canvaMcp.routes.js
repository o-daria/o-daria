/**
 * canvaMcp.routes.js
 *
 * OAuth 2.0 PKCE flow for the Canva MCP server (mcp.canva.com).
 * This is a separate auth flow from canva.routes.js (api.canva.com).
 *
 * One-time setup:
 *   1. GET /canva-mcp/register  — register this app via DCR (run once, saves CANVA_MCP_CLIENT_ID)
 *   2. GET /canva-mcp/auth      — redirect user to authorize
 *   3. Callback stores refresh token → presentation generation is now enabled
 */

import { Router } from 'express';
import {
  registerMcpClient,
  beginMcpAuthFlow,
  completeMcpAuthFlow,
} from '../services/canvaMcpAuth.service.js';

const router = Router();

// ── GET /canva-mcp/register — one-time DCR (run once per deployment) ──────────

router.get('/register', async (_req, res) => {
  try {
    const data = await registerMcpClient();
    res.json({
      message: 'Client registered. Set CANVA_MCP_CLIENT_ID in your .env and restart.',
      client_id: data.client_id,
    });
  } catch (err) {
    console.error('[CanvaMcpAuth] Registration error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /canva-mcp/auth — start OAuth flow ────────────────────────────────────

router.get('/auth', (_req, res) => {
  if (!process.env.CANVA_MCP_CLIENT_ID) {
    return res.status(500).json({
      error: 'canva_mcp_not_registered',
      message: 'Run GET /canva-mcp/register first to obtain a client_id.',
    });
  }

  const { authUrl } = beginMcpAuthFlow();
  res.redirect(authUrl);
});

// ── GET /canva-mcp/auth/callback — complete OAuth flow ────────────────────────

router.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(`<h1>Authorization denied</h1><p>${error}</p>`);
  }
  if (!code || !state) {
    return res.status(400).send('<h1>Missing code or state parameter</h1>');
  }

  try {
    await completeMcpAuthFlow(code, state);
    res.send(
      '<h1>Canva presentation generation connected!</h1>' +
      '<p>You can now generate presentations automatically. Close this tab.</p>'
    );
  } catch (err) {
    console.error('[CanvaMcpAuth] Callback error:', err.message);
    res.status(500).send(`<h1>Token exchange failed</h1><pre>${err.message}</pre>`);
  }
});

export default router;
