# JAFAR Management System

A centralized web-based management platform designed for madrasas to streamline administrative operations, track student and teacher attendance, monitor daily Quran learning/memorization progress, manage multi-tier hierarchical reporting, and handle parent communications across multiple branches.

---

## 📌 Project Overview & Current Features

The system is designed according to the **JAFAR Management System Software Requirements Specification (SRS)**. All **Phase One core backend modules** have been implemented with role-based security:

| Module | Status | Description |
|---|:---:|---|
| **Authentication & RBAC** | ✅ Done | Spring Security with HTTP Basic Auth, BCrypt password hashing, role-based method security, and automatic bootstrap seeder. |
| **Branch Management** | ✅ Done | Multi-branch architecture supporting priority branches with full CRUD and deletion protection. |
| **User Management** | ✅ Done | Administrative user provisioning for `ADMINISTRATOR`, `BRANCH_MANAGER`, and `QURAN_TEACHER` with soft-delete & last-admin safeguard. |
| **Student Management** | ✅ Done | Student profiles, unique student IDs, guardian contacts, branch and teacher assignments, and learning level tracking. |
| **Student Attendance Tracking** | ✅ Done | Daily student attendance recording (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`), teacher/recorder audit trail, and historical queries. |
| **Teacher Attendance Tracking** | ✅ Done | Daily Quran Teacher attendance tracking managed by Branch Managers/Administrators with remarks and status logging. |
| **Quran Progress Tracking** | ✅ Done | Daily Quran learning & memorization logs (Surah, start/end ayah, activity type e.g., *Memorization*, *Recitation*, *Revision*, and performance evaluation). |
| **Hierarchical Reporting** | ✅ Done | 2-tier reporting workflow: **Quran Teacher → Branch Manager → Administrator** with Draft, Submitted, and Reviewed statuses. |
| **Parent Notifications** | ✅ Done | Student progress and attendance notification dispatch and delivery history tracking (`PENDING`, `SENT`, `DELIVERED`, `FAILED`). |
| **Role-Specific Dashboards** | ✅ Done | Tailored dashboard metrics for Admin (system-wide), Branch Manager (branch-scoped), and Teacher (assigned students). |

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
- **Authentication**: HTTP Basic Auth + BCrypt Password Encoding

---

## 🚀 Getting Started

### 1. Database Setup (MySQL / XAMPP)
Start MySQL in your XAMPP Control Panel and create the database and database user:

```sql
CREATE DATABASE IF NOT EXISTS jafar_management;
CREATE USER IF NOT EXISTS 'jafar_user'@'localhost' IDENTIFIED BY 'jafar_password';
GRANT ALL PRIVILEGES ON jafar_management.* TO 'jafar_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Backend Setup
Configure your bootstrap administrator in `backend/.env` (or environment variables):
```bash
export BOOTSTRAP_ADMIN_USERNAME='admin'
export BOOTSTRAP_ADMIN_PASSWORD='admin1234'
```

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
| `GET / POST` | `/api/branches` | List / Create branches | Authenticated / Admin |
| `GET / PUT / DELETE` | `/api/branches/{id}` | Get / Update / Delete branch | Scoped / Admin, Manager / Admin |
| `GET / POST` | `/api/users` | List / Create users | Admin |
| `GET / PUT / DELETE` | `/api/users/{id}` | Get / Update / Disable user | Admin |
| `GET / POST` | `/api/students` | List / Register students | Scoped / Admin, Manager |
| `GET / PUT / DELETE` | `/api/students/{id}` | Get / Update / Delete student | Scoped / Admin, Manager |
| `GET / POST` | `/api/student-attendance` | View / Record student attendance | Scoped / Teacher, Manager, Admin |
| `GET / POST` | `/api/teacher-attendance` | View / Record teacher attendance | Admin, Branch Manager |
| `GET / POST` | `/api/quran-progress` | View / Record Quran progress | Scoped / Teacher, Manager, Admin |
| `GET / POST` | `/api/reports` | View / Draft reports | Scoped / All |
| `PUT` | `/api/reports/{id}/submit` | Submit draft report | Author |
| `PUT` | `/api/reports/{id}/review` | Review submitted report | Manager, Admin |
| `GET / POST` | `/api/notifications` | View / Create parent notifications | Scoped / Teacher, Manager, Admin |
| `PUT` | `/api/notifications/{id}/send` | Mark notification as sent | Manager, Admin |
| `GET` | `/api/dashboard` | Role-tailored dashboard metrics | All Authenticated Users |

---

## 🧪 Testing with Postman
For complete step-by-step Postman testing instructions, sample JSON payloads, and test workflows, refer to the [Postman Testing Guide](backend/README.md).
