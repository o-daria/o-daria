# User Personas

# Marketing Audience Analysis Platform (ui)

**Version**: 1.0  
**Date**: 2026-04-07

---

## Persona 1: Marketing Analyst

**Name**: Alex Chen  
**Role**: Marketing Analyst at a mid-sized marketing agency  
**Experience**: 3–5 years in digital marketing

### Profile

Alex runs audience research for client campaigns. They spend most of their day gathering audience insights, building reports, and presenting findings to clients. They are comfortable with digital tools but are not a developer.

### Goals

- Quickly create and organize audience analysis projects per client
- Automatically get audience insights without manual data wrangling
- Generate polished Canva presentations to share with clients without doing design work
- Track the status of multiple projects simultaneously

### Frustrations

- Manually compiling audience data from social media profiles is time-consuming
- Switching between multiple tools to produce a client-ready presentation
- Waiting without visibility when background processes are running
- Losing work due to session timeouts or unclear save states

### Behaviors

- Creates 3–5 new projects per week
- Revisits existing projects regularly to check report status
- Frequently generates presentations right after a report becomes available
- Works across multiple devices (desktop primary, laptop occasionally)

### Story Mapping

- EPIC-01 (Authentication): all stories
- EPIC-02 (Project Management): all stories
- EPIC-03 (Reports): all stories
- EPIC-04 (Canva): all stories

---

## Persona 2: Agency Manager

**Name**: Sarah Müller  
**Role**: Senior Account Manager / Agency Lead  
**Experience**: 8+ years in marketing and account management

### Profile

Sarah oversees a team of analysts. She uses the platform less frequently than Alex — mainly to review completed reports and verify that presentations are ready before client meetings. She is focused on outcomes and quality, not day-to-day data operations.

### Goals

- Quickly review completed audience analysis reports before client calls
- Verify that Canva presentations have been generated and look correct
- Have confidence that project data (brand values, design guidelines) is captured accurately
- Spend as little time as possible navigating the tool

### Frustrations

- Deep navigation to find a specific project's report
- Unclear project status — needs at-a-glance understanding of where each project stands
- Having to re-do work because an analyst entered incomplete project information

### Behaviors

- Opens the platform 2–3 times per week
- Focuses on the project list and report view
- Rarely creates projects herself; mostly reviews existing ones
- Values clear status indicators and summary-level views

### Story Mapping

- EPIC-01 (Authentication): login, logout
- EPIC-02 (Project Management): view project list, view project details
- EPIC-03 (Reports): view audience report summary cards
- EPIC-04 (Canva): view Canva presentation link

---

## Persona 3: New User / Onboarding

**Name**: Jamie Park  
**Role**: Junior Marketing Analyst, new hire  
**Experience**: 0–1 year; first time using this platform

### Profile

Jamie just joined the agency and is being onboarded onto the platform. They need to understand how to register, set up their account, and create their first project without needing to ask for help. Clear guidance, empty states, and error messages are critical to their experience.

### Goals

- Register and log in without confusion
- Understand what information is needed for a project before starting to fill it in
- Know what to do next at each stage (what happens after I create a project? What does "Processing" mean?)
- Recover easily from mistakes (wrong password, incomplete form)

### Frustrations

- Unclear form field labels or missing help text
- No feedback after submitting a form ("did it save?")
- Confusing error messages that don't say what went wrong
- Feeling lost on empty states with no guidance

### Behaviors

- Registers once; unlikely to revisit registration flow
- May attempt password reset if they forget credentials
- Needs guided empty states ("Create your first project") on first login
- More likely to read labels and tooltips than experienced users

### Story Mapping

- EPIC-01 (Authentication): register, login, password reset
- EPIC-02 (Project Management): create first project (onboarding empty state)
- EPIC-03 (Reports): first report view (processing state, report ready)
- EPIC-04 (Canva): first presentation generation
