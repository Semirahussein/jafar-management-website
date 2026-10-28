package com.jafar.management.repository;

import com.jafar.management.model.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BranchRepository extends JpaRepository<Branch, Long> {
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    @Query("select b from Branch b where (:search is null or lower(b.name) like lower(concat('%', :search, '%')) or lower(coalesce(b.address, '')) like lower(concat('%', :search, '%'))) and (:active is null or b.active = :active)")
    Page<Branch> searchBranches(@Param("search") String search, @Param("active") Boolean active, Pageable pageable);
}
