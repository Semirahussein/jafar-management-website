package com.jafar.management.repository;

import java.util.List;

import com.jafar.management.model.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentRepository extends JpaRepository<Student, Long> {
    boolean existsByStudentNumber(String studentNumber);
    boolean existsByStudentNumberAndIdNot(String studentNumber, Long id);
    List<Student> findAllByBranchId(Long branchId);
    List<Student> findAllByTeacherId(Long teacherId);
    boolean existsByTeacherId(Long teacherId);
    long countByBranchId(Long branchId);
    long countByTeacherId(Long teacherId);
    boolean existsByBranchId(Long branchId);

    @Query("""
            select student from Student student
            where (:scopeBranchId is null or student.branchId = :scopeBranchId)
              and (:scopeTeacherId is null or student.teacherId = :scopeTeacherId)
              and (:branchId is null or student.branchId = :branchId)
              and (:teacherId is null or student.teacherId = :teacherId)
              and (:teacherName is null or exists (select teacher.id from AppUser teacher where teacher.id = student.teacherId and (lower(teacher.username) like lower(concat('%', :teacherName, '%')) or lower(coalesce(teacher.fullName, '')) like lower(concat('%', :teacherName, '%')))))
              and (:search is null
                   or lower(student.fullName) like lower(concat('%', :search, '%'))
                   or lower(student.studentNumber) like lower(concat('%', :search, '%'))
                   or lower(coalesce(student.guardianName, '')) like lower(concat('%', :search, '%'))
                   or lower(coalesce(student.guardianPhone, '')) like lower(concat('%', :search, '%')))
            """)
    Page<Student> searchStudents(@Param("scopeBranchId") Long scopeBranchId,
                                 @Param("scopeTeacherId") Long scopeTeacherId,
                                 @Param("branchId") Long branchId,
                                 @Param("teacherId") Long teacherId,
                                 @Param("teacherName") String teacherName,
                                 @Param("search") String search,
                                 Pageable pageable);
}
