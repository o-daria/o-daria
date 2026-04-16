---
paths:
  - "src/rag/**"
---

The segment library is append-only by design. Never add DELETE or UPDATE
operations to segmentLibrary.js — only INSERTs and SELECTs.
The profile cache is the only RAG layer with TTL expiry.
Embeddings default to Ollama nomic-embed-text (768 dims). OpenAI
text-embedding-3-small (1536 dims) is available via EMBEDDING_PROVIDER=openai.
Do not change the model without also updating the vector() column size in schema.sql.
