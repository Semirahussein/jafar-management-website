package com.jafar.management.controller;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Branch;
import com.jafar.management.repository.AppUserRepository;
import com.jafar.management.repository.BranchRepository;
import com.jafar.management.repository.StudentRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
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

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final AppUserRepository users;
    private final BranchRepository branches;
    private final PasswordEncoder passwordEncoder;
    private final StudentRepository students;

    public UserController(AppUserRepository users, BranchRepository branches, PasswordEncoder passwordEncoder,
            StudentRepository students) {
        this.users = users;
        this.branches = branches;
        this.passwordEncoder = passwordEncoder;
        this.students = students;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public List<UserView> list() {
        return users.findAll().stream().map(UserView::from).toList();
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public Page<UserView> searchUsers(@RequestParam(required = false) String q,
            @RequestParam(required = false) UserRole role, @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        if (page < 0 || size < 1 || size > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page must be non-negative and size must be between 1 and 100");
        return users.searchUsers(role, active, q == null || q.isBlank() ? null : q.trim(),
                PageRequest.of(page, size, Sort.by("username").ascending().and(Sort.by("id")))).map(UserView::from);
    }

    @GetMapping("/teachers")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public List<UserView> teachers(@AuthenticationPrincipal AppUser requester,
                                   @RequestParam(required = false) Long branchId) {
        if (requester.getRole() == UserRole.BRANCH_MANAGER) {
            return users.findAllByRoleAndBranchIdAndActiveTrue(UserRole.QURAN_TEACHER, requester.getBranchId())
                    .stream().map(UserView::from).toList();
        }
        List<AppUser> teachers = branchId == null
                ? users.findAllByRoleAndActiveTrue(UserRole.QURAN_TEACHER)
                : users.findAllByRoleAndBranchIdAndActiveTrue(UserRole.QURAN_TEACHER, branchId);
        return teachers.stream().map(UserView::from).toList();
    }

    @GetMapping("/teachers/search")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public Page<UserView> searchTeachers(@AuthenticationPrincipal AppUser requester,
            @RequestParam(required = false) String q, @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Boolean active, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        if (page < 0 || size < 1 || size > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page must be non-negative and size must be between 1 and 100");
        boolean manager = requester.getRole() == UserRole.BRANCH_MANAGER;
        if (manager && requester.getBranchId() == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account is not assigned to a branch");
        Page<AppUser> results = users.searchTeachers(UserRole.QURAN_TEACHER,
                manager ? requester.getBranchId() : branchId, manager ? Boolean.TRUE : active,
                q == null || q.isBlank() ? null : q.trim(), PageRequest.of(page, size, Sort.by("fullName").ascending().and(Sort.by("username").ascending())));
        return results.map(UserView::from);
    }

    @GetMapping("/teachers/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public UserView getTeacher(@PathVariable Long id, @AuthenticationPrincipal AppUser requester) {
        AppUser teacher = findUser(id);
        if (teacher.getRole() != UserRole.QURAN_TEACHER) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Teacher not found");
        if (requester.getRole() == UserRole.BRANCH_MANAGER && (!requester.getBranchId().equals(teacher.getBranchId()) || !teacher.isActive()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access this teacher");
        return UserView.from(teacher);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public UserView get(@PathVariable Long id) { return UserView.from(findUser(id)); }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public UserView create(@Valid @RequestBody CreateUserRequest request) {
        if (users.existsByUsername(request.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already in use");
        }
        validateRoleAndBranch(request.role(), request.branchId(), false);
        AppUser created = new AppUser(request.username(), passwordEncoder.encode(request.password()), request.role(), request.branchId());
        applyProfile(created, request.fullName(), request.email(), request.phone());
        AppUser saved = users.save(created);
        return UserView.from(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public UserView update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request,
                           @AuthenticationPrincipal AppUser administrator) {
        AppUser user = findUser(id);
        if (user.isActive() && !request.active()) {
            if (administrator.getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot disable your own account");
            }
            if (user.getRole() == UserRole.ADMINISTRATOR
                    && users.countByRoleAndActiveTrue(UserRole.ADMINISTRATOR) <= 1) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "The last active administrator cannot be disabled");
            }
        }
        if (users.existsByUsernameAndIdNot(request.username(), id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already in use");
        }
        boolean retainingBranch = user.getRole() == request.role()
                && java.util.Objects.equals(user.getBranchId(), request.branchId());
        if (user.getRole() == UserRole.QURAN_TEACHER && !java.util.Objects.equals(user.getBranchId(), request.branchId())
                && students.existsByTeacherId(user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A teacher with assigned students cannot be moved until those students are reassigned");
        }
        validateRoleAndBranch(request.role(), request.branchId(), retainingBranch);
        user.setUsername(request.username());
        user.setRole(request.role());
        user.setBranchId(request.branchId());
        user.setActive(request.active());
        applyProfile(user, request.fullName(), request.email(), request.phone());
        if (request.password() != null) user.setPasswordHash(passwordEncoder.encode(request.password()));
        return UserView.from(users.save(user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal AppUser administrator) {
        AppUser user = findUser(id);
        if (administrator.getId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot disable your own account");
        }
        if (user.getRole() == UserRole.ADMINISTRATOR && user.isActive()
                && users.countByRoleAndActiveTrue(UserRole.ADMINISTRATOR) <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The last active administrator cannot be disabled");
        }
        user.setActive(false);
        users.save(user);
    }

    private void validateRoleAndBranch(UserRole role, Long branchId, boolean allowInactiveExistingAssignment) {
        if (role == UserRole.ADMINISTRATOR && branchId != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Administrators are not assigned to a branch");
        }
        if (role != UserRole.ADMINISTRATOR) {
            Branch branch = branchId == null ? null : branches.findById(branchId).orElse(null);
            if (branch == null || (!branch.isActive() && !allowInactiveExistingAssignment)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "An active branch is required for a new or changed assignment");
            }
        }
    }

    private AppUser findUser(Long id) {
        return users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private void applyProfile(AppUser user, String fullName, String email, String phone) {
        user.setFullName(clean(fullName)); user.setEmail(clean(email)); user.setPhone(clean(phone));
    }
    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    public record CreateUserRequest(@NotBlank @Size(max = 80) String username,
                                    @NotBlank @Size(min = 12, max = 100) String password,
                                    @NotNull UserRole role, Long branchId, @Size(max = 150) String fullName,
                                    @Size(max = 254) String email, @Size(max = 30) String phone) {}

    public record UpdateUserRequest(@NotBlank @Size(max = 80) String username,
                                    @Size(min = 12, max = 100) String password,
                                    @NotNull UserRole role, Long branchId, @NotNull Boolean active,
                                    @Size(max = 150) String fullName, @Size(max = 254) String email, @Size(max = 30) String phone) {}

    public record UserView(Long id, String username, UserRole role, Long branchId, boolean active,
                           String fullName, String email, String phone) {
        static UserView from(AppUser user) {
            return new UserView(user.getId(), user.getUsername(), user.getRole(), user.getBranchId(), user.isActive(), user.getFullName(), user.getEmail(), user.getPhone());
        }
    }
}
