/**
 * canva.routes.js
 *
 * OAuth 2.0 PKCE flow for Canva, integrated into the Express app.
 *
 * Routes:
 *   GET /canva/auth           — redirect to Canva authorization page
 *   GET /canva/auth/callback  — exchange code for tokens, prime cache
 *
 * Register redirect URI in Canva Developer Portal:
 *   http://127.0.0.1:3300/canva/auth/callback
 */

import { Router } from "express";
import { beginAuthFlow, completeAuthFlow } from "../services/canvaAuth.service.js";

const router = Router();

// ── GET /canva/auth — start OAuth flow ───────────────────────────────────────

router.get("/auth", (_req, res) => {
  const { CANVA_CLIENT_ID, CANVA_CLIENT_SECRET } = process.env;
  if (!CANVA_CLIENT_ID || !CANVA_CLIENT_SECRET) {
    return res.status(500).json({
      error: "canva_not_configured",
      message: "CANVA_CLIENT_ID and CANVA_CLIENT_SECRET must be set in environment.",
    });
  }

  const { authUrl } = beginAuthFlow();
  res.redirect(authUrl);
});

// ── GET /canva/auth/callback — complete OAuth flow ────────────────────────────

router.get("/auth/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(`<h1>Authorization denied</h1><p>${error}</p>`);
  }
  if (!code || !state) {
    return res.status(400).send("<h1>Missing code or state parameter</h1>");
  }

  try {
    await completeAuthFlow(code, state);
    res.send(
      "<h1>Canva authorization successful!</h1>" +
      "<p>Token is now active. You can close this tab.</p>"
    );
  } catch (err) {
    console.error("[CanvaAuth] Callback error:", err.message);
    res.status(500).send(`<h1>Token exchange failed</h1><pre>${err.message}</pre>`);
  }
});

export default router;
