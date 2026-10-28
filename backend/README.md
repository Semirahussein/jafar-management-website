# JAFAR Management System — Backend API Documentation

The backend service is built with **Spring Boot 3.5**, **Spring Data JPA**, **Spring Security**, and **MySQL**. It implements the complete Phase One scope defined in the JAFAR Management System Software Requirements Specification (SRS).

---

## 🏗️ Architecture & Database Setup

### Prerequisites
- Java 21 or Java 25
- Maven 3.9+
- MySQL 8.0+ (or XAMPP with MySQL running on port 3306)

### Database Initialization
In MySQL / phpMyAdmin:
```sql
CREATE DATABASE IF NOT EXISTS jafar_management;
CREATE USER IF NOT EXISTS 'jafar_user'@'localhost' IDENTIFIED BY 'replace-with-a-unique-database-password';
GRANT ALL PRIVILEGES ON jafar_management.* TO 'jafar_user'@'localhost';
FLUSH PRIVILEGES;
```
Set `DB_USERNAME` and `DB_PASSWORD` explicitly for the database user. The application has no default database password.

---

## 🚀 Running the Application

### 1. Environment Configuration
Set bootstrap administrator credentials in `backend/.env` or export them:
```bash
export BOOTSTRAP_ADMIN_USERNAME='choose-an-admin-username'
export BOOTSTRAP_ADMIN_PASSWORD='replace-with-a-unique-long-password'
export DB_USERNAME='jafar_user'
export DB_PASSWORD='the-database-password-you-configured'
export SESSION_COOKIE_SECURE='true' # Use false only for local HTTP development
export REMEMBER_ME_KEY='replace-with-a-stable-random-secret'
```
Bootstrap administrator creation is disabled unless both bootstrap variables are set. Never commit these values. Configure a stable, randomly generated `REMEMBER_ME_KEY` and `SESSION_COOKIE_SECURE=true` behind HTTPS in production. Without the remember key, the backend generates a random key at startup and Remember me cookies stop working after a restart.

### 2. Start Application
```bash
cd backend
mvn spring-boot:run
```
The application runs on `http://localhost:8080`.

---

## 🔐 Authentication & Roles

The management portal uses a server-side Spring Security session with an HttpOnly cookie. Sessions expire after 30 minutes of inactivity. The optional Remember me cookie lasts 14 days. The existing HTTP Basic authentication remains available for API clients.

State-changing requests require a CSRF token. Fetch `GET /api/auth/csrf` first; the response includes a token and sets the `XSRF-TOKEN` cookie. Send that value in `X-XSRF-TOKEN` for POST, PUT, and DELETE requests. The portal handles this automatically.

Password reset is unavailable: user records have no verified recovery email or phone number, and no email/SMS delivery service is configured. Do not send reset links until a verified recovery contact and delivery provider are added.

### Available Roles:
- `ADMINISTRATOR` — Organization-wide visibility across all branches.
- `BRANCH_MANAGER` — Access restricted to their assigned branch (`branchId`).
- `QURAN_TEACHER` — Access restricted to students assigned to them (`teacherId`).

---

## 📋 API Reference & Postman Testing Guide

Set Postman Authorization to **Basic Auth** with the relevant user credentials. For mutation requests, first call `GET /api/auth/csrf`, retain the cookie, and include the returned token in the `X-XSRF-TOKEN` header.

### Session Login
```http
GET http://localhost:8080/api/auth/csrf
```
Keep the `XSRF-TOKEN` cookie and returned token, then:
```http
POST http://localhost:8080/api/auth/login
Content-Type: application/json
X-XSRF-TOKEN: <token from csrf response>

{"username":"your-user","password":"your-password","rememberMe":false}
```
The response sets a session cookie and returns the signed-in user's id, username, role, and branch id. Use `GET /api/auth/me` to retrieve the current user. `POST /api/auth/logout` with the CSRF header invalidates the session and Remember me cookie.

### 1. Health Check (Public)
```http
GET http://localhost:8080/api/health
```

---

### 2. Branch Management (`/api/branches`)

Administrators can list all branches and create or delete branches. Managers and Quran teachers receive only their assigned branch. Administrators and the assigned manager can edit that branch's name, address, and existing `active` status. Inactive branches remain visible for historical records but cannot receive new student or user assignments. A student or teacher with linked records cannot be moved in a way that would orphan or mismatch those records, and branches with users, students, attendance, progress, reports, or notifications cannot be deleted.
*Managed by Administrator.*

#### Create Branch
```http
POST http://localhost:8080/api/branches
Content-Type: application/json

{
  "name": "Al-Noor Branch",
  "address": "123 Main Street"
}
```

#### List Branches
```http
GET http://localhost:8080/api/branches
```

---

### 3. User Management (`/api/users`)
*Administrator only.*

`GET /api/users/teachers` returns active Quran teachers for administrators and teachers scoped to their own branch for branch managers. Administrators can use `?branchId={id}` to filter the list.

### Attendance workflows

Student and teacher attendance remain separate resources: `GET/POST /api/student-attendance` and `PUT /api/student-attendance/{id}` operate on `student_attendance`; `GET/POST /api/teacher-attendance` and `PUT /api/teacher-attendance/{id}` operate on `teacher_attendance`. Both accept `date` (or `startDate`/`endDate`) and `status` filters; student attendance additionally accepts `studentId` and `branchId`, while teacher attendance accepts `teacherId` and `branchId`. Branch managers are scoped to their branch by the server, and Quran teachers can record attendance only for assigned students. The database unique constraints allow one record per student/date and per teacher/date. Duplicate submissions return HTTP 409, including when concurrent inserts race. Update operations change status and remarks without changing the person or date on the original record.

Teacher profiles are the existing `app_users` rows with `role=QURAN_TEACHER`; the account ID is the teacher ID referenced by student assignments and attendance. Optional `fullName`, `email`, and `phone` profile fields live on that same row. Hibernate's configured `ddl-auto=update` adds these nullable columns to existing databases. `GET /api/users/teachers/search?q={text}&branchId={id}&active={true|false}&page=0&size=10` returns a paginated roster (branch managers are always scoped to their own active branch). `GET /api/users/teachers/{id}` returns an individual profile for administrators and in-branch managers. Create/update continues through admin-only `POST /api/users` and `PUT /api/users/{id}`; username remains unique, branch must exist, and deactivation uses `active=false` or the existing soft-disable DELETE route. No separate teacher table or account is created.

#### Create Branch Manager
```http
POST http://localhost:8080/api/users
Content-Type: application/json

{
  "username": "manager1",
  "password": "manager12345!",
  "role": "BRANCH_MANAGER",
  "branchId": 1
}
```

#### Create Quran Teacher
```http
POST http://localhost:8080/api/users
Content-Type: application/json

{
  "username": "teacher1",
  "password": "teacher12345!",
  "role": "QURAN_TEACHER",
  "branchId": 1
}
```

---

### 4. Student Management (`/api/students`)
*Managed by Administrator and Branch Manager.*

The portal uses `GET /api/students/search` for database-backed pagination (`page`, `size`, maximum size 100), text search (`q`, matching student name, number, guardian name, or guardian phone), and optional `branchId` / `teacherId` filters. The result is a Spring `Page`; the existing unpaged `GET /api/students` route remains available.

#### Register Student
```http
POST http://localhost:8080/api/students
Content-Type: application/json

{
  "fullName": "Ahmed Mohammed",
  "studentNumber": "STD-001",
  "gender": "Male",
  "dateOfBirth": "2015-03-10",
  "guardianName": "Mohammed Ali",
  "guardianPhone": "+251911123456",
  "branchId": 1,
  "teacherId": 3,
  "enrollmentDate": "2026-09-01",
  "currentLevel": "Juz 1"
}
```

#### List Students (Role-Scoped)
```http
GET http://localhost:8080/api/students
```

---

### 5. Student Attendance (`/api/student-attendance`)
*Recorded by Quran Teachers or Branch Managers.*

**Statuses**: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`

#### Record Student Attendance
```http
POST http://localhost:8080/api/student-attendance
Content-Type: application/json

{
  "studentId": 1,
  "date": "2026-10-07",
  "status": "PRESENT",
  "remarks": "On time"
}
```

#### List Attendance Records
```http
GET http://localhost:8080/api/student-attendance?startDate=2026-10-01&endDate=2026-10-07
```

---

### 6. Teacher Attendance (`/api/teacher-attendance`)
*Recorded by Branch Managers or Administrator.*

#### Record Teacher Attendance
```http
POST http://localhost:8080/api/teacher-attendance
Content-Type: application/json

{
  "teacherId": 3,
  "date": "2026-10-07",
  "status": "PRESENT",
  "remarks": "Arrived on time"
}
```

---

### 7. Quran Progress Tracking (`/api/quran-progress`)
*Recorded by Quran Teachers for assigned students.*

- **Activity Types**: `NEW_LESSON`, `RECITATION`, `REVISION`, `MEMORIZATION`, `CORRECTION`, `OTHER`
- **Progress Statuses**: `EXCELLENT`, `GOOD`, `SATISFACTORY`, `NEEDS_IMPROVEMENT`, `INCOMPLETE`

#### Log Daily Progress
```http
POST http://localhost:8080/api/quran-progress
Content-Type: application/json

{
  "studentId": 1,
  "date": "2026-10-07",
  "surahName": "Al-Fatiha",
  "startAyah": 1,
  "endAyah": 7,
  "activityType": "MEMORIZATION",
  "progressStatus": "EXCELLENT",
  "remarks": "Completed full memorization with Tajweed"
}
```

#### Get Student Progress History
```http
GET http://localhost:8080/api/quran-progress/student/1
```

---

### 8. Hierarchical Reports (`/api/reports`)
*Workflow: Quran Teacher drafts and submits `TEACHER_TO_MANAGER`; the assigned Branch Manager marks it reviewed. A Branch Manager creates and submits a `MANAGER_TO_ADMIN` branch report; an Administrator marks it reviewed.*

Report fields are `title`, free-text `content`, `reportType`, `periodStart`, `periodEnd`, `status`, author/branch IDs, timestamps, and optional review remarks. Listing accepts combined `status`, `type`, `branchId`, `periodStart`, and `periodEnd` filters plus `page` and `size`. Period date filters match reports whose saved range overlaps the requested range. Results are scoped to the teacher's own reports or the manager's assigned branch. Administrators can filter across branches.

#### Create Report (Draft)
```http
POST http://localhost:8080/api/reports
Content-Type: application/json

{
  "title": "Weekly Class Report",
  "content": "All students completed their assigned Juz revision.",
  "reportType": "TEACHER_TO_MANAGER",
  "periodStart": "2026-10-01",
  "periodEnd": "2026-10-07"
}
```

Use `MANAGER_TO_ADMIN` for reports authored by a Branch Manager. Only the author can edit or submit a draft. Authors may delete drafts; administrators may delete any draft. A submitted report can only transition to `REVIEWED`. Rejection and return-for-correction are not supported by the current model/API.

#### Search report history
```http
GET http://localhost:8080/api/reports?status=SUBMITTED&type=TEACHER_TO_MANAGER&periodStart=2026-10-01&periodEnd=2026-10-31&page=0&size=20
```

#### Submit Report
```http
PUT http://localhost:8080/api/reports/1/submit
```

#### Review Report (Manager/Admin)
```http
PUT http://localhost:8080/api/reports/1/review
Content-Type: application/json

{
  "reviewRemarks": "Reviewed. Progress is on track."
}
```

The SRS names report topics and daily, weekly, monthly, and custom periods, but says the mandatory report format must be confirmed. The portal currently accepts narrative content and stores the selected period as inclusive start/end dates; it does not calculate or claim attendance/progress totals. Week boundaries currently use Monday through Sunday. Report date/timestamp handling defaults to `Africa/Addis_Ababa`; set `APP_TIME_ZONE` on the backend and `NEXT_PUBLIC_APP_TIME_ZONE` on the frontend to the same IANA zone if deployment configuration differs. Confirm the week start, timezone, and required report fields/calculations with madrasa management before treating them as final.

#### Export and analytics

`GET /api/reports/export?format=pdf|xlsx` exports the persisted reports matching the same `status`, `type`, `branchId`, `periodStart`, and `periodEnd` filters as the list. Period filters use the same overlapping saved-period rule. Results use the same authenticated scope (teacher's own reports, manager's branch, administrator's requested branch scope). Exports contain report metadata, period and branch, status timestamps, narrative content, review remarks, generation time, and the selected filters. Empty results produce an explicit empty PDF or a workbook with headers and zero records. Exports are capped at 10,000 reports; narrow the filters if the cap is exceeded.

`GET /api/reports/analytics` accepts the same filters and scope and returns counts of persisted reports by status, report type, and branch, plus a total. These are descriptive report-record counts only; they do not parse narratives or imply attendance, Quran progress, branch-performance measures, trends, or comparisons. The endpoint uses grouped database queries. The frontend refreshes these values whenever report filters or pages change.

The SRS lists advanced analytics as future scope but defines dashboard statistics in Phase One. Existing `/api/dashboard` metrics remain scoped by role: administrators receive system-wide counts, branch managers receive assigned-branch counts, and Quran teachers receive assigned-student counts. Attendance totals use records for the current date; recent progress and pending/draft report counts come from persisted records. Additional trend lines, comparisons, and report content totals still require approved metric definitions and comparison periods. Export and analytics routes are secured with the same roles and server-side branch/author scope as report listing.

---

### 9. Parent Notifications (`/api/notifications`)
*Create, review, filter, and manage authorized parent notifications. Notification creation saves a pending record and does not claim delivery.*

- **Types**: `PROGRESS_UPDATE`, `ATTENDANCE_ALERT`, `GENERAL`
- **Delivery Statuses**: `PENDING` (queued locally), `SENT` (provider accepted), `DELIVERED` (provider confirmed), `FAILED`

Listing is paginated and accepts `status`, `notificationType`, `studentId`, `branchId`, `startDate`, `endDate`, and `q` (parent, student name, or student number). Administrators can query all branches or select one; managers are always restricted to their assigned branch; Quran teachers see notifications for their assigned students. Detail, deletion, and send operations enforce the same scope.
`GET /api/notifications/{id}/attempts` returns the authorized delivery attempt history.

#### Create Notification
```http
POST http://localhost:8080/api/notifications
Content-Type: application/json
Idempotency-Key: 8846308a-3f2e-48e1-b7c4-205a12ba9ac7

{
  "studentId": 1,
  "notificationType": "PROGRESS_UPDATE",
  "content": "Your child Ahmed has successfully memorized Surah Al-Fatiha today."
}
```

The selected student must have a saved guardian name and phone number. Optional `relatedProgressId` must refer to a Quran progress record belonging to that student. Reuse the same `Idempotency-Key` when retrying the same create request; using it for different content returns HTTP 409.

#### Attempt Delivery
```http
PUT http://localhost:8080/api/notifications/1/send
```

The delivery SPI is `NotificationDeliveryProvider`; no provider implementation is installed or configured. Until the project owner selects a provider and supplies approved credentials and message templates, this route returns HTTP 503 and leaves the record `PENDING`. It never changes a record to `SENT` just because the database saved it or a request was made. Once an adapter is configured, it must return `SENT` only when the provider accepts the message, `DELIVERED` only after a delivery confirmation, or `FAILED` on provider failure. Provider response/reference and each attempted result are stored in notification delivery history; retries reuse the notification's idempotency key, and concurrent send attempts are serialized.

Notifications are currently created manually from the portal for `PROGRESS_UPDATE`, `ATTENDANCE_ALERT`, or `GENERAL`. The SRS says progress events may generate parent notification information but does not require automatic triggers. No automatic attendance/progress notification rule or external delivery channel has been enabled.

SMS is the selected channel, but no SMS gateway/provider has been selected. Provider credentials, costs, recipient-consent rules, approved SMS templates, and asynchronous delivery-confirmation/webhook requirements are therefore still open. Hibernate `ddl-auto=update` adds provider/idempotency/audit fields, the unique idempotency key, and the `notification_delivery_attempts` history table to existing MySQL databases; review that schema update in the target environment before rollout.

---

### 10. Dashboard Statistics (`/api/dashboard`)
*Returns customized metrics based on the caller's role.*

```http
GET http://localhost:8080/api/dashboard
```

- **Administrator**: Total branches, overall students, teachers, today's attendance summary, recent progress, pending reports.
- **Branch Manager**: Branch-scoped student count, teacher count, today's attendance, recent progress, pending reports.
- **Quran Teacher**: Assigned students count, today's class attendance summary, recent progress, pending reports.
