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
CREATE USER IF NOT EXISTS 'jafar_user'@'localhost' IDENTIFIED BY 'jafar_password';
GRANT ALL PRIVILEGES ON jafar_management.* TO 'jafar_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## 🚀 Running the Application

### 1. Environment Configuration
Set bootstrap administrator credentials in `backend/.env` or export them:
```bash
export BOOTSTRAP_ADMIN_USERNAME='admin'
export BOOTSTRAP_ADMIN_PASSWORD='admin1234'
```

### 2. Start Application
```bash
cd backend
mvn spring-boot:run
```
The application runs on `http://localhost:8080`.

---

## 🔐 Authentication & Roles

All endpoints (except `GET /api/health`) require **HTTP Basic Authentication**.

### Available Roles:
- `ADMINISTRATOR` — Organization-wide visibility across all branches.
- `BRANCH_MANAGER` — Access restricted to their assigned branch (`branchId`).
- `QURAN_TEACHER` — Access restricted to students assigned to them (`teacherId`).

---

## 📋 API Reference & Postman Testing Guide

Set Postman Authorization to **Basic Auth** with the relevant user credentials.

### 1. Health Check (Public)
```http
GET http://localhost:8080/api/health
```

---

### 2. Branch Management (`/api/branches`)
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
*Workflow: Teacher drafts & submits to Manager → Manager reviews & submits branch report to Admin.*

#### Create Report (Draft)
```http
POST http://localhost:8080/api/reports
Content-Type: application/json

{
  "title": "Weekly Class Report",
  "content": "All students completed their assigned Juz revision.",
  "periodStart": "2026-10-01",
  "periodEnd": "2026-10-07"
}
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
  "reviewRemarks": "Approved. Progress is on track."
}
```

---

### 9. Parent Notifications (`/api/notifications`)
*Generate and monitor parent notification history.*

- **Types**: `PROGRESS_UPDATE`, `ATTENDANCE_ALERT`, `GENERAL`
- **Delivery Statuses**: `PENDING`, `SENT`, `DELIVERED`, `FAILED`

#### Create Notification
```http
POST http://localhost:8080/api/notifications
Content-Type: application/json

{
  "studentId": 1,
  "notificationType": "PROGRESS_UPDATE",
  "content": "Your child Ahmed has successfully memorized Surah Al-Fatiha today."
}
```

#### Mark as Sent
```http
PUT http://localhost:8080/api/notifications/1/send
```

---

### 10. Dashboard Statistics (`/api/dashboard`)
*Returns customized metrics based on the caller's role.*

```http
GET http://localhost:8080/api/dashboard
```

- **Administrator**: Total branches, overall students, teachers, today's attendance summary, recent progress, pending reports.
- **Branch Manager**: Branch-scoped student count, teacher count, today's attendance, recent progress, pending reports.
- **Quran Teacher**: Assigned students count, today's class attendance summary, recent progress, pending reports.
