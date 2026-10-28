package com.jafar.management.repository;

import java.util.Optional;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.jafar.management.model.AppUser;
import com.jafar.management.dto.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByUsernameAndIdNot(String username, Long id);
    boolean existsByBranchId(Long branchId);
    long countByRoleAndActiveTrue(UserRole role);
    long countByRoleAndBranchIdAndActiveTrue(UserRole role, Long branchId);
    List<AppUser> findAllByRoleAndActiveTrue(UserRole role);
    List<AppUser> findAllByRoleAndBranchIdAndActiveTrue(UserRole role, Long branchId);

    @Query("select u from AppUser u where u.role = :role and (:branchId is null or u.branchId = :branchId) and (:active is null or u.active = :active) and (:q is null or lower(u.username) like lower(concat('%', :q, '%')) or lower(coalesce(u.fullName, '')) like lower(concat('%', :q, '%')) or lower(coalesce(u.email, '')) like lower(concat('%', :q, '%')) or lower(coalesce(u.phone, '')) like lower(concat('%', :q, '%')))")
    Page<AppUser> searchTeachers(@Param("role") UserRole role, @Param("branchId") Long branchId,
                                 @Param("active") Boolean active, @Param("q") String q, Pageable pageable);

    @Query("select u from AppUser u where (:role is null or u.role = :role) and (:active is null or u.active = :active) and (:q is null or lower(u.username) like lower(concat('%', :q, '%')) or lower(coalesce(u.fullName, '')) like lower(concat('%', :q, '%')) or lower(coalesce(u.email, '')) like lower(concat('%', :q, '%')) or lower(coalesce(u.phone, '')) like lower(concat('%', :q, '%')))")
    Page<AppUser> searchUsers(@Param("role") UserRole role, @Param("active") Boolean active,
                              @Param("q") String q, Pageable pageable);
}
