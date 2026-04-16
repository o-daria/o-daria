import { Router } from 'express';
import { loginWithGoogle } from '../services/googleAuthService.js';

const router = Router();

/**
 * POST /auth/google
 *
 * Body: { credential: string }  — Google ID token from @react-oauth/google
 *
 * Response 200: { token, user: { id, email, name, createdAt } }
 * Response 400: { error: "credential is required" }
 * Response 500: { error: "Authentication failed" }
 */
router.post('/google', async (req, res) => {
  const { credential } = req.body ?? {};

  if (!credential || typeof credential !== 'string' || credential.trim() === '') {
    return res.status(400).json({ error: 'credential is required' });
  }

  try {
    const result = await loginWithGoogle(credential);
    return res.status(200).json(result);
  } catch (err) {
    // Never expose internals or credential details in the error response
    console.error('[Auth] Google login error:', err.message);
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

export default router;
