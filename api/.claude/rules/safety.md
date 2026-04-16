---
paths:
  - "src/safety/**"
---

These files are the AI security boundary. Changes here affect all tenants.
Before modifying any file in this directory:

1. Check if the change weakens injection detection (inputSanitizer.js)
2. Check if the change reduces PII protection (piiHandler.js)
3. Check if the change breaks checksum verification (outputSigner.js)
   When in doubt, add — never remove — from INJECTION_PATTERNS.
