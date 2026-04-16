---
paths:
  - "src/prompts/**"
---

Prompts are versioned in both the filesystem and the DB (`prompt_versions` table).
A file-only change is invisible to production — the DB copy is what the pipeline reads.

Before modifying any file in this directory:

1. **Bump the version** — edit the version string in `src/prompts/registry.js` for the
   prompt you are changing. Use semver-style strings (e.g. `v2.0` → `v2.1`).
   Never reuse an existing version string for new content.

2. **Re-seed after every template edit** — run `npm run seed-prompts` to register
   the new version in the DB. Until you do, the pipeline will keep using the old
   DB-stored prompt regardless of what the template file says.

3. **Prompts are append-only in production** — the `prompt_versions` table is
   insert-only by design. Old versions remain for audit and A/B testing. Never
   delete or update rows in that table.
