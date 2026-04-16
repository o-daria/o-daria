# Business Logic Model — Unit 1: Backend Authentication

## Flow 1: Google Login (`POST /auth/google`)

```
Input: { credential: string }

1. VALIDATE INPUT
   IF credential is missing or empty string
     RETURN 400 { error: "credential is required" }

2. VERIFY GOOGLE TOKEN
   payload = await OAuth2Client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID })
   IF verification fails (throws)
     RETURN 500 { error: "Authentication failed" }
   IF payload.email_verified !== true
     RETURN 500 { error: "Authentication failed" }

3. EXTRACT CLAIMS
   { sub, email, name } = payload

4. BEGIN DB TRANSACTION

5. UPSERT TENANT
   tenantName = email.split('@')[1]  -- e.g. "gmail.com"
   tenantId = deterministic lookup or new UUID
   INSERT INTO tenants (id, name, plan) VALUES (uuid(), tenantName, 'starter')
   ON CONFLICT (name) DO NOTHING  -- if name is unique; OR use SELECT first
   SELECT id FROM tenants WHERE name = tenantName

6. UPSERT USER
   INSERT INTO users (id, google_sub, email, name, tenant_id)
   VALUES (uuid(), sub, email, name, tenantId)
   ON CONFLICT (google_sub) DO UPDATE SET last_login_at = NOW()
   RETURNING id, email, name, created_at

7. CREATE SESSION
   token = crypto.randomBytes(32).toString('hex')
   INSERT INTO sessions (token, user_id, tenant_id, expires_at)
   VALUES (token, userId, tenantId, NOW() + INTERVAL '30 days')

8. COMMIT TRANSACTION

9. RETURN 200 {
     token,
     user: { id, email, name, createdAt }
   }

ON ANY TRANSACTION ERROR:
   ROLLBACK
   RETURN 500 { error: "Authentication failed" }
```

---

## Flow 2: Session Validation (`authenticate` middleware)

```
Input: req.headers.authorization

1. EXTRACT TOKEN
   token = authorization?.replace('Bearer ', '')
   IF token is missing
     RETURN 401 { error: "Missing Authorization header" }

2. CHECK API_KEY SHORTCUT
   IF process.env.API_KEY is set AND token === process.env.API_KEY
     req.tenantId = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000000'
     CALL next()
     RETURN

3. DB SESSION LOOKUP
   result = SELECT tenant_id FROM sessions
            WHERE token = $1 AND expires_at > NOW()
   IF result.rows.length === 0
     RETURN 401 { error: "Invalid or expired session" }

4. ATTACH TENANT
   req.tenantId = result.rows[0].tenant_id.toString()
   CALL next()
```

---

## Flow 3: S3 Image Upload (within `POST /reports`)

```
Input: req.files[] (from multer memoryStorage), reportId (UUID)

FOR EACH file IN req.files:

  1. DERIVE KEY
     ext = path.extname(file.originalname).toLowerCase() || '.bin'
     key = `profiles/${reportId}/${crypto.randomUUID()}${ext}`

  2. UPLOAD
     await S3Client.send(new PutObjectCommand({
       Bucket: process.env.S3_IMAGES_BUCKET,
       Key: key,
       Body: file.buffer,
       ContentType: file.mimetype,
     }))

  3. COLLECT KEY
     s3Keys.push(key)

  ON UPLOAD ERROR:
     log error (key, reportId — no PII)
     continue (partial upload — see BR-S3-02)

INSERT INTO reports (..., image_s3_keys) VALUES (..., s3Keys)
```

---

## Tenant Name Uniqueness Note

The tenant upsert strategy uses `email.split('@')[1]` (domain) as tenant name. Multiple users from the same email domain (e.g., both `alice@gmail.com` and `bob@gmail.com`) will share the same tenant. This is intentional for the MVP — a single Google Workspace domain = one tenant = shared data access. If isolation per individual user is needed in future, the strategy can change to `email` as tenant name (or a UUID always).

For the current release (1 expected user), this distinction is immaterial.
