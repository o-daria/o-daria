/**
 * canvaMcpToken.middleware.js
 *
 * Guards routes that call the Canva MCP server (mcp.canva.com).
 * Returns 403 with an auth_url if the MCP OAuth flow hasn't been completed,
 * so the client knows to redirect the user to connect.
 */

import { getMcpAccessToken, isMcpAuthConfigured } from '../services/canvaMcpAuth.service.js';

export async function ensureCanvaMcpToken(req, res, next) {
  if (!isMcpAuthConfigured()) {
    return res.status(403).json({
      error: 'canva_mcp_not_connected',
      message: 'Canva presentation generation is not connected. Complete the one-time setup.',
      auth_url: '/canva-mcp/auth',
    });
  }

  try {
    req.canvaMcpToken = await getMcpAccessToken();
    next();
  } catch (err) {
    console.error('[CanvaMcpToken] Failed to obtain MCP token:', err.message);
    res.status(403).json({
      error: 'canva_mcp_auth_failed',
      message: 'Could not authenticate with the Canva MCP server.',
      auth_url: '/canva-mcp/auth',
    });
  }
}
