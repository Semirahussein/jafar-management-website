package com.jafar.management.repository;

import com.jafar.management.model.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchRepository extends JpaRepository<Branch, Long> {
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
