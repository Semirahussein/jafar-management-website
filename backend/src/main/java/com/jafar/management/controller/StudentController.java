package com.jafar.management.controller;

import java.net.URI;
import java.util.List;

import com.jafar.management.model.Student;
import com.jafar.management.repository.BranchRepository;
import com.jafar.management.model.AppUser;
import com.jafar.management.repository.AppUserRepository;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.repository.StudentRepository;
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

    public StudentController(StudentRepository students, BranchRepository branches, AppUserRepository users) {
        this.students = students;
        this.branches = branches;
        this.users = users;
    }

    @GetMapping
    public List<Student> list(@AuthenticationPrincipal AppUser user) {
        return switch (user.getRole()) {
            case ADMINISTRATOR -> students.findAll();
            case BRANCH_MANAGER -> students.findAllByBranchId(user.getBranchId());
            case QURAN_TEACHER -> students.findAllByTeacherId(user.getId());
        };
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
        validateAssignments(student);
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
        validateAssignments(input);
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
        students.delete(existing);
        return ResponseEntity.noContent().build();
    }

    private void applyBranchScope(Student student, AppUser user) {
        if (user.getRole() == UserRole.BRANCH_MANAGER) {
            student.setBranchId(user.getBranchId());
        }
    }

    private void validateAssignments(Student student) {
        if (!branches.existsById(student.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch does not exist");
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
        if (user.getRole() == UserRole.BRANCH_MANAGER && !user.getBranchId().equals(student.getBranchId()))
            deny();
        if (user.getRole() == UserRole.QURAN_TEACHER && !user.getId().equals(student.getTeacherId()))
            deny();
    }

    private void ensureCanManage(Student student, AppUser user) {
        if (user.getRole() == UserRole.BRANCH_MANAGER && !user.getBranchId().equals(student.getBranchId()))
            deny();
    }

    private void deny() {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access this student");
    }

    private Student findStudent(Long id) {
        return students.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Student not found"));
    }
}
