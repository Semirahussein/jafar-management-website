package com.jafar.management.repository;

import java.util.Optional;
import java.util.List;

import com.jafar.management.model.AppUser;
import com.jafar.management.dto.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByUsernameAndIdNot(String username, Long id);
    boolean existsByBranchId(Long branchId);
    boolean existsByAdditionalBranchIdsContains(Long branchId);
    long countByRoleAndActiveTrue(UserRole role);
    List<AppUser> findAllByBranchIdAndRoleAndActiveTrue(Long branchId, UserRole role);
}
