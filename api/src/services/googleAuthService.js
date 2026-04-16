import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { getClient } from '../db/client.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verify a Google ID token and return verified payload claims.
 * Throws if the token is invalid or email_verified is false.
 */
export async function verifyGoogleToken(credential) {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload.email_verified) {
    throw new Error('Google account email is not verified');
  }
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
  };
}

/**
 * Upsert the tenant record for a given email domain.
 * Returns the tenant's UUID (as string).
 * Runs inside the provided pg client (transaction context).
 */
async function upsertTenant(dbClient, email) {
  const tenantName = email.split('@')[1]; // e.g. "gmail.com"
  // Insert if not present, then always return the id
  await dbClient.query(
    `INSERT INTO tenants (id, name, plan)
     VALUES (uuid_generate_v4(), $1, 'starter')
     ON CONFLICT (name) DO NOTHING`,
    [tenantName],
  );
  const result = await dbClient.query(
    'SELECT id FROM tenants WHERE name = $1',
    [tenantName],
  );
  return result.rows[0].id;
}

/**
 * Upsert the user record for the given Google sub.
 * Returns { id, email, name, created_at }.
 * Runs inside the provided pg client (transaction context).
 */
async function upsertUser(dbClient, { sub, email, name }, tenantId) {
  const result = await dbClient.query(
    `INSERT INTO users (id, google_sub, email, name, tenant_id)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4)
     ON CONFLICT (google_sub) DO UPDATE SET last_login_at = NOW()
     RETURNING id, email, name, created_at`,
    [sub, email, name ?? null, tenantId],
  );
  return result.rows[0];
}

/**
 * Create a new session token and persist it.
 * Returns the token string.
 * Runs inside the provided pg client (transaction context).
 */
async function createSession(dbClient, userId, tenantId) {
  const token = crypto.randomBytes(32).toString('hex');
  await dbClient.query(
    `INSERT INTO sessions (token, user_id, tenant_id, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')`,
    [token, userId, tenantId],
  );
  return token;
}

/**
 * Full Google login flow: verify token → upsert tenant → upsert user → create session.
 * Entire DB work runs in a single transaction.
 * Returns { token, user: { id, email, name, createdAt } } on success.
 * Throws on any failure (caller maps to HTTP response).
 */
export async function loginWithGoogle(credential) {
  const payload = await verifyGoogleToken(credential);

  const dbClient = await getClient();
  try {
    await dbClient.query('BEGIN');

    const tenantId = await upsertTenant(dbClient, payload.email);
    const user = await upsertUser(dbClient, payload, tenantId);
    const token = await createSession(dbClient, user.id, tenantId);

    await dbClient.query('COMMIT');

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at,
      },
    };
  } catch (err) {
    await dbClient.query('ROLLBACK');
    throw err;
  } finally {
    dbClient.release();
  }
}
