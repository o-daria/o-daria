/**
 * canvaToken.middleware.js
 *
 * Optional Express middleware that can be mounted on any route group
 * that calls the Canva API.  It ensures a valid token is in the cache
 * BEFORE the request handler runs, so the first real Canva call is never
 * delayed by a token fetch.
 *
 * Usage (in your router or app.js):
 *
 *   const { ensureCanvaToken } = require('./middleware/canvaToken.middleware');
 *   router.use('/canva', ensureCanvaToken, canvaRouter);
 */

import { getAccessToken } from "../services/canvaAuth.service.js";

/**
 * Express middleware – resolves immediately if the token is already warm;
 * fetches one otherwise.
 */
export async function ensureCanvaToken(req, res, next) {
  try {
    // getAccessToken() only hits the network when the cache is cold/expired.
    req.canvaToken = await getAccessToken();
    next();
  } catch (err) {
    console.error("[CanvaToken] Failed to obtain Canva token:", err.message);
    res.status(502).json({
      error: "canva_auth_failed",
      message: "Could not authenticate with the Canva API.",
    });
  }
}