# JAFAR Management System

A centralized web-based management platform designed for madrasas to streamline administrative operations, track student and teacher attendance, monitor daily Quran learning/memorization progress, manage multi-tier hierarchical reporting, and handle parent communications across multiple branches.

---

## 📌 Project Overview & Current Features

The system is designed according to the **JAFAR Management System Software Requirements Specification (SRS)**. All **Phase One core backend modules** have been implemented with role-based security:

| Module | Status | Description |
|---|:---:|---|
| **Authentication & RBAC** | ✅ Done | Spring Security session login, HTTP Basic API compatibility, BCrypt password hashing, role-based method security, and optional bootstrap administrator. |
| **Branch Management** | ✅ Done | Multi-branch architecture supporting priority branches with full CRUD and deletion protection. |
| **User Management** | ✅ Done | Administrative user provisioning for `ADMINISTRATOR`, `BRANCH_MANAGER`, and `QURAN_TEACHER` with soft-delete & last-admin safeguard. |
| **Student Management** | ✅ Done | Student profiles, unique student IDs, guardian contacts, branch and teacher assignments, and learning level tracking. |
| **Student Attendance Tracking** | ✅ Done | Daily student attendance recording (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`), teacher/recorder audit trail, and historical queries. |
| **Teacher Attendance Tracking** | ✅ Done | Daily Quran Teacher attendance tracking managed by Branch Managers/Administrators with remarks and status logging. |
| **Quran Progress Tracking** | ✅ Done | Daily Quran learning & memorization logs (Surah, start/end ayah, activity type e.g., *Memorization*, *Recitation*, *Revision*, and performance evaluation). |
| **Hierarchical Reporting** | ✅ Done | 2-tier reporting workflow: **Quran Teacher → Branch Manager → Administrator** with Draft, Submitted, and Reviewed statuses, filtered PDF/Excel exports, and scoped report-count analytics. |
| **Parent Notifications** | ✅ Done | Authorized notification creation, history, idempotent requests, and provider delivery status tracking. External SMS/WhatsApp delivery stays disabled until the owner selects and configures a provider. |
| **Role-Specific Dashboards** | ✅ Done | Tailored dashboard metrics for Admin (system-wide), Branch Manager (branch-scoped), and Teacher (assigned students). |

Kitab progress is not defined in the current project requirements and has no existing model or API. Its fields and workflow need a product requirements decision before implementation.

---

## 👥 User Roles & Permissions Matrix

The system enforces strict Role-Based Access Control (RBAC):

```
       ┌────────────────────────┐
       │     Administrator      │  (System-wide visibility across all branches)
       └───────────┬────────────┘
                   │
       ┌───────────▼────────────┐
       │     Branch Manager     │  (Branch-scoped: teachers, students, branch reports)
       └───────────┬────────────┘
                   │
       ┌───────────▼────────────┐
       │     Quran Teacher      │  (Class-scoped: assigned students, attendance, progress)
       └────────────────────────┘
```

- **Administrator (`ADMINISTRATOR`)**: Full access across all branches, manages users and branches, reviews branch reports, views system-wide statistics.
- **Branch Manager (`BRANCH_MANAGER`)**: Manages students and teachers in their assigned branch, tracks teacher attendance, reviews teacher reports, submits branch reports to Admin.
- **Quran Teacher (`QURAN_TEACHER`)**: Views assigned students, records student attendance and Quran progress, drafts and submits teaching reports to Branch Manager.

---

## 🛠️ Technology Stack

- **Backend**: Java 25 / 21+, Spring Boot 3.5.5, Spring Data JPA, Spring Security, Maven
- **Frontend**: Next.js 14+ (React, Tailwind CSS)
- **Database**: MySQL 8+ (XAMPP local development environment)
- **Authentication**: Spring Security server sessions + HTTP Basic API compatibility + BCrypt password encoding

---

## 🚀 Getting Started

### 1. Database Setup (MySQL / XAMPP)
Start MySQL in your XAMPP Control Panel and create the database and database user:

```sql
CREATE DATABASE IF NOT EXISTS jafar_management;
CREATE USER IF NOT EXISTS 'jafar_user'@'localhost' IDENTIFIED BY 'replace-with-a-unique-database-password';
GRANT ALL PRIVILEGES ON jafar_management.* TO 'jafar_user'@'localhost';
FLUSH PRIVILEGES;
```
This SQL is for local development. Configure `DB_USERNAME` and `DB_PASSWORD` explicitly in the backend environment; the backend does not provide a default database password.

### 2. Backend Setup
Configure a bootstrap administrator in the backend environment before first startup. Use a unique password and do not commit these values:
```bash
export DB_USERNAME='jafar_user'
export DB_PASSWORD='the-database-password-you-configured'
export BOOTSTRAP_ADMIN_USERNAME='choose-an-admin-username'
export BOOTSTRAP_ADMIN_PASSWORD='replace-with-a-unique-long-password'
export SESSION_COOKIE_SECURE='false' # Use true behind HTTPS
export REMEMBER_ME_KEY='replace-with-a-stable-random-secret'
```
`REMEMBER_ME_KEY` should be randomly generated and stable across backend restarts. If omitted, a process-specific random key is used, and Remember me cookies expire when the backend restarts.

Run the Spring Boot application:
```bash
cd backend
mvn spring-boot:run
```
The backend starts at **`http://localhost:8080`**.

### 3. Frontend Setup
```bash
npm install
npm run dev
```
The frontend starts at **`http://localhost:3000`**.

---

## 📡 Backend API Endpoints Summary

| Method | Endpoint | Description | Permitted Roles |
|---|---|---|---|
| `GET` | `/api/health` | Health check endpoint | Public |
| `GET` | `/api/auth/csrf` | Obtain CSRF token | Public |
| `POST` | `/api/auth/login` | Authenticate and start session; optional 14-day Remember me | Public |
| `GET` | `/api/auth/me` | Current authenticated user | Authenticated |
| `POST` | `/api/auth/logout` | End session | Authenticated |
| `GET / POST` | `/api/branches` | List / Create branches | Authenticated / Admin |
| `GET / PUT / DELETE` | `/api/branches/{id}` | Get / Update / Delete branch | Scoped / Admin, Manager / Admin |
| `GET / POST` | `/api/users` | List / Create users | Admin |
| `GET` | `/api/users/teachers` | List active teachers, scoped to a manager's branch | Admin, Branch Manager |
| `GET` | `/api/users/teachers/search` | Search, filter, and paginate teacher profiles | Admin, Branch Manager |
| `GET` | `/api/users/teachers/{id}` | View teacher profile, branch scoped for managers | Admin, Branch Manager |
| `GET / POST` | `/api/student-attendance` | Search / Record student attendance | Admin, Branch Manager, Assigned Teacher |
| `PUT` | `/api/student-attendance/{id}` | Update status and remarks | Authorized branch or assigned teacher |
| `GET / POST` | `/api/teacher-attendance` | Search / Record teacher attendance | Admin, Branch Manager |
| `PUT` | `/api/teacher-attendance/{id}` | Update status and remarks | Admin, Branch Manager (branch scoped) |
| `GET / PUT / DELETE` | `/api/users/{id}` | Get / Update / Disable user | Admin |
| `GET / POST` | `/api/students` | List / Register students | Scoped / Admin, Manager |
| `GET` | `/api/students/search` | Search and paginate by name, student number, guardian, branch, and teacher | Scoped |
| `GET / PUT / DELETE` | `/api/students/{id}` | Get / Update / Delete student | Scoped / Admin, Manager |
| `GET / POST` | `/api/student-attendance` | View / Record student attendance | Scoped / Teacher, Manager, Admin |
| `GET / POST` | `/api/teacher-attendance` | View / Record teacher attendance | Admin, Branch Manager |
| `GET / POST` | `/api/quran-progress` | View / Record Quran progress; GET filters by student, teacher, branch, date range, Surah, and activity | Scoped / Teacher, Manager, Admin |
| `GET / POST` | `/api/reports` | View / Draft reports | Scoped / All |
| `PUT` | `/api/reports/{id}/submit` | Submit draft report | Author |
| `PUT` | `/api/reports/{id}/review` | Review submitted report | Manager, Admin |
| `GET / POST` | `/api/notifications` | Search notification history / Create an idempotent pending notification | Scoped / Teacher, Manager |
| `PUT` | `/api/notifications/{id}/send` | Attempt delivery through a configured provider; unavailable until one is selected | Manager, Admin |
| `GET` | `/api/dashboard` | Role-tailored dashboard metrics | All Authenticated Users |

---

## 🧪 Testing with Postman
For complete step-by-step Postman testing instructions, sample JSON payloads, and test workflows, refer to the [Postman Testing Guide](backend/README.md).
