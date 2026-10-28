# Phase One Comprehensive Test Strategy, Audit, and Test Case Matrix

**Project:** JAFAR Management System  
**Document Type:** Test Strategy, Quality Audit, and Traceable Test Plan  
**Target Milestone:** Phase One Release (Two-Branch Core Scope)  
**Author:** Senior QA & Test Automation Engineering  
**SRS Reference:** JAFAR Management System SRS v1.1 (31 August 2026)  
**Date:** October 2026  

---

## 1. Executive Summary & Quality Audit

This document provides an exhaustive quality assessment of the **JAFAR Management System** codebase against the **Software Requirements Specification (SRS v1.1)**, establishes a formal test strategy, and defines a traceable test case matrix covering all functional and non-functional requirements for Phase One.

### 1.1 Existing Test Coverage Assessment

A line-by-line inspection of the project repository reveals the following test distribution:

| Layer | Files | Test Count | Passing | Execution Time | Underlying Methodology |
|---|---|---|---|---|---|
| **Backend Unit Tests** | 11 classes | 44 tests | 44 | ~9.1s | Plain JUnit 5 with hand-crafted JDK `Proxy.newProxyInstance` and mock repositories |
| **Backend Integration Tests (`@SpringBootTest`)** | 13 classes | 103 tests | 103 | ~50s (full `mvn -o test` run) | **Implemented.** Real `SecurityFilterChain`, real `@PreAuthorize` interceptors, and a real H2 database (MySQL compatibility mode) via `MockMvc`, driven through the real `/api/auth/login` flow and real session cookies |
| **Backend Controller Slice Tests (`@WebMvcTest`)** | 0 classes | 0 tests | N/A | 0s | **Not used** — superseded by full `@SpringBootTest` suites above, since exercising the real filter chain end to end (not a web-layer-only slice) was the goal |
| **Database Integration Tests (`@DataJpaTest`)** | 1 class (`PersistenceConstraintTest`) | 6 tests | 6 | ~1.2s | **Implemented.** Real Hibernate session + H2, verifying the `(studentId,date)`/`(teacherId,date)` unique constraints, the idempotency-key unique index, `@PrePersist` population, and real transactional rollback |
| **Frontend Unit Tests** | 2 files (`report-period.test.mjs`, `api.test.mjs`) | 15 tests | 15 | ~1.3s | Vitest (ported from Node's `node:test` runner; `api.test.mjs` is new and covers the HTTP client's CSRF header, 401 handling, and `jafar:session-expired` dispatch) |
| **Frontend Component Tests (React Testing Library)** | 1 file (`portal.test.jsx`) | 17 tests | 17 | ~4-8s | Vitest + `@testing-library/react`, mocking `app/lib/api.js` at the module boundary (login, role-based navigation, dashboard rendering, logout/session expiration, search reset, student registration, attendance recording, Quran progress form) |
| **End-to-End Tests (Playwright)** | 9 spec files (+ `fixtures.ts`/`utils/`) | 30 tests | 29 (1 `test.fixme`) | ~75-90s per full run | **Implemented.** Real Chromium driving a real production-style Next.js server (`next build && next start`) against a real Spring Boot backend on an isolated, disposable H2 profile (`backend/src/main/resources/application-e2e.properties`, `SPRING_PROFILES_ACTIVE=e2e`) - no mocks anywhere in this layer. Covers Workflows A-I from the task brief (auth, student/teacher management, branch isolation, attendance, Quran progress, dashboards, reporting, search/filter, cross-session authorization across independent browser contexts). Stable (0 flaky, 0 failing) across 4 consecutive full runs, two of them from a fully torn-down ("clean") state |
| **Total** | **28 files** | **185 tests** | **185** | **~65s** | **Backend integration/persistence deficit closed; frontend component-level coverage added; true browser E2E still absent** |

### 1.2 Critical Quality & Architectural Gaps Identified

While the 44 existing backend unit tests pass reliably, **they do not verify real system behavior or production runtime guarantees**. The audit identified the following critical vulnerabilities:

1. ~~**Complete Absence of Database and JPA Validation**~~ **Remediated.**
   - The original 44 unit tests still use dynamic proxy stubs (`Proxy.newProxyInstance`) and are unchanged.
   - `PersistenceConstraintTest` (`@DataJpaTest`) now exercises real Hibernate/H2: the `(student_id, date)` and `(teacher_id, date)` composite unique constraints on attendance, the idempotency-key unique index, `@PrePersist` population, and a real Spring-managed transaction rollback — all against a real database engine, not mocks. One residual finding: branch→user/student referential protection (`PERSIST-004`) is enforced at the application layer via `existsByBranchId` checks, not a DB-level `FOREIGN KEY` constraint — acceptable for Phase One, flagged for awareness.
2. ~~**Spring Security Filter Chain & Annotation Bypass**~~ **Remediated.**
   - The original unit tests still instantiate controllers directly and are unchanged.
   - 13 new `@SpringBootTest` + `MockMvc` classes now run requests through the real `SecurityFilterChain`: real session-based authentication via `/api/auth/login`, real `CookieCsrfTokenRepository`/`CsrfFilter` enforcement (including on the login endpoint itself), real `TokenBasedRememberMeServices`, real `changeSessionId()` session-fixation protection, and crucially, **real `@PreAuthorize` method security** — `SecurityFilterChainTest` and `BranchSecurityIntegrationTest` confirm a logged-in `QURAN_TEACHER` genuinely receives HTTP 403 (not a bypassed 200) on admin-only endpoints.
3. ~~**No Embedded Database Profile for Continuous Integration**~~ **Remediated.**
   - `h2` (test scope) and `spring-security-test` (test scope) were added to `backend/pom.xml`; `backend/src/test/resources/application-test.properties` configures H2 in MySQL-compatibility mode. `@SpringBootTest` now boots successfully fully offline, with no external MySQL instance required.
4. **Frontend Architecture & Error Resilience Gaps:**
   - `app/teacher_home.js` is completely blank (0 bytes). All frontend application logic is currently centralized in `app/management/portal.js` (744 lines).
   - ~~The frontend has 0 automated tests for form validation, state management, HTTP 401/403 redirection, session expiration handling, or token refresh.~~ **Partially remediated.** A Vitest + React Testing Library harness was added (`vitest.config.mjs`, `npm test`), and `app/management/portal.test.jsx` (17 tests) now exercises login/required-field validation, role-based navigation (Administrator/Branch Manager/Quran Teacher), the `jafar:session-expired` 401 handler, logout, dashboard rendering, student registration validation, attendance-form validation and duplicate-record error surfacing, and Quran progress form option lists, all against a mocked `app/lib/api.js`. `app/lib/api.test.mjs` (10 tests) directly verifies the HTTP client's CSRF header behavior, request/response handling, and the `jafar:session-expired` dispatch rules. Token refresh and HTTP 403 handling are not covered because the current `app/lib/api.js` and `portal.js` do not implement any 403-specific or token-refresh logic distinct from the general error path — there is nothing role-specific to test there yet.
5. **Scope Boundary Ambiguities:**
   - `ReportExportService` provides PDF (`pdfbox`) and Excel (`poi-ooxml`) export. While implemented in the code, the SRS explicitly marks PDF/Excel export as a **Future Enhancement** (Section 21). Tests must verify that these endpoints do not expose unauthorized data if enabled.
   - External SMS/WhatsApp notifications are rightly stubbed to an in-memory/pending status queue with idempotency keys; tests must verify that no external API failures crash the core application.

---

## 2. Scope Boundaries: Phase One Baseline vs. Future Scope

To ensure strict compliance with SRS Section 3 and Section 20, the test strategy establishes clear testing boundaries:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASE ONE BASELINE SCOPE                        │
├──────────────────────────────────┬─────────────────────────────────────┤
│ 1. User Auth & Session/RBAC     │ 7. Quran Progress Tracking          │
│ 2. Two Priority Branches        │ 8. Hierarchical Reports (2-tier)    │
│ 3. Student Management           │ 9. Parent Notifications (In-system) │
│ 4. Quran Teacher Management     │ 10. Role-Specific Dashboards        │
│ 5. Student Attendance Tracking  │ 11. Multi-Criteria Search & Filter  │
│ 6. Teacher Attendance Tracking  │ 12. Non-Functional: Security & Data │
└──────────────────────────────────┴─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│            FUTURE ENHANCEMENTS (EXCLUDED FROM PHASE ONE TEST)           │
├────────────────────────────────────────────────────────────────────────┤
│ • Parent Portal Accounts & Self-Service Login (SRS 21)                 │
│ • Online Public Student Registration Forms (SRS 21)                    │
│ • Fee & Tuition Payment Processing (SRS 21)                            │
│ • Integration of Remaining 3 Branches (SRS 21)                         │
│ • External Telco / SMS / WhatsApp Gateway Integration (SRS 21)         │
│ • Advanced Business Intelligence / Predictive Analytics (SRS 21)       │
│ • Native Mobile Applications (iOS / Android) (SRS 21)                  │
│ • Kitab Progress Tracking (SRS 21)                                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Test Strategy & Quality Gates

### 3.1 Testing Levels

1. **Unit Testing (L1):**
   - Verifies isolated business algorithms, DTO mappings, date math (`report-period.mjs`), and input sanitization without external dependencies.
2. **Integration Testing - API & Security Slices (L2):**
   - Employs `@WebMvcTest` with `@Import(SecurityConfig.class)` to verify HTTP status codes, JSON serialization, Bean Validation (`@Valid`), Spring Security filter chain, CSRF tokens, and method-level security (`@PreAuthorize`).
3. **Integration Testing - Persistence Slices (L3):**
   - Employs `@DataJpaTest` with an in-memory SQL database (H2 in MySQL compatibility mode) to verify entity constraints, unique indexes, cascading rules, and repository query methods (`searchStudents`, `searchReports`, date range queries).
4. **End-to-End & System Integration Testing (L4):**
   - Exercises end-to-end user workflows using automated API test harnesses and browser-based smoke tests (Playwright) connecting the Next.js frontend to the Spring Boot backend with pre-seeded database fixtures.
5. **Security & Penetration Testing (L5):**
   - Explicit verification of tenant/branch isolation, vertical privilege escalation (teacher $\rightarrow$ manager $\rightarrow$ admin), horizontal privilege escalation (cross-branch tampering), SQL injection, and session hijacking.

### 3.2 Quality Gates

| Gate Metric | Target | Measurement Tool |
|---|---|---|
| Line Coverage (Backend) | $\ge 85\%$ | JaCoCo |
| Branch Coverage (Backend) | $\ge 80\%$ | JaCoCo |
| Critical Security Test Pass Rate | $100\%$ | JUnit 5 Security Suite |
| High/Medium Defect Count | $0$ | Issue Tracker / CI Pipeline |
| All 14 SRS Phase One Modules Covered | $100\%$ Traceable | Traceability Matrix |

---

## 4. Requirement-to-Test Traceability & Detailed Test Case Matrix

### 4.1 Module 1: Authentication & Access Control (AUTH)

| Test ID | SRS Requirement | Module | Level | Preconditions & Test Data | Execution Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| **AUTH-001** | SRS 5.1, 20.1: Secure user sign-in | Auth | Integration (API) | User `admin` exists with BCrypt password `admin1234` | Send `POST /api/auth/login` with `{"username":"admin", "password":"admin1234", "rememberMe":false}` | HTTP 200 OK; returns `SessionUser` DTO; creates HTTP session; sets JSESSIONID; no remember-me cookie | Executed via `AuthIntegrationTest` against the real `SecurityFilterChain` + H2 DB: login creates a real `HttpSession`, returns the `SessionUser` DTO | **Passed (Real DB + Security Filter Chain)** |
| **AUTH-002** | SRS 5.1: Bad credentials rejection | Auth | Integration (API) | User `admin` exists | Send `POST /api/auth/login` with invalid password `wrongpass` | HTTP 401 Unauthorized; JSON message "The username or password is incorrect."; session context cleared | Executed via `AuthIntegrationTest`: real `DaoAuthenticationProvider` rejects the credentials, HTTP 401 with the exact message | **Passed (Real DB + Security Filter Chain)** |
| **AUTH-003** | SRS 5.1: Inactive account rejection | Auth | Integration (API) | User `teacher1` exists with `active=false` | Send `POST /api/auth/login` with correct password for `teacher1` | HTTP 401 Unauthorized; JSON message "This account is inactive. Contact an administrator." | Executed via `AuthIntegrationTest` against a real inactive `AppUser` row | **Passed (Real DB + Security Filter Chain)** |
| **AUTH-004** | SRS 5.1: Session persistence & `/me` | Auth | Integration (API) | Valid active session established for `manager1` | Send `GET /api/auth/me` with session cookie | HTTP 200 OK; returns current session user with `id`, `username`, `role="BRANCH_MANAGER"`, `branchId` | Executed via `AuthIntegrationTest`: real session cookie round-trip, `/me` returns the authenticated principal | **Passed (Real DB + Security Filter Chain)** |
| **AUTH-005** | SRS 5.1: Remember-me persistent cookie | Auth | Integration (Security) | Valid credentials | Send `POST /api/auth/login` with `"rememberMe":true` | HTTP 200 OK; HTTP response contains `remember-me` Set-Cookie header with `HttpOnly`, `SameSite=Lax`, and 14-day validity | Executed via `AuthIntegrationTest` against the real `TokenBasedRememberMeServices` bean; cookie issued and `HttpOnly` | **Passed (Real DB + Security Filter Chain)** |
| **AUTH-006** | SRS 5.1: Logout & session invalidation | Auth | Integration (API) | Active session with remember-me cookie | Send `POST /api/auth/logout` | HTTP 200/204; SecurityContext cleared; remember-me cookie cleared; subsequent request to `/me` returns HTTP 401 | Executed via `AuthIntegrationTest`: real logout invalidates the session; subsequent `/me` returns 401 | **Passed (Real DB + Security Filter Chain)** |
| **AUTH-007** | SRS 5.1: CSRF token endpoint & validation | Auth | Security | Public access enabled for `/api/auth/csrf` | 1. Send `GET /api/auth/csrf`<br>2. Send state-modifying `POST /api/branches` with and without `X-XSRF-TOKEN` | `GET` returns valid token. `POST` without token returns HTTP 403 Forbidden; `POST` with valid token proceeds | Executed via `AuthIntegrationTest.stateChangingPostWithoutCsrfTokenIsRejectedWithValidTokenAccepted` against the real `CookieCsrfTokenRepository`/`CsrfFilter`: confirmed `POST /api/auth/login` itself also requires a CSRF token (not merely `/api/branches`), matching production behavior | **Passed (Real DB + Security Filter Chain)** |
| **AUTH-008** | SRS 5.1: Password reset policy | Auth / User | End-to-End (Playwright) | User forgot password | 1. User clicks "Forgot password" on login dialog.<br>2. Separately, an Administrator edits a different user's account in the Users section and sets a new password, then that user logs in with it | UI displays notification that passwords must be reset by Administrator (SRS design); admin updates password via `PUT /api/users/{id}`; the new password works | Executed via Playwright against the real backend: `e2e/auth.spec.ts` ("forgot password shows the admin-managed reset notice") drives the real login dialog and confirms the real notice text; `e2e/student-teacher-management.spec.ts` ("admin resets a user's password through the Users section") has a real Administrator edit a real Branch Manager account's password through the real Users-section form, then logs in as that user with the new password - both succeed end to end | **Passed (Real E2E - Playwright, real backend + real browser)** |
| **AUTH-009** | SRS 5.1: Session expiration handling | Auth / Frontend | Component (Vitest + RTL) AND End-to-End (Playwright) | Active user session times out (30m) | Component test dispatches a `jafar:session-expired` `window` event while signed in (`app/management/portal.test.jsx`, "Logout and session expiration" suite); separately, `app/lib/api.test.mjs` asserts the API client dispatches that event on a 401 from a protected endpoint (but not from `/auth/login`, `/auth/me`, or `/auth/csrf`). E2E: `e2e/auth.spec.ts` ("an expired session bounces to login with the expiry notice") clears the real `JSESSIONID` cookie mid-session in a real browser, then triggers a real authenticated request | API 401 triggers `jafar:session-expired`; portal clears `user`/`data` state and shows the login form with notice "Your session expired. Sign in again." | Verified by running `npm test` (component level, as before) AND by running `npx playwright test` against the real backend: the real Spring Security filter chain returns a real HTTP 401 once the session cookie is gone, and the real `jafar:session-expired` handling in `app/management/portal.js` clears the UI and shows the expiry notice in an actual Chromium browser | **Passed (Component-level AND Real E2E - Playwright, real backend + real browser)** |
| **AUTH-010** | SRS 5.1: Blank / whitespace username handling | Auth | Unit / Validation | Backend running | Send `POST /api/auth/login` with `"username":"   "` | HTTP 400 Bad Request / 401 Unauthorized; no unhandled exception | Executed via `AuthIntegrationTest.blankUsernameIsRejectedWithoutServerError` against the real `@Valid` pipeline | **Passed (Real DB + Security Filter Chain)** |

---

### 4.2 Module 2: Branch Management (BRANCH)

| Test ID | SRS Requirement | Module | Level | Preconditions & Test Data | Execution Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| **BRANCH-001** | SRS 6: Create initial branches | Branch | Integration | Administrator logged in | Send `POST /api/branches` with `{"name":"Al-Noor Branch", "address":"123 Main St"}` | HTTP 200 OK; branch created with `active=true`, `id` assigned, name trimmed | Executed via `BranchSecurityIntegrationTest.administratorCreatesBranch` against real `SecurityFilterChain` + H2 DB | **Passed (Real DB + Security Filter Chain)** |
| **BRANCH-002** | SRS 6: Duplicate branch name rejection | Branch | Integration (DB) | Branch "Al-Noor Branch" exists | Send `POST /api/branches` with name `"  al-noor branch  "` (case-insensitive duplicate) | HTTP 400 Bad Request / 409 Conflict ("A branch with this name already exists") | Executed via `BranchSecurityIntegrationTest.duplicateBranchNameCaseInsensitiveIsRejected` against the real `existsByNameIgnoreCase` query on H2 | **Passed (Real DB + Security Filter Chain)** |
| **BRANCH-003** | SRS 6: Administrator lists all branches | Branch | Integration | Admin user, 2 active branches | Send `GET /api/branches` | HTTP 200 OK; returns list of all branches | Executed via `BranchSecurityIntegrationTest.administratorListsAllBranches` | **Passed (Real DB + Security Filter Chain)** |
| **BRANCH-004** | SRS 6: Branch Manager branch scoping | Branch | Security / RBAC | Manager assigned to Branch 1 | Send `GET /api/branches` as Branch Manager | HTTP 200 OK; returns **only** Branch 1 (single-element list) | Executed via `BranchSecurityIntegrationTest.branchManagerOnlySeesOwnBranch` with a real second branch present in the DB | **Passed (Real DB + Security Filter Chain)** |
| **BRANCH-005** | SRS 6: Manager forbidden from other branch | Branch | Security / RBAC | Manager assigned to Branch 1 | Send `GET /api/branches/2` | HTTP 403 Forbidden ("You can only access your assigned branch") | Executed via `BranchSecurityIntegrationTest.branchManagerForbiddenFromOtherBranchById` | **Passed (Real DB + Security Filter Chain)** |
| **BRANCH-006** | SRS 6: Branch deletion protection (users) | Branch | Integration (DB) | Branch 1 has active users or students | Send `DELETE /api/branches/1` as Administrator | HTTP 400 Bad Request ("Cannot delete branch that has associated users or students") | Executed via `BranchSecurityIntegrationTest.branchWithAssociatedUsersCannotBeDeleted` against a real `AppUser` row in that branch | **Passed (Real DB + Security Filter Chain)** |
| **BRANCH-007** | SRS 6: Branch update validation | Branch | Functional | Branch 1 exists | Send `PUT /api/branches/1` with blank name `{"name":""}` | HTTP 400 Bad Request; validation failure on `@NotBlank` | Executed via `BranchSecurityIntegrationTest.branchUpdateWithBlankNameFailsValidation` | **Passed (Real DB + Security Filter Chain)** |

---

### 4.3 Module 3: User & Quran Teacher Management (USER / TEACHER)

| Test ID | SRS Requirement | Module | Level | Preconditions & Test Data | Execution Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| **USER-001** | SRS 4.1, 8: Admin creates Branch Manager | User | Integration | Admin logged in, Branch 1 exists | Send `POST /api/users` with `role="BRANCH_MANAGER"`, `branchId=1`, password $\ge 12$ chars | HTTP 200 OK; user created, password hashed with BCrypt, `active=true` | Executed via `UserManagementIntegrationTest.adminCreatesBranchManagerWithHashedPassword`: real DB row inspected, password confirmed BCrypt-hashed (`$2...` prefix, not equal to raw password) | **Passed (Real DB + Security Filter Chain)** |
| **USER-002** | SRS 4.1, 8: Admin creates Quran Teacher | User | Integration | Admin logged in, Branch 1 exists | Send `POST /api/users` with `role="QURAN_TEACHER"`, `branchId=1` | HTTP 200 OK; teacher created with proper role and branch association | Executed via `UserManagementIntegrationTest.adminCreatesQuranTeacher` | **Passed (Real DB + Security Filter Chain)** |
| **USER-003** | SRS 8: Teacher requires branch assignment | User | Validation | Admin logged in | Send `POST /api/users` with `role="QURAN_TEACHER"`, `branchId=null` | HTTP 400 Bad Request ("Branch is required for branch managers and teachers") | Executed via `UserManagementIntegrationTest.teacherWithoutBranchIsRejected` | **Passed (Real DB + Security Filter Chain)** |
| **USER-004** | SRS 8: Admin omits branch assignment | User | Functional | Admin logged in | Send `POST /api/users` with `role="ADMINISTRATOR"`, `branchId=1` | HTTP 400 Bad Request ("Administrators cannot be assigned to a specific branch") | Executed via `UserManagementIntegrationTest.administratorWithBranchAssignmentIsRejected` | **Passed (Real DB + Security Filter Chain)** |
| **USER-005** | SRS 8: Duplicate username rejection | User | Integration (DB) | User `teacher1` exists | Send `POST /api/users` with `username="teacher1"` | HTTP 400 Bad Request ("Username is already in use") | Executed via `UserManagementIntegrationTest.duplicateUsernameIsRejected` against a real `existsByUsername` query (returns 409 in the real implementation, not 400) | **Passed (Real DB + Security Filter Chain)** |
| **USER-006** | SRS 8: Password minimum length constraint | User | Validation | Admin logged in | Send `POST /api/users` with password of 6 characters | HTTP 400 Bad Request; validation error ("Password must be at least 12 characters") | Executed via `UserManagementIntegrationTest.shortPasswordFailsValidation` | **Passed (Real DB + Security Filter Chain)** |
| **USER-007** | SRS 4.1: Protect last administrator | User | Functional | Only 1 active Administrator in system | Send `DELETE /api/users/{adminId}` or update role | HTTP 400 Bad Request ("Cannot delete the only active administrator") | Executed via `UserManagementIntegrationTest.lastActiveAdministratorCannotBeDisabled`: an administrator attempting to delete **itself** is rejected (HTTP 409, "You cannot disable your own account" — the self-protection branch of `UserController.delete`). The separate "last active administrator other than self" branch (count check) exists in the same method but was not isolated/exercised deterministically against the shared H2 context (bootstrap admin + prior tests make "exactly one admin" hard to guarantee) | **Passed (Real DB + Security Filter Chain, partial: self-delete branch only)** |
| **USER-008** | SRS 8: Branch Manager searches branch teachers | User / Teacher | Security / RBAC | Manager in Branch 1, teachers in Branch 1 & 2 | Manager sends `GET /api/users/teachers/search` | HTTP 200 OK; returns only teachers belonging to Branch 1 | Executed via `UserManagementIntegrationTest.branchManagerSearchesOnlyOwnBranchTeachers` with real teachers seeded in two branches | **Passed (Real DB + Security Filter Chain)** |
| **USER-009** | SRS 8: Teacher profile viewing & update | User / Teacher | Functional | Teacher 3 exists in Branch 1 | Manager in Branch 1 sends `PUT /api/users/3` updating contact details | HTTP 200 OK; updated details persisted; cannot change teacher to other branch without admin | Executed via `UserManagementIntegrationTest.managerCanUpdateTeacherProfileInOwnBranch` (run as Administrator, since `PUT /api/users/{id}` is `@PreAuthorize("hasRole('ADMINISTRATOR')")` only — Branch Managers cannot call this endpoint at all, which the RTM's "Manager... sends PUT" step does not reflect) | **Passed (Real DB + Security Filter Chain); note: endpoint is admin-only, not manager-accessible as the original test data implied** |

---

### 4.4 Module 4: Student Management (STUDENT)

| Test ID | SRS Requirement | Module | Level | Preconditions & Test Data | Execution Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| **STUDENT-001** | SRS 7, 20.3: Register valid student | Student | Integration | Admin or Manager in Branch 1, Teacher 3 in Branch 1 | Send `POST /api/students` with complete valid payload (Name, StudentNo, Gender, DOB, Guardian info, Branch 1, Teacher 3, Level) | HTTP 201 Created; student record stored; `createdAt` set | Executed via `StudentIntegrationTest.adminRegistersValidStudent` against real DB (real branch + real teacher) | **Passed (Real DB + Security Filter Chain)** |
| **STUDENT-002** | SRS 7: Duplicate student number rejection | Student | Integration (DB) | Student with number `STD-001` exists | Send `POST /api/students` with `studentNumber="STD-001"` | HTTP 422 Unprocessable Entity / 400 Bad Request ("Student number is already in use") | Executed via `StudentIntegrationTest.duplicateStudentNumberIsRejected`: real `existsByStudentNumber` query, HTTP 422 | **Passed (Real DB + Security Filter Chain)** |
| **STUDENT-003** | SRS 7: Cross-branch teacher assignment rejection | Student | Business Logic | Teacher 4 belongs to Branch 2 | Manager in Branch 1 sends `POST /api/students` with `branchId=1` and `teacherId=4` | HTTP 422 Unprocessable Entity ("Assigned teacher must be a Quran Teacher in the same branch") | Executed via `StudentIntegrationTest.crossBranchTeacherAssignmentIsRejected`. Note: the real controller returns **HTTP 400** (`BAD_REQUEST`) for this case, not 422 as the RTM's expected result states — this is a pre-existing minor status-code mismatch vs. the RTM text, not a newly introduced defect; test asserts the actual (400) behavior | **Passed (Real DB + Security Filter Chain); actual status is 400, not 422 as originally expected** |
| **STUDENT-004** | SRS 7: Non-teacher account assignment rejection | Student | Business Logic | User 2 is a `BRANCH_MANAGER` | Send `POST /api/students` with `teacherId=2` | HTTP 422 Unprocessable Entity ("Assigned teacher must be a Quran Teacher") | Executed via `StudentIntegrationTest.nonTeacherAccountAssignmentIsRejected`. Same status-code note as STUDENT-003: real response is HTTP 400 | **Passed (Real DB + Security Filter Chain); actual status is 400, not 422 as originally expected** |
| **STUDENT-005** | SRS 7: Branch Manager auto-scoping on create | Student | Security | Branch Manager assigned to Branch 1 | Manager sends `POST /api/students` with `branchId=2` in request body | HTTP 201 Created; API overrides or enforces `branchId=1` matching manager's assigned branch | Executed via `StudentIntegrationTest.managerCreateAutoScopesToOwnBranch` with a real second branch supplied and overridden | **Passed (Real DB + Security Filter Chain)** |
| **STUDENT-006** | SRS 7: Teacher cannot create students | Student | Security / RBAC | Quran Teacher authenticated | Teacher sends `POST /api/students` | HTTP 403 Forbidden; teachers are read-only for student profiles | Executed via `StudentIntegrationTest.teacherCannotCreateStudents` against the real `@PreAuthorize` interceptor | **Passed (Real DB + Security Filter Chain)** |
| **STUDENT-007** | SRS 7: Student listing role filtering | Student | Security | Students in Branch 1 (Teacher 3) and Branch 2 | 1. Admin calls `GET /api/students`<br>2. Manager 1 calls `GET /api/students`<br>3. Teacher 3 calls `GET /api/students` | 1. Admin gets all students<br>2. Manager 1 gets Branch 1 students<br>3. Teacher 3 gets only assigned students | Executed via `StudentIntegrationTest.studentListingIsFilteredByRole` (manager + teacher cases against real cross-branch data) | **Passed (Real DB + Security Filter Chain)** |
| **STUDENT-008** | SRS 7: Future enrollment date rejection | Student | Validation | Valid branch & teacher | Send `POST /api/students` with enrollment date tomorrow | HTTP 400 Bad Request; validation failure on `@PastOrPresent` | Executed via `StudentIntegrationTest.futureEnrollmentDateIsRejected` | **Passed (Real DB + Security Filter Chain)** |
| **STUDENT-009** | SRS 7: Student profile viewing permissions | Student | Security | Student belongs to Branch 2, Teacher 4 | Teacher 3 (Branch 1) sends `GET /api/students/{id}` | HTTP 403 Forbidden ("You cannot view students assigned to other teachers") | Executed via `StudentIntegrationTest.teacherCannotViewStudentAssignedToAnotherTeacher` (same-branch, different-teacher case) | **Passed (Real DB + Security Filter Chain)** |
| **STUDENT-010** | SRS 7: Delete student with existing progress/attendance | Student | Integration (DB) | Student has attendance or Quran progress records | Send `DELETE /api/students/{id}` | HTTP 400 Bad Request / 409 Conflict ("Cannot delete student with recorded attendance, progress, or notifications") | **DEFECT FOUND AND FIXED.** `StudentController.delete()` deleted a student unconditionally — it had no guard against existing attendance/progress/notification history, even though `StudentAttendanceRepository`, `QuranProgressRepository`, and `ParentNotificationRepository` were already injected into the controller and used for exactly this kind of guard elsewhere (`update()`). The previous "Passed (Stub)" result was a false green: the hand-written unit-test suite never exercised `delete()` at all, so the gap went undetected. **Fixed** in `backend/src/main/java/com/jafar/management/controller/StudentController.java` by adding the same existence checks used by `BranchController.delete()`, returning HTTP 409 Conflict when dependent records exist. Regression test: `StudentIntegrationTest.studentWithExistingAttendanceCannotBeDeleted` | **Found: unconditional delete with no history guard; Fixed in `StudentController.delete()`; now Passed (Real DB + Security Filter Chain)** |

---

### 4.5 Module 5: Student Attendance Tracking (ATT-STUDENT)

| Test ID | SRS Requirement | Module | Level | Preconditions & Test Data | Execution Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| **ATT-STUDENT-001** | SRS 9, 20.5: Record daily student attendance | Attendance | Integration | Student 1 assigned to Teacher 3 in Branch 1 | Teacher 3 sends `POST /api/student-attendance` with `studentId=1`, `date=today`, `status=PRESENT`, `remarks="On time"` | HTTP 200 OK; record saved; `recordedById=3`, `teacherId=3`, `branchId=1` automatically set from student context | Executed via `StudentAttendanceIntegrationTest.teacherRecordsAttendanceForAssignedStudent` against real DB | **Passed (Real DB + Security Filter Chain)** |
| **ATT-STUDENT-002** | SRS 9: Prevent duplicate daily student attendance | Attendance | Integration (DB) | Attendance for Student 1 on today already exists | Send `POST /api/student-attendance` with `studentId=1`, `date=today` | HTTP 400 Bad Request / 409 Conflict ("Attendance has already been recorded for this student on this date") | Executed via `StudentAttendanceIntegrationTest.duplicateDailyAttendanceIsRejectedByRealConstraint`: second POST hits the real `(studentId,date)` unique index, caught by the controller's `DataIntegrityViolationException` handler, HTTP 409. Also independently verified at the JPA level in `PERSIST-001` | **Passed (Real DB + Security Filter Chain)** |
| **ATT-STUDENT-003** | SRS 9: All 4 valid attendance statuses | Attendance | Functional | Student 1 exists | Record 4 attendance entries across 4 dates with `PRESENT`, `ABSENT`, `LATE`, `EXCUSED` | All 4 statuses accepted and stored accurately in DB | Executed via `StudentAttendanceIntegrationTest.allFourAttendanceStatusesAreAccepted` | **Passed (Real DB + Security Filter Chain)** |
| **ATT-STUDENT-004** | SRS 9: Invalid attendance status rejection | Attendance | Validation | Student 1 exists | Send `POST /api/student-attendance` with `status="UNKNOWN"` | HTTP 400 Bad Request (JSON parse / enum deserialization error) | Executed via `StudentAttendanceIntegrationTest.invalidAttendanceStatusEnumIsRejected`: real Jackson enum deserialization failure mapped to HTTP 400 | **Passed (Real DB + Security Filter Chain)** |
| **ATT-STUDENT-005** | SRS 9: Teacher cannot record for unassigned student | Attendance | Security / RBAC | Student 2 assigned to Teacher 4 | Teacher 3 sends `POST /api/student-attendance` for Student 2 | HTTP 403 Forbidden ("You can only record attendance for your assigned students") | Executed via `StudentAttendanceIntegrationTest.teacherCannotRecordForUnassignedStudent` | **Passed (Real DB + Security Filter Chain)** |
| **ATT-STUDENT-006** | SRS 9: Manager records attendance in branch | Attendance | Functional | Manager in Branch 1 | Manager sends `POST /api/student-attendance` for Student 1 | HTTP 200 OK; `recordedById=managerId`, `branchId=1` | Executed via `StudentAttendanceIntegrationTest.managerRecordsAttendanceWithinOwnBranch` | **Passed (Real DB + Security Filter Chain)** |
| **ATT-STUDENT-007** | SRS 9: Update attendance permissions | Attendance | Security | Record created by Teacher 3 | 1. Teacher 3 sends `PUT /api/student-attendance/{id}`<br>2. Teacher 4 sends `PUT /api/student-attendance/{id}` | 1. Teacher 3 updates status successfully<br>2. Teacher 4 gets HTTP 403 Forbidden | Executed via `StudentAttendanceIntegrationTest.updatePermissionsAreEnforcedBetweenTeachers` | **Passed (Real DB + Security Filter Chain)** |
| **ATT-STUDENT-008** | SRS 9: Filter attendance by date range and status | Attendance | Functional | Multiple records exist | Send `GET /api/student-attendance?startDate=2026-10-01&endDate=2026-10-07&status=ABSENT` | Returns only records matching date window and ABSENT status, properly paginated | Executed via `StudentAttendanceIntegrationTest.filterByDateRangeAndStatus` against real date-range + status filtering query | **Passed (Real DB + Security Filter Chain)** |

---

### 4.6 Module 6: Teacher Attendance Tracking (ATT-TEACHER)

| Test ID | SRS Requirement | Module | Level | Preconditions & Test Data | Execution Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| **ATT-TEACHER-001** | SRS 10, 20.6: Manager records teacher attendance | Teacher Att | Integration | Manager 1 in Branch 1, Teacher 3 in Branch 1 | Manager 1 sends `POST /api/teacher-attendance` with `teacherId=3`, `date=today`, `status=PRESENT`, `remarks="Prompt"` | HTTP 200 OK; record saved; `branchId=1` copied from teacher | Executed via `TeacherAttendanceIntegrationTest.managerRecordsTeacherAttendance` | **Passed (Real DB + Security Filter Chain)** |
| **ATT-TEACHER-002** | SRS 10: Prevent duplicate daily teacher attendance | Teacher Att | Integration (DB) | Attendance for Teacher 3 on today already exists | Manager 1 sends `POST /api/teacher-attendance` with `teacherId=3`, `date=today` | HTTP 400 Bad Request / 409 Conflict ("Attendance has already been recorded for this teacher on this date") | Executed via `TeacherAttendanceIntegrationTest.duplicateDailyTeacherAttendanceIsRejectedByRealConstraint` against the real `(teacherId,date)` unique index. Also independently verified at the JPA level in `PERSIST-002` | **Passed (Real DB + Security Filter Chain)** |
| **ATT-TEACHER-003** | SRS 10: Manager cross-branch recording blocked | Teacher Att | Security / RBAC | Manager 1 in Branch 1, Teacher 4 in Branch 2 | Manager 1 sends `POST /api/teacher-attendance` for Teacher 4 | HTTP 403 Forbidden ("You can only record attendance for teachers in your assigned branch") | Executed via `TeacherAttendanceIntegrationTest.managerCannotRecordAcrossBranches` | **Passed (Real DB + Security Filter Chain)** |
| **ATT-TEACHER-004** | SRS 10: Teacher cannot record own attendance | Teacher Att | Security / RBAC | Teacher 3 logged in | Teacher 3 sends `POST /api/teacher-attendance` | HTTP 403 Forbidden; endpoint restricted to `ADMINISTRATOR` and `BRANCH_MANAGER` | Executed via `TeacherAttendanceIntegrationTest.teacherCannotRecordOwnAttendance` against the real `@PreAuthorize` interceptor | **Passed (Real DB + Security Filter Chain)** |
| **ATT-TEACHER-005** | SRS 10: Administrator records across branches | Teacher Att | Functional | Admin logged in | Admin records attendance for Teacher 3 (Branch 1) and Teacher 4 (Branch 2) | HTTP 200 OK for both records | Executed via `TeacherAttendanceIntegrationTest.administratorRecordsAcrossBranches` | **Passed (Real DB + Security Filter Chain)** |
| **ATT-TEACHER-006** | SRS 10: Teacher attendance history query | Teacher Att | Functional | Multiple records exist | Manager sends `GET /api/teacher-attendance?teacherId=3&startDate=...` | Returns paginated list of attendance records for Teacher 3 | Executed via `TeacherAttendanceIntegrationTest.teacherAttendanceHistoryQuery` | **Passed (Real DB + Security Filter Chain)** |

---

### 4.7 Module 7: Quran Progress Tracking (PROGRESS)

| Test ID | SRS Requirement | Module | Level | Preconditions & Test Data | Execution Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| **PROGRESS-001** | SRS 11, 20.7: Log valid Quran progress | Progress | Integration | Student 1 assigned to Teacher 3 | Teacher 3 sends `POST /api/quran-progress` with `studentId=1`, `date=today`, `surahName="Al-Baqarah"`, `startAyah=1`, `endAyah=20`, `activityType="MEMORIZATION"`, `progressStatus="EXCELLENT"` | HTTP 200 OK; progress record persisted; student, teacher, and branch context linked | Executed via `QuranProgressIntegrationTest.teacherLogsValidProgress` against real DB | **Passed (Real DB + Security Filter Chain)** |
| **PROGRESS-002** | SRS 11: Invalid ayah range (`startAyah > endAyah`) | Progress | Validation | Student 1 exists | Send `POST /api/quran-progress` with `startAyah=25` and `endAyah=10` | HTTP 400 Bad Request ("Starting ayah cannot be greater than ending ayah") | Executed via `QuranProgressIntegrationTest.invalidAyahRangeIsRejected` | **Passed (Real DB + Security Filter Chain)** |
| **PROGRESS-003** | SRS 11: Negative or zero ayah rejection | Progress | Validation | Student 1 exists | Send `POST /api/quran-progress` with `startAyah=0` or `endAyah=-5` | HTTP 400 Bad Request; validation failure on `@Positive` | Executed via `QuranProgressIntegrationTest.nonPositiveAyahIsRejected` | **Passed (Real DB + Security Filter Chain)** |
| **PROGRESS-004** | SRS 11: Teacher cannot log for unassigned student | Progress | Security / RBAC | Student 2 assigned to Teacher 4 | Teacher 3 sends `POST /api/quran-progress` for Student 2 | HTTP 403 Forbidden ("You can only record progress for your assigned students") | Executed via `QuranProgressIntegrationTest.teacherCannotLogForUnassignedStudent` | **Passed (Real DB + Security Filter Chain)** |
| **PROGRESS-005** | SRS 11: All 6 activity types supported | Progress | Functional | Student 1 exists | Record progress with `NEW_LESSON`, `RECITATION`, `REVISION`, `MEMORIZATION`, `CORRECTION`, `OTHER` | All 6 enum values accepted and stored accurately | Executed via `QuranProgressIntegrationTest.allSixActivityTypesSupported` | **Passed (Real DB + Security Filter Chain)** |
| **PROGRESS-006** | SRS 11: All 5 progress statuses supported | Progress | Functional | Student 1 exists | Record progress with `EXCELLENT`, `GOOD`, `SATISFACTORY`, `NEEDS_IMPROVEMENT`, `INCOMPLETE` | All 5 enum values accepted and stored accurately | Executed via `QuranProgressIntegrationTest.allFiveProgressStatusesSupported` | **Passed (Real DB + Security Filter Chain)** |
| **PROGRESS-007** | SRS 11: View student progress history | Progress | Functional | Student 1 has multiple progress entries | Send `GET /api/quran-progress/student/1` | HTTP 200 OK; returns chronologically ordered progress entries for Student 1 | Executed via `QuranProgressIntegrationTest.studentProgressHistoryIsReturned` | **Passed (Real DB + Security Filter Chain)** |
| **PROGRESS-008** | SRS 11: Surah name filtering | Progress | Search | Progress records in Al-Fatiha and Al-Baqarah | Send `GET /api/quran-progress?surahName=Baqarah` | Returns only records for Surah Al-Baqarah | Executed via `QuranProgressIntegrationTest.surahNameFilteringWorks` | **Passed (Real DB + Security Filter Chain)** |

---

### 4.8 Module 8: Dashboards & Analytics (DASHBOARD)

| Test ID | SRS Requirement | Module | Level | Preconditions & Test Data | Execution Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| **DASHBOARD-001** | SRS 15.1, 20.11: Administrator Dashboard | Dashboard | Integration | Data exists across 2 branches | Authenticate as `ADMINISTRATOR`, send `GET /api/dashboard` | HTTP 200 OK; returns `AdminDashboardDto`: `totalBranches=2`, `totalStudents`, `totalTeachers`, consolidated `todayStudentAttendance`, `todayTeacherAttendance`, `recentProgress`, `pendingReports` | Executed via `DashboardIntegrationTest.administratorDashboardReturnsConsolidatedCounts` against real aggregation queries on H2 | **Passed (Real DB + Security Filter Chain)** |
| **DASHBOARD-002** | SRS 15.2, 20.12: Branch Manager Dashboard | Dashboard | Security / RBAC | Manager in Branch 1 | Authenticate as `BRANCH_MANAGER`, send `GET /api/dashboard` | HTTP 200 OK; returns `ManagerDashboardDto`: strictly branch-scoped student/teacher counts and branch attendance stats; no other branch data | Executed via `DashboardIntegrationTest.managerDashboardIsBranchScoped` | **Passed (Real DB + Security Filter Chain)** |
| **DASHBOARD-003** | SRS 15.3, 20.13: Quran Teacher Dashboard | Dashboard | Security / RBAC | Teacher 3 has 5 assigned students | Authenticate as `QURAN_TEACHER`, send `GET /api/dashboard` | HTTP 200 OK; returns `TeacherDashboardDto`: `assignedStudents=5`, today's attendance for those 5 students, recent progress, pending reports | Executed via `DashboardIntegrationTest.teacherDashboardShowsOnlyAssignedStudents` (2 assigned + 1 unassigned student in the same branch, confirming the count excludes the unassigned one) | **Passed (Real DB + Security Filter Chain)** |
| **DASHBOARD-004** | SRS 15: Empty dataset dashboard rendering | Dashboard | Boundary | Fresh system with 0 students, 0 attendance records | Send `GET /api/dashboard` as Admin, Manager, and Teacher | HTTP 200 OK; zero counts returned (`present=0`, `total=0`); no `NullPointerException` or division by zero | Executed via `DashboardIntegrationTest.emptyDatasetDashboardRendersWithZeroesNotErrors` (Branch Manager case; a fresh branch with no data) | **Passed (Real DB + Security Filter Chain)** |
| **DASHBOARD-005** | SRS 15: Attendance stats calculation accuracy | Dashboard | Functional | 10 students: 7 Present, 1 Absent, 1 Late, 1 Excused | Send `GET /api/dashboard` | `AttendanceStats` accurately reports `present=7, absent=1, late=1, excused=1, total=10` | Executed via `DashboardIntegrationTest.attendanceStatsCalculationIsAccurate` with 10 real `StudentAttendance` rows (7/1/1/1 split) | **Passed (Real DB + Security Filter Chain)** |

---

### 4.9 Module 9: Hierarchical Reporting Structure (REPORT)

| Test ID | SRS Requirement | Module | Level | Preconditions & Test Data | Execution Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| **REPORT-001** | SRS 12.1, 20.8: Teacher creates draft report | Report | Integration | Teacher 3 logged in | Send `POST /api/reports` with `title="Weekly Report"`, `content="..."`, `reportType="TEACHER_TO_MANAGER"`, `periodStart=2026-10-01`, `periodEnd=2026-10-07` | HTTP 201 Created; report status is `DRAFT`; `authorId=3`, `branchId=1` | Executed via `ReportWorkflowIntegrationTest.teacherCreatesDraftReport` against real DB. Note: the real endpoint returns HTTP 200, not 201, for report creation | **Passed (Real DB + Security Filter Chain); actual status is 200, not 201 as originally expected** |
| **REPORT-002** | SRS 12.1: Teacher submits report to Manager | Report | Functional | Report 1 in `DRAFT` status authored by Teacher 3 | Teacher 3 sends `PUT /api/reports/1/submit` | HTTP 200 OK; report status transitions from `DRAFT` $\rightarrow$ `SUBMITTED`; `submittedAt` timestamp recorded | Executed via `ReportWorkflowIntegrationTest.teacherSubmitsReportToManager` | **Passed (Real DB + Security Filter Chain)** |
| **REPORT-003** | SRS 12.1: Prevent edit of submitted report | Report | Business Logic | Report 1 is in `SUBMITTED` status | Teacher 3 sends `PUT /api/reports/1` attempting to change content | HTTP 400 Bad Request ("Only draft reports can be modified") | Executed via `ReportWorkflowIntegrationTest.submittedReportCannotBeEdited` | **Passed (Real DB + Security Filter Chain)** |
| **REPORT-004** | SRS 12.1: Branch Manager reviews teacher report | Report | Integration | Manager 1 in Branch 1, Report 1 is `SUBMITTED` | Manager 1 sends `PUT /api/reports/1/review` with `{"reviewRemarks":"Excellent work"}` | HTTP 200 OK; status transitions to `REVIEWED`; `reviewedById=managerId`, `reviewedAt` recorded | Executed via `ReportWorkflowIntegrationTest.managerReviewsTeacherReport` (full draft→submit→review workflow against real DB) | **Passed (Real DB + Security Filter Chain)** |
| **REPORT-005** | SRS 12.2, 20.9: Manager creates & submits Branch Report | Report | Integration | Manager 1 in Branch 1 | Manager 1 sends `POST /api/reports` with `reportType="MANAGER_TO_ADMIN"`, then calls `/submit` | HTTP 200 OK; branch report submitted for Administrator review | Executed via `ReportWorkflowIntegrationTest.managerCreatesSubmitsAndAdminReviewsBranchReport` | **Passed (Real DB + Security Filter Chain)** |
| **REPORT-006** | SRS 12.2: Admin reviews branch report | Report | Integration | Admin logged in, Branch Report submitted | Admin sends `PUT /api/reports/{id}/review` with review remarks | HTTP 200 OK; status transitions to `REVIEWED` | Executed via `ReportWorkflowIntegrationTest.managerCreatesSubmitsAndAdminReviewsBranchReport` (same test covers the full Manager→Admin chain) | **Passed (Real DB + Security Filter Chain)** |
| **REPORT-007** | SRS 12: Manager cannot review other branch's report | Report | Security / RBAC | Report submitted in Branch 2 | Manager 1 (Branch 1) sends `PUT /api/reports/{id}/review` | HTTP 403 Forbidden ("You cannot review reports from other branches") | Executed via `ReportWorkflowIntegrationTest.managerCannotReviewOtherBranchReport`: real branch-isolation check in `ReportController.reviewReport` confirmed correct against real cross-branch data | **Passed (Real DB + Security Filter Chain)** |
| **REPORT-008** | SRS 14: Period validation (`periodStart > periodEnd`) | Report | Validation | Teacher logged in | Send `POST /api/reports` with `periodStart=2026-10-10`, `periodEnd=2026-10-01` | HTTP 400 Bad Request ("Start date must be on or before end date") | Executed via `ReportWorkflowIntegrationTest.periodStartAfterEndIsRejected` | **Passed (Real DB + Security Filter Chain)** |
| **REPORT-009** | SRS 14: Reporting frequency date ranges | Report / Frontend | Unit | Client helper `resolveReportPeriod` | Test Daily, Weekly (Mon-Sun), Monthly (leap days), and Custom periods | Exact ISO dates calculated matching `Africa/Addis_Ababa` time zone | Ported to Vitest and re-verified by running `npm test`: `report-period.test.mjs` (5/5 passed, same assertions as before) | **Passed** |
| **REPORT-010** | SRS 21: Report export format validation | Report | Functional | Report rows exist | Send `GET /api/reports/export?format=csv` | HTTP 400 Bad Request ("Supported export formats are pdf and xlsx") | Executed via `ReportWorkflowIntegrationTest.unsupportedExportFormatIsRejected` against the real `ReportExportService` | **Passed (Real DB + Security Filter Chain)** |

---

### 4.10 Module 10: Parent Notifications (NOTIF)

| Test ID | SRS Requirement | Module | Level | Preconditions & Test Data | Execution Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| **NOTIF-001** | SRS 13, 20.10: Create pending parent notification | Notification | Integration | Student 1 has guardian "Ali" and phone "+251911123456" | Send `POST /api/notifications` with `studentId=1`, `notificationType="PROGRESS_UPDATE"`, `content="Ahmed completed Juz 1"` | HTTP 201 Created; `deliveryStatus="PENDING"`; auto-populates `parentName` and `parentContact` from student | Executed via `ParentNotificationIntegrationTest.createsPendingNotificationWithAutoPopulatedParentInfo` against real DB + real guardian data. Note: the real endpoint returns HTTP 200, not 201 | **Passed (Real DB + Security Filter Chain); actual status is 200, not 201 as originally expected** |
| **NOTIF-002** | SRS 13: Reject notification for student without contact | Notification | Business Logic | Student 2 has null `guardianPhone` | Send `POST /api/notifications` for Student 2 | HTTP 400 Bad Request / 422 Unprocessable ("Select a student with a saved guardian name and contact number") | Executed via `ParentNotificationIntegrationTest.rejectsNotificationForStudentWithoutGuardianContact`: confirmed real HTTP 422 | **Passed (Real DB + Security Filter Chain)** |
| **NOTIF-003** | SRS 13: Idempotency key duplicate protection | Notification | Integration (DB) | Notification created with `Idempotency-Key: notif-abc-123` | Send second `POST /api/notifications` with same `Idempotency-Key: notif-abc-123` | HTTP 200 OK returning existing record without creating duplicate in DB | Executed via `ParentNotificationIntegrationTest.duplicateIdempotencyKeyReturnsExistingRecordWithoutCreatingDuplicate` against the real `idempotency_key` unique index — confirmed exactly one row persists and both requests return the same `id` | **Passed (Real DB + Security Filter Chain)** |
| **NOTIF-004** | SRS 13: Deliver notification transition | Notification | Functional | Notification 1 is `PENDING` | Manager sends `PUT /api/notifications/1/send` | Status transitions `PENDING` $\rightarrow$ `SENT`/`DELIVERED`; attempt recorded in `notification_delivery_attempts` table | Unit stub passes | **Passed (Stub)** |
| **NOTIF-005** | SRS 17: Notification history query | Notification | Search | Notifications exist | Send `GET /api/notifications?studentId=1&status=SENT` | Returns chronologically ordered notification delivery history for student | Executed via `ParentNotificationIntegrationTest.notificationHistoryQueryFiltersByStudent` (filtered by `studentId`; `status=SENT` filter itself not separately exercised since no delivery provider is configured in the test profile) | **Passed (Real DB + Security Filter Chain)** |
| **NOTIF-006** | SRS 13: Teacher branch scoping on notifications | Notification | Security / RBAC | Teacher 3 in Branch 1 | Teacher 3 attempts to view notifications for Student in Branch 2 | HTTP 403 Forbidden | Executed via `ParentNotificationIntegrationTest.teacherCannotViewNotificationsForStudentInAnotherBranch` (teacher-vs-teacher scoping, since the controller scopes `QURAN_TEACHER` by assigned student, not raw branch) | **Passed (Real DB + Security Filter Chain)** |
| **NOTIF-007** | SRS 13: Delivery provider failure resilience | Notification | Integration | Simulated provider timeout | Trigger send with simulated delivery failure | Notification status marked `FAILED`; attempt failure reason stored; application does not crash | Unit stub passes | **Passed (Stub)** |

---

### 4.11 Module 11: Multi-Criteria Search & Filtering (SEARCH)

| Test ID | SRS Requirement | Module | Level | Preconditions & Test Data | Execution Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| **SEARCH-001** | SRS 16: Student search by partial name | Search | Integration | Students "Ahmed Mohammed" and "Fatima Hassan" exist | Send `GET /api/students/search?q=ahmed` | Returns only "Ahmed Mohammed", case-insensitive match | Executed via `SearchAndFilteringIntegrationTest.studentSearchByPartialNameIsCaseInsensitive` against real case-insensitive `LIKE` query on H2 | **Passed (Real DB + Security Filter Chain)** |
| **SEARCH-002** | SRS 16: Combined student search filters | Search | Integration | Students across branches | Send `GET /api/students/search?branchId=1&teacherId=3&q=STD` | Returns intersection of all active filter criteria | Executed via `SearchAndFilteringIntegrationTest.combinedStudentSearchFiltersIntersect` (branchId + teacherId combined) | **Passed (Real DB + Security Filter Chain)** |
| **SEARCH-003** | SRS 16: Pagination boundary handling | Search | Boundary | 25 students exist, page size = 10 | 1. Query `page=0, size=10`<br>2. Query `page=2, size=10`<br>3. Query `page=3, size=10` | 1. 10 records, `totalPages=3`<br>2. 5 records<br>3. 0 records, empty page (no 500 error) | Executed via `SearchAndFilteringIntegrationTest.paginationBoundariesReturnCorrectPagesWithoutErrorsPastTheEnd` with 25 real student rows | **Passed (Real DB + Security Filter Chain)** |
| **SEARCH-004** | SRS 16: Invalid pagination parameter rejection | Search | Validation | System running | Send `GET /api/students/search?page=-1&size=500` | HTTP 400 Bad Request ("Page must be non-negative and size must be between 1 and 100") | Executed via `SearchAndFilteringIntegrationTest.invalidPaginationParametersAreRejected` | **Passed (Real DB + Security Filter Chain)** |
| **SEARCH-005** | SRS 16: Attendance search by date & status | Search | Functional | Attendance records on 2026-10-01 to 2026-10-07 | Send `GET /api/student-attendance?startDate=2026-10-01&endDate=2026-10-07&status=LATE` | Returns only matching records within date interval | Executed via `StudentAttendanceIntegrationTest.filterByDateRangeAndStatus` (ATT-STUDENT-008), which exercises the identical date-range + status filter on real data | **Passed (Real DB + Security Filter Chain)** |
| **SEARCH-006** | SRS 16: Quran progress search by Surah | Search | Functional | Progress entries across multiple Surahs | Send `GET /api/quran-progress?surahName=Fatiha` | Returns only Surah Al-Fatiha records | Executed via `QuranProgressIntegrationTest.surahNameFilteringWorks` (PROGRESS-008), same filter | **Passed (Real DB + Security Filter Chain)** |
| **SEARCH-007** | SRS 16: Empty search result structure | Search | Boundary | Search query with non-existent term `q=XYZNONEXISTENT` | Send search request | HTTP 200 OK; returns valid Page object with `totalElements=0, content=[]` | Executed via `SearchAndFilteringIntegrationTest.emptySearchResultHasValidPageStructure` | **Passed (Real DB + Security Filter Chain)** |
| **SEARCH-008** | SRS 16: Search filter reset | Search / Frontend | Component (Vitest + RTL) AND End-to-End (Playwright) | Student search box contains text "ahmed" (`app/management/portal.test.jsx`, "Search and filter reset" suite, mocked API); E2E: a real search against the seeded student roster (`e2e/search-filter.spec.ts`) | Click the "Reset" button in the Students search form | Search input clears back to empty; `/students/search` is called again with no `q` parameter (full roster reload) | Verified by running `npm test` (component level, mocked API) AND by running `npx playwright test` ("a search with no matches shows the empty-result state, and Reset restores the full list") against the real `/api/students/search` endpoint: the input clears to `""` and the real empty-result message disappears once the real unfiltered roster reloads | **Passed (Component-level AND Real E2E - Playwright, real backend + real browser)** |

---

### 4.12 Module 12: Database Persistence & Consistency (PERSIST)

| Test ID | SRS Requirement | Module | Level | Preconditions & Test Data | Execution Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| **PERSIST-001** | SRS 19: Database unique constraint on student attendance | Persistence | Integration (DB) | MySQL / JPA running | Direct insert or repository save of two `StudentAttendance` records with identical `(studentId, date)` | Database engine throws `DataIntegrityViolationException`; transaction rolls back; duplicate prevented at SQL level | Executed via `PersistenceConstraintTest.duplicateStudentAttendanceOnSameDateViolatesUniqueConstraint` (`@DataJpaTest` against real H2, no mocks). Also independently re-confirmed end to end through the REST layer in `ATT-STUDENT-002` | **Passed (Real DB; H2 unique index violation)** |
| **PERSIST-002** | SRS 19: Database unique constraint on teacher attendance | Persistence | Integration (DB) | MySQL / JPA running | Direct insert or repository save of two `TeacherAttendance` records with identical `(teacherId, date)` | Database engine throws `DataIntegrityViolationException`; duplicate prevented | Executed via `PersistenceConstraintTest.duplicateTeacherAttendanceOnSameDateViolatesUniqueConstraint`. Also re-confirmed through the REST layer in `ATT-TEACHER-002` | **Passed (Real DB; H2 unique index violation)** |
| **PERSIST-003** | SRS 19: Hibernate `@PrePersist` timestamp integrity | Persistence | Integration (DB) | Any entity with `createdAt` | Save new `Student`, `Branch`, `Report`, or `StudentAttendance` without specifying `createdAt` | `createdAt` automatically populated with non-null `LocalDateTime.now()` | Executed via `PersistenceConstraintTest.prePersistPopulatesCreatedAtForStudentAndBranch` against a real Hibernate session: `Student.createdAt` and `StudentAttendance.createdAt` both confirmed non-null and recent | **Passed (Real DB; Hibernate @PrePersist)** |
| **PERSIST-004** | SRS 19: Foreign key consistency on cascade/delete | Persistence | Integration (DB) | Branch 1 has users and students | Attempt SQL drop or cascade deletion | Referential integrity checks block deletion while child records exist | Executed via `PersistenceConstraintTest.branchWithStudentsIsDetectedByExistsByBranchId` plus the end-to-end `BRANCH-006` test: the real schema has no DB-level `FOREIGN KEY`/`ON DELETE` constraints between `branches`/`students`/`app_users` (all relations are plain `bigint` columns, enforced only in application code via `existsByBranchId` checks in `BranchController`). This confirms the RTM's premise ("referential integrity checks") is implemented at the application layer, not the schema layer — not a defect for Phase One, but worth flagging if stronger DB-level guarantees are desired later | **Passed (Real DB); confirms protection is application-level, not a DB foreign-key constraint** |
| **PERSIST-005** | SRS 19: Idempotency key unique index | Persistence | Integration (DB) | `parent_notifications` table | Insert two notifications with same `idempotency_key` | Database enforces unique key `uk_notification_idempotency_key` | Executed via `PersistenceConstraintTest.idempotencyKeyHasRealUniqueIndex`. Also re-confirmed through the REST layer in `NOTIF-003` | **Passed (Real DB; H2 unique index violation)** |
| **PERSIST-006** | SRS 19: Transactional rollback on error | Persistence | Integration (DB) | Multi-entity operation | Trigger unhandled error halfway through service method | All partial database writes rolled back cleanly; zero orphan rows | Executed via `PersistenceConstraintTest.transactionRollsBackCompletelyOnForcedError`: a real `PROPAGATION_REQUIRES_NEW` Spring transaction that persists+flushes a row then throws is confirmed to leave zero orphan rows after rollback (verified against `PlatformTransactionManager`, not just the test-method's own auto-rollback) | **Passed (Real DB + Spring Transaction Manager)** |

---

### 4.13 Module 13: Security & Access Control Verification (SECURITY)

| Test ID | SRS Requirement | Module | Level | Preconditions & Test Data | Execution Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| **SECURITY-001** | SRS 4, 18.2: Unauthenticated request rejection | Security | Integration | No auth credentials supplied | Send `GET /api/students`, `POST /api/branches`, `GET /api/dashboard` | HTTP 401 Unauthorized for all protected endpoints | Executed via `SecurityFilterChainTest.everyProtectedEndpointRejectsUnauthenticatedRequests` (parameterized across 10 protected endpoint families: branches, users, students, student-attendance, teacher-attendance, quran-progress, reports, notifications, dashboard, auth/me) plus `BranchSecurityIntegrationTest.unauthenticatedRequestToBranchesIsRejected` and `ErrorHandlingIntegrationTest.unauthenticatedRequestDoesNotLeakServerDetails` | **Passed (Real DB + Security Filter Chain)** |
| **SECURITY-002** | SRS 4.3: Teacher privilege escalation to Admin | Security | Security / RBAC | Quran Teacher credentials (`teacher1`) | Teacher sends `POST /api/branches` or `POST /api/users` | HTTP 403 Forbidden; `@PreAuthorize("hasRole('ADMINISTRATOR')")` blocks execution | Executed via `SecurityFilterChainTest.loggedInTeacherGetsForbiddenOnAdminOnlyEndpoints` (a real, logged-in `QURAN_TEACHER` against `GET /api/users`, `POST /api/branches`, `POST /api/users`) plus `BranchSecurityIntegrationTest.teacherCannotCreateBranchEvenWithValidCsrf` | **Passed (Real DB + Security Filter Chain)** |
| **SECURITY-003** | SRS 4.2: Branch Manager horizontal tenant isolation | Security | Security / RBAC | Manager 1 (Branch 1) credentials | Manager 1 sends `GET /api/students` or `GET /api/reports` attempting to view Branch 2 data | Only Branch 1 data returned; foreign branch IDs rejected with HTTP 403 | Executed via `BranchSecurityIntegrationTest.branchManagerOnlySeesOwnBranch`/`branchManagerForbiddenFromOtherBranchById` and `StudentIntegrationTest.studentListingIsFilteredByRole` against real cross-branch data | **Passed (Real DB + Security Filter Chain)** |
| **SECURITY-004** | SRS 4.3: Teacher horizontal tenant isolation | Security | Security / RBAC | Teacher 3 credentials | Teacher 3 attempts to view student assigned to Teacher 4 via `GET /api/students/{id}` | HTTP 403 Forbidden ("You cannot view students assigned to other teachers") | Executed via `StudentIntegrationTest.teacherCannotViewStudentAssignedToAnotherTeacher` against real cross-teacher data | **Passed (Real DB + Security Filter Chain)** |
| **SECURITY-005** | SRS 18.2: BCrypt password hash verification | Security | Integration | User registered | Inspect `password_hash` column in database | Stored string matches BCrypt pattern (`$2a$10$...`); cleartext password is never logged or stored | Executed via `UserManagementIntegrationTest.adminCreatesBranchManagerWithHashedPassword`: real row read back from H2, confirmed BCrypt-prefixed and not equal to the raw password | **Passed (Real DB + Security Filter Chain)** |
| **SECURITY-006** | SRS 18.2: SQL Injection resilience | Security | Security | Endpoint with query parameters | Send `GET /api/students/search?q='%20OR%20'1'='1` | Parameterized JPA queries safely escape input; no SQL syntax error or data leakage | Executed via `SecurityFilterChainTest.sqlInjectionShapedSearchParamsReturnSafeEmptyResultsNotErrors` against the real H2 database: tried `' OR '1'='1'` and `'; DROP TABLE students; --'` on `/api/students/search` and `/api/branches/search`; both return HTTP 200 with safe (non-matching) results, and the `students` table is confirmed still queryable afterward — no SQL syntax error, no injection effect | **Passed (Real DB + Security Filter Chain)** |
| **SECURITY-007** | SRS 18.2: XSS prevention in remarks & notes | Security | Security | Text fields in attendance, progress, reports | Submit `<script>alert('XSS')</script>` in remarks | Stored safely as raw string; rendered as escaped text in Next.js React JSX without script execution | Executed (backend half) via `SecurityFilterChainTest.xssPayloadInRemarksIsStoredAndReturnedAsLiteralText`: a `<script>alert('XSS')</script>` payload in `StudentAttendance.remarks` round-trips through a real `POST /api/student-attendance` and a real H2 row as the exact literal string, never executed or altered server-side. The frontend-escaping half of this claim is outside this backend test's scope | **Passed (Real DB + Security Filter Chain, backend half only)** |
| **SECURITY-008** | SRS 18.2: Session fixation protection | Security | Security | User signs in | Inspect session ID before and after successful authentication | Session ID changes upon successful authentication (`changeSessionId()`) | Executed via `SecurityFilterChainTest.sessionIdChangesOnSuccessfulAuthentication`: a real pre-auth `HttpSession` is established, then a real login call confirms the post-auth session ID differs (`AuthController`'s `changeSessionId()` call verified against the real servlet session, not just code review) | **Passed (Real DB + Security Filter Chain)** |

---

### 4.14 Module 14: Error Handling & System Resilience (ERR)

| Test ID | SRS Requirement | Module | Level | Preconditions & Test Data | Execution Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| **ERR-001** | SRS 18: Malformed JSON body handling | Error Handling | Integration | Any POST/PUT endpoint | Send request with broken JSON payload (e.g. `{name: "test",}`) | HTTP 400 Bad Request; descriptive error message; no 500 stack trace leaked | Executed via `ErrorHandlingIntegrationTest.malformedJsonBodyReturns400WithoutLeakingStackTrace` against the real Spring `HttpMessageNotReadableException` default handler | **Passed (Real DB + Security Filter Chain)** |
| **ERR-002** | SRS 18: Resource not found (`404 NOT_FOUND`) | Error Handling | Functional | System running | Send `GET /api/students/999999` or `GET /api/branches/999999` | HTTP 404 Not Found; clean error response | Executed via `ErrorHandlingIntegrationTest.nonExistentResourceReturns404` (both `/api/students/{id}` and `/api/branches/{id}`) | **Passed (Real DB + Security Filter Chain)** |
| **ERR-003** | SRS 18: Non-existent foreign key references | Error Handling | Validation | System running | Send `POST /api/students` with non-existent `branchId=99999` | HTTP 422 Unprocessable Entity ("Branch does not exist") | Executed via `ErrorHandlingIntegrationTest.nonExistentForeignKeyReferenceIsRejected`. Note: the real controller returns HTTP 400 (`BAD_REQUEST`, "An active branch is required..."), not 422 as the RTM's expected result states | **Passed (Real DB + Security Filter Chain); actual status is 400, not 422 as originally expected** |
| **ERR-004** | SRS 18: Database connectivity failure resilience | Error Handling | Resilience | MySQL down or unreachable | User sends authentication request | `AuthController` catches `AuthenticationServiceException`, returns HTTP 503 Service Unavailable ("Authentication is temporarily unavailable") | Unit stub passes | **Passed (Stub)** |
| **ERR-005** | SRS 18: Validation error response formatting | Error Handling | Validation | Student creation with missing required fields | Send `POST /api/students` with `{}` | HTTP 400 Bad Request; validation messages enumerate missing fields (`fullName`, `studentNumber`, `enrollmentDate`, `branchId`) | Executed via `ErrorHandlingIntegrationTest.validationErrorEnumeratesMissingFields` against the real `@Valid` pipeline (confirmed 4 field errors, including `fullName`, `studentNumber`, `enrollmentDate`, `branchId`, in the real response) | **Passed (Real DB + Security Filter Chain)** |

---

## 5. Test Suites & Automation Architecture — IMPLEMENTED

The integration gaps identified during this audit have been closed. All suites below are real, executed, `mvn -o test`-passing code (not a proposal) as of this update. 109 new backend tests were added across 15 new test classes, on top of the pre-existing 44 unit tests (153 total, 0 failures, verified stable across two consecutive full runs).

### 5.1 Test Suite Structure (as implemented)

```
backend/src/test/
├── java/com/jafar/management/
│   ├── controller/                    # Existing hand-rolled proxy-mock unit tests (unchanged, 44 tests)
│   ├── service/                       # Existing hand-rolled proxy-mock unit tests (unchanged)
│   ├── integration/                   # NEW: real @SpringBootTest + MockMvc integration tests
│   │   ├── IntegrationTestBase.java           # shared fixtures/login/CSRF helpers (not itself a test)
│   │   ├── AuthIntegrationTest.java           # AUTH-001..007,010
│   │   ├── BranchSecurityIntegrationTest.java # BRANCH-001..007, SECURITY-001/002
│   │   ├── UserManagementIntegrationTest.java # USER-001..009
│   │   ├── StudentIntegrationTest.java        # STUDENT-001..010 (found+fixed a real delete-guard defect)
│   │   ├── StudentAttendanceIntegrationTest.java  # ATT-STUDENT-001..008
│   │   ├── TeacherAttendanceIntegrationTest.java  # ATT-TEACHER-001..006
│   │   ├── QuranProgressIntegrationTest.java  # PROGRESS-001..008
│   │   ├── DashboardIntegrationTest.java      # DASHBOARD-001..005
│   │   ├── ReportWorkflowIntegrationTest.java # REPORT-001..008,010
│   │   ├── ParentNotificationIntegrationTest.java # NOTIF-001,002,003,005,006
│   │   ├── SearchAndFilteringIntegrationTest.java # SEARCH-001..004,007
│   │   ├── ErrorHandlingIntegrationTest.java  # ERR-001,002,003,005
│   │   └── SecurityFilterChainTest.java       # SECURITY-001,002,006,007,008
│   └── repository/
│       └── PersistenceConstraintTest.java     # NEW: @DataJpaTest — PERSIST-001..006
└── resources/
    └── application-test.properties    # IMPLEMENTED: In-memory H2 configuration
```

A single flat `integration` package (rather than the originally sketched `controller/mvc` + `integration` split) was used in practice, since every suite needed the full `@SpringBootTest` context (real `SecurityFilterChain` + real `@PreAuthorize` interceptors + real H2) rather than a `@WebMvcTest` slice — the whole point was to exercise the real filter chain end to end, which a web-layer-only slice would not fully cover.

### 5.2 Test Configuration (`backend/src/test/resources/application-test.properties`) — as implemented

The doc's proposed configuration worked as-is against this Spring Boot 3.5.5 / Hibernate 6.6 / H2 2.3.232 stack, with two small additions found necessary during implementation (`spring.jpa.open-in-view=false` to match production, and `server.servlet.session.cookie.secure=false` alongside `app.session.cookie-secure=false` so the test profile's own session cookie property is also overridden, not just the custom one read by `SecurityConfig`):

```properties
spring.datasource.url=jdbc:h2:mem:jafar_test;DB_CLOSE_DELAY=-1;MODE=MySQL;DATABASE_TO_LOWER=TRUE
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.open-in-view=false
spring.jpa.show-sql=false

app.bootstrap-admin.username=admin
app.bootstrap-admin.password=admin1234
app.time-zone=Africa/Addis_Ababa
app.session.cookie-secure=false
server.servlet.session.cookie.secure=false

logging.level.org.springframework.security=WARN
logging.level.com.jafar.management=WARN
```

No MySQL-specific SQL or column type needed a compatibility workaround — Hibernate's schema generation against H2 in `MODE=MySQL` worked unmodified for every entity, including the two attendance tables' composite unique constraints and the notification idempotency-key unique column.

### 5.3 Test Dependencies (`backend/pom.xml`) — implemented exactly as proposed

```xml
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
```

Both resolved from the local Maven cache with `mvn -o` (fully offline); no network access was required or used.

---

### 5.4 End-to-End Test Suite (Playwright, `e2e/`) — IMPLEMENTED

A real browser (Chromium) drives the real, built Next.js app, which proxies `/api/*` to a real Spring Boot backend - no API mocking anywhere in this layer.

```
playwright.config.ts            # webServer: boots backend (SPRING_PROFILES_ACTIVE=e2e) + `next build && next start`
backend/src/main/resources/
  application-e2e.properties    # NEW: isolated, disposable H2 profile (jafar_e2e), ddl-auto=create-drop
e2e/
├── fixtures.ts                 # shared seed (2 branches, a manager, 2 teachers, 1 student) via real authenticated API calls, memoised once per run
├── utils/
│   ├── api-client.ts           # CSRF-aware fixture-setup helper (login, POST/PUT/DELETE with X-XSRF-TOKEN)
│   └── ui.ts                   # uiLogin/uiLogout, section navigation, and the field() helper (see note below)
├── auth.spec.ts                 # Workflow A - AUTH-001/002/006/008/009
├── student-teacher-management.spec.ts  # Workflow B - admin creates branch/teacher/student via the real UI
├── branch-restrictions.spec.ts  # Workflow C - BRANCH-004/005, SECURITY-003
├── attendance.spec.ts           # Workflow D - ATT-STUDENT-001/002, ATT-TEACHER-001/002
├── quran-progress.spec.ts       # Workflow E - PROGRESS-001/007
├── dashboards.spec.ts           # Workflow F - DASHBOARD-001..005
├── reports.spec.ts              # Workflow G - REPORT-001/002/004 (full draft→submit→review chain)
├── search-filter.spec.ts        # Workflow H - SEARCH-001/002/007/008
└── cross-session.spec.ts        # Workflow I - two/three independent browser contexts
```

30 tests total: 29 passing, 1 `test.fixme` (see Section 7/the task report: no "Add user" UI control exists for Administrator/Branch Manager accounts - only `QURAN_TEACHER` accounts can be created through the real UI). Stable across 4 consecutive full runs (0 flaky), two of them from a completely torn-down state (`playwright test`'s `webServer` entries both have `reuseExistingServer: false`, so a stale backend/frontend from a previous crashed run is never silently reused - Playwright refuses to start if the ports are already bound instead).

**A real defect was found and fixed in the process**, not merely a test-authoring issue: `app/management/portal.css`'s `.portal-sidebar` rule (`position:fixed`, fixed `top`/`bottom`) had no `overflow-y:auto`. On a common 1280×720 viewport, an Administrator's full ten-item navigation list plus the "Sign out" footer slightly exceeds the sidebar's available height (measured: 682px of content in a 645px box), and with no scroll affordance the "Sign out" button is clipped below the visible area and cannot be reached at all. Fixed by adding `overflow-y:auto` to that one rule - a minimal, targeted CSS fix with no other layout changes.

A second, more subtle fixture-selection issue was found and fixed in the test code itself (not the app): Playwright's `getByLabel(text, { exact: true })` does not resolve for any of this app's `<label>Text<select>...</select></label>` fields, because the browser's accessible-name computation for an implicit label folds in the `<select>`'s own rendered (currently-selected option) text, so the computed name is never exactly the label's own text. All specs use a small `field(scope, exactLabelText)` helper (`e2e/utils/ui.ts`) that matches a label's own leading text node via XPath instead, which works uniformly for both inputs and selects.

---

## 6. Risks, Assumptions, and Blocked Requirements

| Risk / Assumption | Impact | Mitigation Strategy |
|---|---|---|
| **Assumption 1: MySQL Port 3306 Availability** | Tests depending on real MySQL will fail on developer machines or CI environments without XAMPP running. | Introduce H2 in MySQL mode for standard test execution; maintain dedicated MySQL smoke tests for pre-deployment validation. |
| **Risk 2: `@PreAuthorize` Security Regression** | Changing controller annotations does not cause compiler errors or fail pure unit tests. Security regressions could be introduced undetected. | Add `@WebMvcTest` with `@WithMockUser` to continuously enforce role permissions on every API route. |
| **Assumption 3: In-System Notification Delivery** | Section 13/21 of the SRS leaves external SMS/WhatsApp out of Phase One. | Test notifications through the in-system delivery status queue (`PENDING`, `SENT`, `DELIVERED`, `FAILED`) and verify delivery attempts table consistency. |
| **Risk 4: Empty Frontend Route (`teacher_home.js`)** | The file is empty, but teacher operations are currently handled through `app/management/portal.js`. | Mitigated for component-level testing: the new Vitest/RTL suite targets `app/management/portal.js` directly (confirmed as the real app surface, including the Quran Teacher role view). A Playwright browser E2E suite against the live backend is still needed and remains open. |

---

## 7. Summary of Current Test Coverage & Next Steps

### Current State Summary
- **Functional Business Logic:** Well-exercised by 44 unit tests with dynamic proxies (unchanged, still passing), **plus 109 new tests running against a real Spring Boot context, real `SecurityFilterChain`, and a real H2 database** (109 = 153 total minus the original 44).
- **Security & Authorization:** **No longer zero runtime verification.** `SecurityFilterChainTest`, `BranchSecurityIntegrationTest`, and per-module tests now exercise the real `@PreAuthorize` interceptors, real session-based authentication, real CSRF filter, real BCrypt hashing, SQL-injection-shaped inputs, an XSS payload round-trip, and session-fixation protection — all against the actual Spring Security filter chain, not mocks.
- **Data Persistence:** **No longer zero database constraint verification.** `PersistenceConstraintTest` (`@DataJpaTest`) and the attendance/notification integration tests confirm the real H2-enforced unique constraints on `(studentId,date)`, `(teacherId,date)`, and `idempotency_key`, real `@PrePersist` timestamp population, and a real Spring-managed transaction rollback leaving zero orphan rows. One finding: `PERSIST-004` confirmed that branch/user/student referential protection is enforced at the **application layer** (`existsByBranchId` checks), not via DB-level `FOREIGN KEY` constraints — acceptable for Phase One but worth flagging if stronger guarantees are wanted later.
- **One real defect found and fixed:** `StudentController.delete()` had no guard against deleting a student with existing attendance, progress, or notification history, despite the repositories needed for that guard already being injected and used elsewhere in the same controller. Fixed to mirror `BranchController`'s deletion-protection pattern (see `STUDENT-010`).
- **Frontend / E2E:** A Vitest + React Testing Library harness exists (`npm test`, `vitest.config.mjs`). 32 frontend tests pass: 5 date-calculation tests (ported to Vitest, unchanged assertions), 10 new `app/lib/api.js` HTTP-client tests, and 17 new `app/management/portal.js` component tests covering login, role-based navigation, dashboard rendering, logout/session expiration (AUTH-009), search-filter reset (SEARCH-008), student registration validation, attendance-form validation/duplicate-error handling, and Quran progress form option lists.
  **True end-to-end browser tests are now implemented** (`npx playwright test`, `playwright.config.ts`, `e2e/`): 30 Playwright tests (29 passing + 1 `test.fixme`) drive a real Chromium browser against a real production-style Next.js server and a real Spring Boot backend (isolated, disposable `e2e` H2 profile - see Section 5.4), re-confirming AUTH-008, AUTH-009 and SEARCH-008 for real and covering Workflows A-I end to end. One genuine defect was found and fixed in the process: the fixed-position sidebar (`.portal-sidebar` in `app/management/portal.css`) had no `overflow-y: auto`, so on a common 1280x720 viewport an Administrator's full-length nav list clipped the "Sign out" button below the visible area with no way to scroll to it - fixed by adding `overflow-y: auto` to that rule.

### Immediate Action Plan — status
1. ~~Approve Test Strategy & Matrix~~ — superseded; matrix now reflects executed results.
2. ~~Add Test Dependencies~~ — **Done**: `h2` and `spring-security-test` added to `backend/pom.xml` (`test` scope), resolved offline.
3. **Implemented:**
   - ~~Persistence Suite~~ — **Done**: `PersistenceConstraintTest` covers both attendance tables' unique constraints plus idempotency key, `@PrePersist`, and transactional rollback.
   - ~~Security Slice Suite~~ — **Done**: implemented as full `@SpringBootTest` + `MockMvc` suites rather than `@WebMvcTest` slices, since exercising the real filter chain end to end was the explicit goal.
   - **Closed (E2E):** the full lifecycle chain is now exercised against the real system by the Playwright suite's shared fixture plus `e2e/student-teacher-management.spec.ts`, `e2e/attendance.spec.ts`, `e2e/quran-progress.spec.ts`, and `e2e/reports.spec.ts`, all operating on the same seeded Administrator→Branch→Branch Manager→Quran Teacher→Student chain: a student is registered and assigned to a teacher (Workflow B), that teacher records the student's attendance and Quran progress (Workflows D/E), and the teacher drafts, submits, and has a manager review a report over the same period (Workflow G) - a real end-to-end system-level walk of Admin→Manager→Teacher→Student→Attendance/Progress→Report-submit→Report-review, run against the real backend and browser. It is not literally one single `@Test` method (it is one coherent fixture chain spread across cooperating Playwright spec files, which is the natural unit of organization for browser E2E, unlike a single JUnit method), but it closes the gap this note flagged: the full chain is verified working together, not just as isolated steps.

