# Story Generation Plan

# Marketing Audience Analysis Platform (o_daria_ui)

**Phase**: INCEPTION — User Stories  
**Status**: PLANNING — Awaiting user answers  
**Date**: 2026-04-07

---

## Execution Checklist

### Part 1 — Planning

- [x] Step 1: Validate User Stories Need (complete — see user-stories-assessment.md)
- [x] Step 2: Create Story Plan (this document)
- [x] Step 3: Generate clarifying questions (see Section 2 below)
- [x] Step 4: Include mandatory story artifacts in plan
- [x] Step 5: Present story breakdown approach options (see Section 3 below)
- [x] Step 6: Store Story Plan (this file)
- [x] Step 7: User fills in all [Answer]: tags
- [x] Step 8: Collect and validate all answers
- [x] Step 9: Analyze answers for ambiguities — no contradictions found
- [x] Step 10: Follow-up clarification (if needed) — N/A, all answers clear
- [x] Step 13: Plan approved — proceeding to generation

### Part 2 — Generation

- [x] Step 15: Load approved plan
- [x] Step 16: Generate personas.md — aidlc-docs/inception/user-stories/personas.md
- [x] Step 16: Generate stories.md — aidlc-docs/inception/user-stories/stories.md
- [x] Step 17: Update progress and state
- [ ] Step 20: Present completion message
- [ ] Step 21: Await explicit user approval of generated stories
- [ ] Step 23: Update aidlc-state.md — User Stories COMPLETE

---

## Section 1: Methodology — Story Breakdown Approach

Five approaches are available. Each has trade-offs:

| Approach               | Best For                                    | Trade-Off                               |
| ---------------------- | ------------------------------------------- | --------------------------------------- |
| **User Journey-Based** | Apps with clear end-to-end flows            | Can duplicate cross-cutting concerns    |
| **Feature-Based**      | Feature-rich products with clear boundaries | May miss user context between features  |
| **Persona-Based**      | Multi-user-type products                    | Overlapping stories for shared features |
| **Domain-Based**       | Complex business logic, DDD contexts        | Requires upfront domain modeling        |
| **Epic-Based**         | Large products with hierarchical features   | Extra overhead for MVP-scale projects   |

**Recommended for this project**: **Epic-Based + User Journey** hybrid — group by functional epic (Auth, Projects, Reports, Canva) with stories written as journey steps within each epic. This maps naturally to the micro-frontend modules.

---

## Section 2: Clarifying Questions

Please answer each question by filling in the letter after the `[Answer]:` tag.  
If none of the options fit, choose X and describe your preference.

---

### Q1 — Story Breakdown Approach

Which story breakdown approach should be used?

A) Epic-Based + User Journey hybrid (recommended — aligns with micro-frontend modules: Auth, Projects, Reports, Canva)
B) Feature-Based (stories organized around individual features within each area)
C) Persona-Based (stories grouped by who is doing the action)
D) Domain-Based (stories organized by business domain/DDD bounded context)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q2 — Persona Definition

How many distinct user personas should be created for this product?

A) One persona — "Marketing Analyst" (single role, all users are the same)
B) Two personas — "Marketing Analyst" (daily user) + "Agency Manager" (oversight, less frequent)
C) Three personas — "Marketing Analyst" + "Agency Manager" + "New User / Onboarding" (to cover first-time experience)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Q3 — Story Granularity

At what level of granularity should stories be written?

A) Coarse — one story per major feature (e.g., "User can manage projects") — faster, less detail
B) Medium — one story per significant user action (e.g., "User can create a project", "User can edit a project") — balanced
C) Fine — one story per atomic UI interaction (e.g., "User can fill in brand values field") — most detail, more stories
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q4 — Acceptance Criteria Format

What format should acceptance criteria follow?

A) Gherkin (Given / When / Then) — structured, directly usable in automated tests
B) Bullet-point checklist — simpler, quicker to write and read
C) Both — Gherkin for integration-critical stories (API flows, auth), bullet points for UI stories
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q5 — Report Display Stories

The report is fetched automatically and displayed as structured summary cards. What level of detail is needed for report-related stories?

A) One story: "As a user, I can view my audience analysis report as summary cards"
B) Separate stories for: (1) waiting/processing state, (2) viewing the report cards, (3) error/retry state
C) Separate stories for each metric card type (requires knowing the report data schema from the external API)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q6 — Canva Generation Flow Stories

The Canva generation involves two backend API steps. How should this be captured in stories?

A) One story: "As a user, I can generate a Canva presentation and receive a link"
B) Two stories: (1) triggering the generation, (2) receiving and displaying the Canva link
C) Three stories: (1) trigger, (2) progress/waiting state, (3) success with link + error handling
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q7 — Priority / MoSCoW

Should stories be tagged with MoSCoW priorities (Must Have / Should Have / Could Have / Won't Have)?

A) Yes — tag each story with MoSCoW to align with phased delivery (MVP vs Phase 2)
B) No — all stories are in scope; no prioritization needed at this stage
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q8 — Out-of-Scope Stories

Should "Won't Have" stories be written for Phase 1 out-of-scope items (e.g., project sharing, social login, admin panel)?

A) Yes — document them as out-of-scope stories to capture future intent
B) No — omit out-of-scope items entirely; include only what will be built
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Section 3: Mandatory Artifacts (will be generated after plan approval)

| Artifact      | Path                                            | Description                                                    |
| ------------- | ----------------------------------------------- | -------------------------------------------------------------- |
| `personas.md` | `aidlc-docs/inception/user-stories/personas.md` | User archetypes with goals, frustrations, and story mappings   |
| `stories.md`  | `aidlc-docs/inception/user-stories/stories.md`  | Full user stories with INVEST criteria and acceptance criteria |

---

## Section 4: Proposed Story Epics (draft — will be refined after answers)

Based on the requirements, the following epics are proposed:

| Epic                                   | Description                                                | Approx. Story Count |
| -------------------------------------- | ---------------------------------------------------------- | ------------------- |
| EPIC-01: Authentication                | Register, login, logout, password reset                    | 4–6                 |
| EPIC-02: Project Management            | Create, list, view, edit, delete projects                  | 5–7                 |
| EPIC-03: Audience Analysis Reports     | Status tracking, report display, error handling            | 3–5                 |
| EPIC-04: Canva Presentation Generation | Trigger generation, progress, link display, error handling | 3–4                 |

Total estimated stories: **15–22** (depends on granularity answer in Q3)
