package com.jafar.management.controller;

import java.util.List;
import java.util.ArrayList;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.repository.AppUserRepository;
import com.jafar.management.repository.BranchRepository;
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
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMINISTRATOR')")
public class UserController {
    private final AppUserRepository users;
    private final BranchRepository branches;
    private final PasswordEncoder passwordEncoder;

    public UserController(AppUserRepository users, BranchRepository branches, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.branches = branches;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<UserView> list() {
        return users.findAll().stream().map(UserView::from).toList();
    }

    @GetMapping("/{id}")
    public UserView get(@PathVariable Long id) { return UserView.from(findUser(id)); }

    @PostMapping
    public UserView create(@Valid @RequestBody CreateUserRequest request) {
        if (users.existsByUsername(request.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already in use");
        }
        List<Long> branchIds = resolveBranchIds(request.role(), request.branchIds(), request.branchId());
        validateRoleAndBranches(request.role(), branchIds);
        AppUser user = new AppUser(request.username(), passwordEncoder.encode(request.password()),
                request.role(), branchIds.stream().findFirst().orElse(null));
        user.setBranchIds(branchIds);
        AppUser saved = users.save(user);
        return UserView.from(saved);
    }

    @PutMapping("/{id}")
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
        List<Long> branchIds = resolveBranchIds(request.role(), request.branchIds(), request.branchId());
        validateRoleAndBranches(request.role(), branchIds);
        user.setUsername(request.username());
        user.setRole(request.role());
        user.setBranchIds(branchIds);
        user.setActive(request.active());
        if (request.password() != null) user.setPasswordHash(passwordEncoder.encode(request.password()));
        return UserView.from(users.save(user));
    }

    @DeleteMapping("/{id}")
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

    private List<Long> resolveBranchIds(UserRole role, List<Long> branchIds, Long branchId) {
        if (branchIds != null) {
            return branchIds.stream().distinct().toList();
        }
        if (branchId != null) {
            return List.of(branchId);
        }
        return List.of();
    }

    private void validateRoleAndBranches(UserRole role, List<Long> branchIds) {
        if (role == UserRole.ADMINISTRATOR && !branchIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Administrators are not assigned to a branch");
        }
        if (role == UserRole.QURAN_TEACHER && branchIds.size() != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A Quran teacher must be assigned to exactly one branch");
        }
        if (role == UserRole.BRANCH_MANAGER && branchIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A branch manager must be assigned to at least one branch");
        }
        if (branchIds.stream().anyMatch(branchId -> !branches.existsById(branchId))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Every assigned branch must exist");
        }
    }

    private AppUser findUser(Long id) {
        return users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    public record CreateUserRequest(@NotBlank @Size(max = 80) String username,
                                    @NotBlank @Size(min = 12, max = 100) String password,
                                    @NotNull UserRole role, Long branchId, List<Long> branchIds) {}

    public record UpdateUserRequest(@NotBlank @Size(max = 80) String username,
                                    @Size(min = 12, max = 100) String password,
                                    @NotNull UserRole role, Long branchId, List<Long> branchIds,
                                    @NotNull Boolean active) {}

    public record UserView(Long id, String username, UserRole role, Long branchId,
                           List<Long> branchIds, boolean active) {
        static UserView from(AppUser user) {
            return new UserView(user.getId(), user.getUsername(), user.getRole(),
                    user.getBranchId(), new ArrayList<>(user.getBranchIds()), user.isActive());
        }
    }
}
