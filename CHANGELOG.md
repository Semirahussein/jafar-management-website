# Changelog

All notable changes to the **JAFAR Management System** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-10-08

### Added
- **Student Attendance Tracking Module (`/api/student-attendance`)**:
  - `StudentAttendance` entity with unique composite constraint on `(studentId, date)`.
  - `AttendanceStatus` enum supporting `PRESENT`, `ABSENT`, `LATE`, and `EXCUSED`.
  - `StudentAttendanceRepository` with date-range filters and branch/teacher aggregation counts.
  - `StudentAttendanceController` implementing role-scoped attendance logging and historical inspection.

- **Teacher Attendance Tracking Module (`/api/teacher-attendance`)**:
  - `TeacherAttendance` entity and `TeacherAttendanceRepository`.
  - `TeacherAttendanceController` enabling Branch Managers and Administrators to log and review daily attendance and remarks for Quran Teachers.

- **Quran Progress Tracking Module (`/api/quran-progress`)**:
  - `QuranProgress` entity and `QuranProgressRepository`.
  - Enums for `ActivityType` (`NEW_LESSON`, `RECITATION`, `REVISION`, `MEMORIZATION`, `CORRECTION`, `OTHER`) and `ProgressStatus` (`EXCELLENT`, `GOOD`, `SATISFACTORY`, `NEEDS_IMPROVEMENT`, `INCOMPLETE`).
  - `QuranProgressController` providing endpoints to record daily Surah and Ayah range progress with student history tracking.

- **Hierarchical Reporting Module (`/api/reports`)**:
  - `Report` model supporting the 2-tier reporting hierarchy: **Quran Teacher $\rightarrow$ Branch Manager $\rightarrow$ Administrator**.
  - `ReportType` (`TEACHER_TO_MANAGER`, `MANAGER_TO_ADMIN`) and `ReportStatus` (`DRAFT`, `SUBMITTED`, `REVIEWED`).
  - `ReportRepository` and `ReportController` with report draft creation, submission, and manager/admin review endpoints.

- **Parent Notifications Module (`/api/notifications`)**:
  - `ParentNotification` entity and `ParentNotificationRepository`.
  - Enums for `NotificationType` (`PROGRESS_UPDATE`, `ATTENDANCE_ALERT`, `GENERAL`) and `DeliveryStatus` (`PENDING`, `SENT`, `DELIVERED`, `FAILED`).
  - `ParentNotificationController` with auto-population of guardian contact info and status tracking.

- **Dashboard Statistics API (`/api/dashboard`)**:
  - `DashboardController` with role-aware metrics aggregation:
    - **Administrator**: Consolidated cross-branch totals, daily attendance stats, recent Quran progress, and pending reports.
    - **Branch Manager**: Branch-specific totals, teacher/student attendance statistics, and pending teacher reports.
    - **Quran Teacher**: Assigned student counts, class daily attendance overview, and recent progress history.

- **Documentation**:
  - Comprehensive root `README.md` covering system features, RBAC matrix, and quickstart instructions.
  - Detailed `backend/README.md` with complete API reference and Postman JSON payloads for all endpoints.

### Changed
- **`BootstrapAdmin.java`**:
  - Added username and password string sanitization (trimming whitespace).
  - Added automatic password hash synchronization to ensure default admin credentials stay in sync with configuration.
  - Added startup logging to list all registered users in MySQL.
- **`SecurityConfig.java`**:
  - Added trace and debug logging for authentication attempts and user lookup.
- **`application.properties`**:
  - Configured `DEBUG` logging levels for `org.springframework.security` and `com.jafar.management`.
- **`.gitignore`**:
  - Excluded `backend/target/` and `backend/.env` from version control.

### Fixed
- Changed constructors in newly created model entities (`StudentAttendance`, `TeacherAttendance`, `QuranProgress`, `Report`, `ParentNotification`) from `protected` to `public` to allow instantiation by controllers.
- Fixed malformed leading space in `.env` variable (`BOOTSTRAP_ADMIN_USERNAME`) that prevented default administrator sign-in.

---

## [0.1.0] - 2026-10-01

### Added
- Initial project scaffolding for **Spring Boot 3.5** backend and **Next.js** frontend.
- **Authentication & Security**:
  - Spring Security configuration with HTTP Basic Auth and BCrypt password encryption.
  - Initial `BootstrapAdmin` component for bootstrapping the primary administrator.
  - `UserRole` enum (`ADMINISTRATOR`, `BRANCH_MANAGER`, `QURAN_TEACHER`).
- **Branch Management (`/api/branches`)**:
  - `Branch` entity and `BranchRepository`.
  - `BranchController` for branch creation, listing, updating, and protected deletion.
- **User Management (`/api/users`)**:
  - `AppUser` entity and `AppUserRepository`.
  - `UserController` for creating and managing user accounts with role assignments and soft-disable functionality.
- **Student Management (`/api/students`)**:
  - `Student` entity and `StudentRepository`.
  - `StudentController` supporting student registration, guardian info, branch scoping, and teacher assignment.
- **Health Check (`/api/health`)**:
  - Public health check endpoint.

