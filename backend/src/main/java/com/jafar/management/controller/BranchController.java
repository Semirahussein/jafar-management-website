package com.jafar.management.controller;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.PageImpl;

import com.jafar.management.model.AppUser;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.Branch;
import com.jafar.management.repository.AppUserRepository;
import com.jafar.management.repository.BranchRepository;
import com.jafar.management.repository.ParentNotificationRepository;
import com.jafar.management.repository.QuranProgressRepository;
import com.jafar.management.repository.ReportRepository;
import com.jafar.management.repository.StudentRepository;
import com.jafar.management.repository.StudentAttendanceRepository;
import com.jafar.management.repository.TeacherAttendanceRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
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

@RestController
@RequestMapping("/api/branches")
public class BranchController {
    private final BranchRepository branches;
    private final AppUserRepository users;
    private final StudentRepository students;
    private final StudentAttendanceRepository studentAttendance;
    private final TeacherAttendanceRepository teacherAttendance;
    private final QuranProgressRepository progress;
    private final ReportRepository reports;
    private final ParentNotificationRepository notifications;

    public BranchController(BranchRepository branches, AppUserRepository users, StudentRepository students,
            StudentAttendanceRepository studentAttendance, TeacherAttendanceRepository teacherAttendance,
            QuranProgressRepository progress, ReportRepository reports, ParentNotificationRepository notifications) {
        this.branches = branches;
        this.users = users;
        this.students = students;
        this.studentAttendance = studentAttendance;
        this.teacherAttendance = teacherAttendance;
        this.progress = progress;
        this.reports = reports;
        this.notifications = notifications;
    }

    @GetMapping
    public List<Branch> list(@AuthenticationPrincipal AppUser user) {
        if (user.getRole() == UserRole.ADMINISTRATOR) return branches.findAll();
        if (user.getBranchId() == null) return List.of();
        return branches.findById(user.getBranchId()).map(List::of).orElseGet(List::of);
    }

    @GetMapping("/search")
    public Page<Branch> search(@AuthenticationPrincipal AppUser user,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String q,
            @org.springframework.web.bind.annotation.RequestParam(required = false) Boolean active,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "0") int page,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "20") int size) {
        if (page < 0 || size < 1 || size > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page must be non-negative and size must be between 1 and 100");
        if (user.getRole() != UserRole.ADMINISTRATOR) {
            if (user.getBranchId() == null) return Page.empty(PageRequest.of(page, size));
            return branches.findById(user.getBranchId())
                    .filter(branch -> (q == null || q.isBlank() || branch.getName().toLowerCase().contains(q.trim().toLowerCase())
                            || (branch.getAddress() != null && branch.getAddress().toLowerCase().contains(q.trim().toLowerCase())))
                            && (active == null || branch.isActive() == active))
                    .<Page<Branch>>map(branch -> new PageImpl<>(List.of(branch), PageRequest.of(page, size), 1))
                    .orElseGet(() -> Page.empty(PageRequest.of(page, size)));
        }
        return branches.searchBranches(q == null || q.isBlank() ? null : q.trim(), active,
                PageRequest.of(page, size, Sort.by("name").ascending().and(Sort.by("id"))));
    }

    @GetMapping("/{id}")
    public Branch get(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        ensureBranchAccess(id, user);
        return findBranch(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public Branch create(@Valid @RequestBody BranchRequest request) {
        if (branches.existsByNameIgnoreCase(request.name().trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Branch name is already in use");
        }
        Branch branch = new Branch();
        apply(branch, request);
        return branches.save(branch);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public Branch update(@PathVariable Long id, @Valid @RequestBody BranchRequest request,
                         @AuthenticationPrincipal AppUser user) {
        ensureBranchAccess(id, user);
        if (branches.existsByNameIgnoreCaseAndIdNot(request.name().trim(), id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Branch name is already in use");
        }
        Branch branch = findBranch(id);
        apply(branch, request);
        return branches.save(branch);
    }

    @DeleteMapping("/{id}")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public void delete(@PathVariable Long id) {
        Branch branch = findBranch(id);
        if (users.existsByBranchId(id) || students.existsByBranchId(id)
                || studentAttendance.existsByBranchId(id) || teacherAttendance.existsByBranchId(id)
                || progress.existsByBranchId(id) || reports.existsByBranchId(id)
                || notifications.existsByBranchId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Branch has assigned users, students, or historical records and cannot be deleted");
        }
        branches.delete(branch);
    }

    private void ensureBranchAccess(Long branchId, AppUser user) {
        if (user.getRole() == UserRole.BRANCH_MANAGER && !branchId.equals(user.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access this branch");
        }
        if (user.getRole() == UserRole.QURAN_TEACHER && !branchId.equals(user.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access this branch");
        }
    }

    private Branch findBranch(Long id) {
        return branches.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch not found"));
    }

    private void apply(Branch branch, BranchRequest request) {
        branch.setName(request.name().trim());
        branch.setAddress(request.address() == null || request.address().isBlank() ? null : request.address().trim());
        if (request.active() != null) branch.setActive(request.active());
    }

    public record BranchRequest(@NotBlank @Size(max = 120) String name,
            @Size(max = 255) String address, Boolean active) {}
}
