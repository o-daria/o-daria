---
paths:
  - "src/pipeline/**"
---

This is the orchestration layer. Changes here affect report correctness and data integrity.

Before modifying any file in this directory:

1. **Never swallow ValidationError** — `validateJob.runValidation()` throws `ValidationError`
   on critical issues. The orchestrator catches it and runs one clarification retry via
   `withClarificationRetry()`. If you catch a `ValidationError` and don't re-throw,
   the retry never fires and the report silently produces bad output.

2. **Always pseudonymize before cache writes** — any call to
   `profileCache.setCachedAnalysis()` must receive an analysis that has already been
   processed by `pseudonymizeAnalysis()`. Plaintext handles must never enter the
   shared `profile_analyses` table.

3. **Always sign before persistence** — every completed report must pass through
   `signReport()` before being written to the DB. `GET /reports/:id` verifies the
   checksum on read and returns 500 on mismatch. Skipping the sign step breaks
   all report reads.
