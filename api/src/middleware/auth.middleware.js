import { query } from '../db/client.js';

/**
 * authenticate — Express middleware for protected routes.
 *
 * Priority 1 (dev shortcut): If API_KEY env var is set and the bearer token
 *   matches it exactly, bypass DB lookup and attach the dev tenant ID.
 *
 * Priority 2 (production): Look up the token in the sessions table.
 *   Returns 401 if the session is not found or has expired.
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  // Dev shortcut: API_KEY bearer bypasses DB (never set in production)
  if (process.env.API_KEY && token === process.env.API_KEY) {
    req.tenantId = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000000';
    return next();
  }

  // Session lookup
  try {
    const result = await query(
      'SELECT tenant_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // tenant_id is UUID in sessions; cast to string for TEXT compat in existing tables
    req.tenantId = result.rows[0].tenant_id.toString();
    return next();
  } catch (err) {
    console.error('[Auth] Session lookup error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
