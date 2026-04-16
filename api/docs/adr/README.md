# Architecture Decision Records

This directory captures the key architectural decisions for the Audience Intelligence platform.

Format follows [Michael Nygard's ADR template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions): Status, Context, Decision, Consequences.

## Index

| # | Decision | Category | Status |
|---|----------|----------|--------|
| [ADR-0001](0001-async-polling-api.md) | Async report generation with polling | API Design | Accepted |
| [ADR-0002](0002-deterministic-pipeline.md) | Deterministic pipeline routing | Pipeline | Accepted |
| [ADR-0003](0003-validation-gate-clarification-retry.md) | Semantic validation gate with clarification retry | Pipeline | Accepted |
| [ADR-0004](0004-brand-dna-compilation.md) | Brand DNA compilation as structured intermediate | RAG | Accepted |
| [ADR-0005](0005-three-layer-rag.md) | Three-layer RAG system | RAG | Accepted |
| [ADR-0006](0006-dual-embedding-providers.md) | Dual embedding provider support | RAG | Accepted |
| [ADR-0007](0007-batch-api-profile-analysis.md) | Batch API for profile analysis | Cost | Accepted |
| [ADR-0008](0008-handle-pseudonymization.md) | Handle pseudonymization with SHA256 | Security | Accepted |
| [ADR-0009](0009-output-signing-integrity.md) | Output signing with integrity block | Security | Accepted |
| [ADR-0010](0010-db-backed-prompt-versioning.md) | DB-backed immutable prompt versioning | Prompts | Accepted |
| [ADR-0011](0011-injection-defense-xml-wrapping.md) | Injection defense with XML wrapping | Security | Accepted |
| [ADR-0012](0012-local-pipeline-bypass.md) | Local pipeline bypass for dev/testing | DevEx | Accepted |

## Pipeline Sequence Diagram

See [docs/pipeline-sequence.md](../pipeline-sequence.md) for a Mermaid sequence diagram of the full request lifecycle.

## Documentation Platform Recommendation

**Top pick: [GitBook](https://www.gitbook.com/)** — syncs directly from a GitHub repo, renders Mermaid natively, free for open-source / affordable for startups.

| Platform | Git-native | Mermaid support | Pricing | Best for |
|----------|-----------|-----------------|---------|----------|
| **GitBook** | Bi-directional GitHub sync | Native | Free (OSS) / $8/user/mo | ADRs, runbooks, API docs living alongside code |
| **Backstage** (Spotify) | TechDocs plugin reads from repo | Via plugin | Free (self-hosted) | Teams that also need a service catalog / developer portal |
| **Docusaurus** (Meta) | Static site from Markdown in repo | Via plugin | Free (self-hosted on Vercel/Netlify) | Public-facing docs, versioned docs tied to releases |

All three keep Markdown as the source of truth in git. GitBook requires the least setup — connect a repo and it publishes automatically. Backstage is heavier but adds service catalog and CI visibility. Docusaurus is best if you want a polished public docs site.
