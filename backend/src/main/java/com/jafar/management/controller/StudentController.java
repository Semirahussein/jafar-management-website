package com.jafar.management.controller;

import java.net.URI;
import java.util.List;

import com.jafar.management.model.Student;
import com.jafar.management.model.Branch;
import com.jafar.management.repository.BranchRepository;
import com.jafar.management.model.AppUser;
import com.jafar.management.repository.AppUserRepository;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.repository.StudentRepository;
import com.jafar.management.repository.StudentAttendanceRepository;
import com.jafar.management.repository.QuranProgressRepository;
import com.jafar.management.repository.ParentNotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY;

@RestController
@RequestMapping("/api/students")
public class StudentController {
    private final StudentRepository students;
    private final BranchRepository branches;
    private final AppUserRepository users;
    private final StudentAttendanceRepository attendance;
    private final QuranProgressRepository progress;
    private final ParentNotificationRepository notifications;

    public StudentController(StudentRepository students, BranchRepository branches, AppUserRepository users,
            StudentAttendanceRepository attendance, QuranProgressRepository progress,
            ParentNotificationRepository notifications) {
        this.students = students;
        this.branches = branches;
        this.users = users;
        this.attendance = attendance;
        this.progress = progress;
        this.notifications = notifications;
    }

    @GetMapping
    public List<Student> list(@AuthenticationPrincipal AppUser user) {
        return switch (user.getRole()) {
            case ADMINISTRATOR -> students.findAll();
            case BRANCH_MANAGER -> students.findAllByBranchId(user.getBranchId());
            case QURAN_TEACHER -> students.findAllByTeacherId(user.getId());
        };
    }

    @GetMapping("/search")
    public Page<Student> search(@AuthenticationPrincipal AppUser user,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long teacherId,
            @RequestParam(required = false) String teacherName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page must be non-negative and size must be between 1 and 100");
        }
        if (user.getRole() == UserRole.BRANCH_MANAGER && user.getBranchId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account is not assigned to a branch");
        }
        Long scopeBranchId = user.getRole() == UserRole.BRANCH_MANAGER ? user.getBranchId() : null;
        Long scopeTeacherId = user.getRole() == UserRole.QURAN_TEACHER ? user.getId() : null;
        String search = q == null || q.isBlank() ? null : q.trim();
        return students.searchStudents(scopeBranchId, scopeTeacherId, branchId, teacherId,
                teacherName == null || teacherName.isBlank() ? null : teacherName.trim(), search,
                PageRequest.of(page, size, Sort.by("fullName").ascending().and(Sort.by("id"))));
    }

    @GetMapping("/{id}")
    public Student get(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        Student student = findStudent(id);
        ensureCanView(student, user);
        return student;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public ResponseEntity<Student> create(@Valid @RequestBody Student student,
            @AuthenticationPrincipal AppUser user) {
        if (students.existsByStudentNumber(student.getStudentNumber())) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "Student number is already in use");
        }
        applyBranchScope(student, user);
        validateAssignments(student, false);
        Student created = students.save(student);
        return ResponseEntity.created(URI.create("/api/students/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public Student update(@PathVariable Long id, @Valid @RequestBody Student input,
            @AuthenticationPrincipal AppUser user) {
        Student existing = findStudent(id);
        ensureCanManage(existing, user);
        if (students.existsByStudentNumberAndIdNot(input.getStudentNumber(), id)) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "Student number is already in use");
        }
        applyBranchScope(input, user);
        if (!java.util.Objects.equals(existing.getBranchId(), input.getBranchId())
                && (attendance.existsByStudentId(id) || progress.existsByStudentId(id) || notifications.existsByStudentId(id))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A student with attendance, progress, or notification history cannot be moved to another branch");
        }
        validateAssignments(input, java.util.Objects.equals(existing.getBranchId(), input.getBranchId()));
        existing.setFullName(input.getFullName());
        existing.setStudentNumber(input.getStudentNumber());
        existing.setGender(input.getGender());
        existing.setDateOfBirth(input.getDateOfBirth());
        existing.setGuardianName(input.getGuardianName());
        existing.setGuardianPhone(input.getGuardianPhone());
        existing.setBranchId(input.getBranchId());
        existing.setTeacherId(input.getTeacherId());
        existing.setEnrollmentDate(input.getEnrollmentDate());
        existing.setCurrentLevel(input.getCurrentLevel());
        return students.save(existing);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        Student existing = findStudent(id);
        ensureCanManage(existing, user);
        if (attendance.existsByStudentId(id) || progress.existsByStudentId(id) || notifications.existsByStudentId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot delete student with recorded attendance, progress, or notifications");
        }
        students.delete(existing);
        return ResponseEntity.noContent().build();
    }

    private void applyBranchScope(Student student, AppUser user) {
        if (user.getRole() == UserRole.BRANCH_MANAGER) {
            student.setBranchId(user.getBranchId());
        }
    }

    private void validateAssignments(Student student, boolean retainingExistingBranch) {
        Branch branch = branches.findById(student.getBranchId()).orElse(null);
        if (branch == null || (!branch.isActive() && !retainingExistingBranch)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "An active branch is required for a new or changed student assignment");
        }
        if (student.getTeacherId() != null) {
            AppUser teacher = users.findById(student.getTeacherId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Teacher does not exist"));
            if (teacher.getRole() != UserRole.QURAN_TEACHER || !teacher.isActive()
                    || !student.getBranchId().equals(teacher.getBranchId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Teacher must be assigned to the student's branch");
            }
        }
    }

    private void ensureCanView(Student student, AppUser user) {
        if (user.getRole() == UserRole.BRANCH_MANAGER && !java.util.Objects.equals(user.getBranchId(), student.getBranchId()))
            deny();
        if (user.getRole() == UserRole.QURAN_TEACHER && !user.getId().equals(student.getTeacherId()))
            deny();
    }

    private void ensureCanManage(Student student, AppUser user) {
        if (user.getRole() == UserRole.BRANCH_MANAGER && !java.util.Objects.equals(user.getBranchId(), student.getBranchId()))
            deny();
    }

    private void deny() {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access this student");
    }

    private Student findStudent(Long id) {
        return students.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Student not found"));
    }
}
