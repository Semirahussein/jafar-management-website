package com.jafar.management.repository;

import java.util.List;

import com.jafar.management.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentRepository extends JpaRepository<Student, Long> {
    boolean existsByStudentNumber(String studentNumber);
    boolean existsByStudentNumberAndIdNot(String studentNumber, Long id);
    List<Student> findAllByBranchId(Long branchId);
    List<Student> findAllByTeacherId(Long teacherId);
    boolean existsByBranchId(Long branchId);
}
