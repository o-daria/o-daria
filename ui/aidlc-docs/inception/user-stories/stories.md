# User Stories

# Marketing Audience Analysis Platform (ui)

**Version**: 1.0  
**Date**: 2026-04-07  
**Breakdown**: Epic-Based + User Journey hybrid  
**Granularity**: Medium (one story per significant user action)  
**Acceptance Criteria Format**: Gherkin (Given / When / Then)

---

## EPIC-01: Authentication

---

### US-AUTH-01 — Register with Email and Password

**As a** new user,  
**I want to** register for an account using my email address and a password,  
**So that** I can access the platform and start creating projects.

**Personas**: New User (Jamie)  
**INVEST Check**: Independent ✓ | Negotiable ✓ | Valuable ✓ | Estimable ✓ | Small ✓ | Testable ✓

**Acceptance Criteria**:

```gherkin
Feature: User Registration

  Scenario: Successful registration
    Given I am on the registration page
    When I enter a valid email address and a password of at least 8 characters
    And I submit the registration form
    Then my account is created
    And I am redirected to the project dashboard with an empty state

  Scenario: Registration with an already-used email
    Given I am on the registration page
    When I enter an email address that is already registered
    And I submit the registration form
    Then I see a generic error message indicating the email is unavailable
    And my password is not exposed in the error message

  Scenario: Registration with a weak password
    Given I am on the registration page
    When I enter a password shorter than 8 characters
    And I submit the registration form
    Then I see an inline validation error on the password field
    And the form is not submitted

  Scenario: Registration with an invalid email format
    Given I am on the registration page
    When I enter a string that is not a valid email address
    And I submit the registration form
    Then I see an inline validation error on the email field
    And the form is not submitted
```

---

### US-AUTH-02 — Log In with Email and Password

**As a** registered user,  
**I want to** log in using my email address and password,  
**So that** I can access my projects and reports.

**Personas**: Marketing Analyst (Alex), Agency Manager (Sarah), New User (Jamie)  
**INVEST Check**: Independent ✓ | Negotiable ✓ | Valuable ✓ | Estimable ✓ | Small ✓ | Testable ✓

**Acceptance Criteria**:

```gherkin
Feature: User Login

  Scenario: Successful login
    Given I am on the login page
    When I enter my registered email and correct password
    And I submit the login form
    Then I am authenticated
    And I am redirected to my project dashboard

  Scenario: Login with incorrect password
    Given I am on the login page
    When I enter my registered email and an incorrect password
    And I submit the login form
    Then I see a generic error message ("Invalid email or password")
    And I remain on the login page

  Scenario: Login with unregistered email
    Given I am on the login page
    When I enter an email address that is not registered
    And I submit the login form
    Then I see the same generic error message ("Invalid email or password")
    And no indication is given whether the email exists in the system

  Scenario: Brute force protection
    Given I am on the login page
    When I submit the login form with incorrect credentials 5 or more times consecutively
    Then the login endpoint enforces a progressive delay or CAPTCHA challenge
    And I see an appropriate message explaining the restriction

  Scenario: Accessing a protected route without a session
    Given I am not logged in
    When I navigate directly to a protected page (e.g., project dashboard)
    Then I am redirected to the login page
    And after successful login I am returned to the page I originally requested
```

---

### US-AUTH-03 — Log Out

**As an** authenticated user,  
**I want to** log out of the platform,  
**So that** my session is terminated and my account is secure.

**Personas**: Marketing Analyst (Alex), Agency Manager (Sarah)  
**INVEST Check**: Independent ✓ | Negotiable ✓ | Valuable ✓ | Estimable ✓ | Small ✓ | Testable ✓

**Acceptance Criteria**:

```gherkin
Feature: User Logout

  Scenario: Successful logout
    Given I am authenticated and on any page
    When I click the logout button
    Then my session token is invalidated server-side
    And I am redirected to the login page

  Scenario: Accessing a protected route after logout
    Given I have logged out
    When I navigate to a protected page or press the browser back button
    Then I am redirected to the login page
    And my previous session data is not accessible
```

---

### US-AUTH-04 — Reset Password

**As a** registered user who has forgotten their password,  
**I want to** reset my password via email,  
**So that** I can regain access to my account.

**Personas**: New User (Jamie), Marketing Analyst (Alex)  
**INVEST Check**: Independent ✓ | Negotiable ✓ | Valuable ✓ | Estimable ✓ | Small ✓ | Testable ✓

**Acceptance Criteria**:

```gherkin
Feature: Password Reset

  Scenario: Request password reset with a registered email
    Given I am on the login page
    When I click "Forgot password"
    And I enter a registered email address
    And I submit the password reset request
    Then I see a confirmation message that a reset email has been sent
    And a password reset link is sent to my email address

  Scenario: Request password reset with an unregistered email
    Given I am on the password reset request page
    When I enter an email address that is not registered
    And I submit the password reset request
    Then I see the same confirmation message (to avoid email enumeration)
    And no reset email is sent

  Scenario: Use a valid reset link to set a new password
    Given I have received a password reset link in my email
    When I open the link within its validity period
    And I enter a new password of at least 8 characters and confirm it
    And I submit the form
    Then my password is updated
    And I am redirected to the login page

  Scenario: Use an expired or already-used reset link
    Given I have a password reset link that has expired or was already used
    When I open the link
    Then I see an error message indicating the link is invalid or expired
    And I am offered the option to request a new reset link
```

---

## EPIC-02: Project Management

---

### US-PROJ-01 — Create a New Project

**As a** marketing analyst,  
**I want to** create a new audience analysis project by providing project details,  
**So that** the system can begin analyzing the target audience.

**Personas**: Marketing Analyst (Alex), New User (Jamie)  
**INVEST Check**: Independent ✓ | Negotiable ✓ | Valuable ✓ | Estimable ✓ | Small ✓ | Testable ✓

**Acceptance Criteria**:

```gherkin
Feature: Create Project

  Scenario: Successfully create a new project
    Given I am authenticated and on the project dashboard
    When I click "New Project"
    And I fill in the project name, brand values, brand design guidelines, and at least one audience social media profile
    And I submit the form
    Then a new project is created with status DRAFT
    And I am redirected to the project detail page
    And the project appears in my project list

  Scenario: Submit project form with missing required fields
    Given I am on the new project form
    When I submit the form without filling in all required fields
    Then inline validation errors are shown for each missing required field
    And the form is not submitted

  Scenario: Empty state guidance for first-time users
    Given I am a new user with no existing projects
    When I land on the project dashboard
    Then I see an empty state with a call-to-action prompt ("Create your first project")
    And clicking it opens the new project form

  Scenario: Project data is saved correctly
    Given I have created a project with name "Brand X Campaign", brand values "Innovative", design guidelines "Blue palette", and social profile "instagram.com/brandx"
    When I view the project detail page
    Then all fields are displayed with the values I entered
```

---

### US-PROJ-02 — View Project List

**As an** authenticated user,  
**I want to** see a list of all my projects with their current status,  
**So that** I can quickly navigate to a specific project or understand its progress.

**Personas**: Marketing Analyst (Alex), Agency Manager (Sarah)  
**INVEST Check**: Independent ✓ | Negotiable ✓ | Valuable ✓ | Estimable ✓ | Small ✓ | Testable ✓

**Acceptance Criteria**:

```gherkin
Feature: Project List

  Scenario: View list of projects
    Given I am authenticated and have one or more projects
    When I navigate to the project dashboard
    Then I see a list of my projects
    And each project shows its name and current status (DRAFT / PROCESSING / REPORT_READY / PRESENTATION_READY)

  Scenario: Project list shows only my projects
    Given I am authenticated as User A
    When I view the project dashboard
    Then I only see projects I own
    And projects belonging to other users are not visible

  Scenario: Empty project list
    Given I am authenticated and have no projects
    When I navigate to the project dashboard
    Then I see an empty state with a prompt to create my first project
```

---

### US-PROJ-03 — View Project Details

**As an** authenticated user,  
**I want to** open a project and view its full details and current status,  
**So that** I can review the project information and understand where it is in the analysis pipeline.

**Personas**: Marketing Analyst (Alex), Agency Manager (Sarah)  
**INVEST Check**: Independent ✓ | Negotiable ✓ | Valuable ✓ | Estimable ✓ | Small ✓ | Testable ✓

**Acceptance Criteria**:

```gherkin
Feature: View Project Details

  Scenario: View project details
    Given I am authenticated and have an existing project
    When I click on a project in the project list
    Then I see the project detail page with all fields: name, brand values, brand design guidelines, audience social media profiles, and current status

  Scenario: Attempt to view another user's project by URL
    Given I am authenticated as User A
    When I navigate directly to the detail URL of a project owned by User B
    Then I receive a 403 or 404 response
    And the project data is not displayed
```

---

### US-PROJ-04 — Edit Project Information

**As a** marketing analyst,  
**I want to** edit an existing project's information,  
**So that** I can correct or update project details before or after analysis.

**Personas**: Marketing Analyst (Alex)  
**INVEST Check**: Independent ✓ | Negotiable ✓ | Valuable ✓ | Estimable ✓ | Small ✓ | Testable ✓

**Acceptance Criteria**:

```gherkin
Feature: Edit Project

  Scenario: Successfully edit a project
    Given I am authenticated and viewing a project I own
    When I click "Edit"
    And I update one or more fields
    And I save the changes
    Then the project is updated with the new values
    And I see a confirmation that the changes were saved
    And the updated values are reflected on the project detail page

  Scenario: Edit with invalid data
    Given I am editing a project
    When I clear a required field and attempt to save
    Then I see an inline validation error
    And the changes are not saved

  Scenario: Attempt to edit another user's project via API
    Given I am authenticated as User A
    When I send an edit request for a project owned by User B
    Then the request is rejected with a 403 response
    And the project data is unchanged
```

---

### US-PROJ-05 — Delete a Project

**As a** marketing analyst,  
**I want to** delete a project I no longer need,  
**So that** my project list stays clean and relevant.

**Personas**: Marketing Analyst (Alex)  
**INVEST Check**: Independent ✓ | Negotiable ✓ | Valuable ✓ | Estimable ✓ | Small ✓ | Testable ✓

**Acceptance Criteria**:

```gherkin
Feature: Delete Project

  Scenario: Successfully delete a project
    Given I am authenticated and viewing a project I own
    When I click "Delete"
    And I confirm the deletion in the confirmation dialog
    Then the project is permanently deleted
    And I am redirected to the project list
    And the deleted project no longer appears in my list

  Scenario: Cancel deletion
    Given I have clicked "Delete" on a project
    When I click "Cancel" in the confirmation dialog
    Then the project is not deleted
    And I remain on the project detail page

  Scenario: Attempt to delete another user's project via API
    Given I am authenticated as User A
    When I send a delete request for a project owned by User B
    Then the request is rejected with a 403 response
    And the project is not deleted
```

---

## EPIC-03: Audience Analysis Reports

---

### US-REPORT-01 — View Audience Analysis Report

**As a** marketing analyst,  
**I want to** view my audience analysis results as structured summary cards once the report is ready,  
**So that** I can understand the audience profile and insights for my client.

**Personas**: Marketing Analyst (Alex), Agency Manager (Sarah), New User (Jamie — first report)  
**INVEST Check**: Independent ✓ | Negotiable ✓ | Valuable ✓ | Estimable ✓ | Small ✓ | Testable ✓

**Acceptance Criteria**:

```gherkin
Feature: Audience Analysis Report

  Scenario: Report is automatically triggered when project data is complete
    Given I have created a project with all required fields
    When the project status transitions to PROCESSING
    Then the system automatically calls the external analysis API
    And I see a "Processing..." indicator on the project detail page and project card

  Scenario: Report becomes available
    Given my project is in PROCESSING status
    When the external API returns the analysis results
    Then the project status changes to REPORT_READY
    And the report summary cards are displayed on the project detail page
    And each card shows the relevant audience metric with a label and value

  Scenario: Returning to a project that already has a report
    Given my project has status REPORT_READY
    When I open the project detail page
    Then the report summary cards are immediately visible without triggering a new fetch

  Scenario: External API returns an error
    Given my project is in PROCESSING status
    When the external API returns an error or times out
    Then the project displays an error state with a generic error message
    And a "Retry" action is available
    And no stack traces or internal details are shown to the user
```

---

## EPIC-04: Canva Presentation Generation

---

### US-CANVA-01 — Generate a Canva Presentation

**As a** marketing analyst,  
**I want to** generate a Canva presentation from my audience analysis report and receive a link to view it,  
**So that** I can share a polished, visual summary with my client without doing design work.

**Personas**: Marketing Analyst (Alex), Agency Manager (Sarah — verifies), New User (Jamie — first presentation)  
**INVEST Check**: Independent ✓ | Negotiable ✓ | Valuable ✓ | Estimable ✓ | Small ✓ | Testable ✓

**Acceptance Criteria**:

```gherkin
Feature: Canva Presentation Generation

  Scenario: Generate Presentation button is available only when report is ready
    Given I am viewing a project
    When the project status is REPORT_READY or PRESENTATION_READY
    Then the "Generate Presentation" button is visible and enabled
    When the project status is DRAFT or PROCESSING
    Then the "Generate Presentation" button is not visible or is disabled

  Scenario: Successfully generate a Canva presentation
    Given I am viewing a project with status REPORT_READY
    When I click "Generate Presentation"
    Then the UI shows a progress/loading indicator
    And the UI calls the first backend API endpoint (setup step)
    And upon success calls the second backend API endpoint (generate step)
    And upon success the project status changes to PRESENTATION_READY
    And a link to the generated Canva design is displayed on the project page

  Scenario: Open the generated Canva design
    Given a Canva presentation link is displayed on the project page
    When I click the link
    Then the Canva design opens in a new browser tab

  Scenario: First backend endpoint (setup step) fails
    Given I have clicked "Generate Presentation"
    When the first backend API endpoint returns an error
    Then the progress indicator is dismissed
    And I see a generic error message
    And the second endpoint is NOT called
    And a "Try Again" action is available

  Scenario: Second backend endpoint (generate step) fails
    Given the first backend API endpoint succeeded
    When the second backend API endpoint returns an error
    Then I see a generic error message
    And a "Try Again" action is available (retrying from the beginning of the flow)

  Scenario: Regenerate an existing presentation
    Given my project already has status PRESENTATION_READY and a Canva link
    When I click "Generate Presentation" again
    Then the generation flow runs again
    And the new Canva link replaces or is added alongside the previous link
```

---

## Story Summary

| Epic    | Story ID     | Title                            | Personas                   |
| ------- | ------------ | -------------------------------- | -------------------------- |
| EPIC-01 | US-AUTH-01   | Register with Email and Password | New User                   |
| EPIC-01 | US-AUTH-02   | Log In with Email and Password   | All                        |
| EPIC-01 | US-AUTH-03   | Log Out                          | Analyst, Manager           |
| EPIC-01 | US-AUTH-04   | Reset Password                   | New User, Analyst          |
| EPIC-02 | US-PROJ-01   | Create a New Project             | Analyst, New User          |
| EPIC-02 | US-PROJ-02   | View Project List                | Analyst, Manager           |
| EPIC-02 | US-PROJ-03   | View Project Details             | Analyst, Manager           |
| EPIC-02 | US-PROJ-04   | Edit Project Information         | Analyst                    |
| EPIC-02 | US-PROJ-05   | Delete a Project                 | Analyst                    |
| EPIC-03 | US-REPORT-01 | View Audience Analysis Report    | All                        |
| EPIC-04 | US-CANVA-01  | Generate a Canva Presentation    | Analyst, Manager, New User |

**Total**: 11 stories across 4 epics
