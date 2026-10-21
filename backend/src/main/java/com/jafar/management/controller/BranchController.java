package com.jafar.management.controller;

import java.util.List;

import com.jafar.management.model.AppUser;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.Branch;
import com.jafar.management.repository.AppUserRepository;
import com.jafar.management.repository.BranchRepository;
import com.jafar.management.repository.StudentRepository;
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

    public BranchController(BranchRepository branches, AppUserRepository users, StudentRepository students) {
        this.branches = branches;
        this.users = users;
        this.students = students;
    }

    @GetMapping
    public List<Branch> list(@AuthenticationPrincipal AppUser user) {
        if (user.getRole() == UserRole.ADMINISTRATOR) return branches.findAll();
        if (user.getBranchId() == null) return List.of();
        return branches.findById(user.getBranchId()).map(List::of).orElseGet(List::of);
    }

    @GetMapping("/{id}")
    public Branch get(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        ensureBranchAccess(id, user);
        return findBranch(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public Branch create(@Valid @RequestBody BranchRequest request) {
        if (branches.findAll().stream().anyMatch(branch -> branch.getName().equalsIgnoreCase(request.name()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Branch name is already in use");
        }
        Branch branch = new Branch();
        branch.setName(request.name());
        branch.setAddress(request.address());
        return branches.save(branch);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public Branch update(@PathVariable Long id, @Valid @RequestBody BranchRequest request,
                         @AuthenticationPrincipal AppUser user) {
        ensureBranchAccess(id, user);
        if (branches.existsByNameIgnoreCaseAndIdNot(request.name(), id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Branch name is already in use");
        }
        Branch branch = findBranch(id);
        branch.setName(request.name());
        branch.setAddress(request.address());
        return branches.save(branch);
    }

    @DeleteMapping("/{id}")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public void delete(@PathVariable Long id) {
        Branch branch = findBranch(id);
        if (users.existsByBranchId(id) || students.existsByBranchId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Branch is still assigned to users or students and cannot be deleted");
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

    public record BranchRequest(@NotBlank @Size(max = 120) String name, @Size(max = 255) String address) {}
}
