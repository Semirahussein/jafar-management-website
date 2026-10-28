package com.jafar.management.repository;

import com.jafar.management.dto.enums.AttendanceStatus;
import com.jafar.management.dto.enums.NotificationType;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Branch;
import com.jafar.management.model.ParentNotification;
import com.jafar.management.model.Student;
import com.jafar.management.model.StudentAttendance;
import com.jafar.management.model.TeacherAttendance;
import com.jafar.management.dto.enums.UserRole;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * PERSIST-001..006: boots only the JPA slice against the real H2 database (no web layer),
 * verifying real Hibernate/SQL-level constraints that the hand-rolled proxy-mock unit tests
 * cannot exercise.
 */
@DataJpaTest
@ActiveProfiles("test")
class PersistenceConstraintTest {

    @Autowired private TestEntityManager entityManager;
    @Autowired private StudentAttendanceRepository studentAttendanceRepository;
    @Autowired private TeacherAttendanceRepository teacherAttendanceRepository;
    @Autowired private ParentNotificationRepository parentNotificationRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private BranchRepository branchRepository;
    @Autowired private AppUserRepository appUserRepository;
    @Autowired private PlatformTransactionManager transactionManager;

    private Branch branch() {
        Branch branch = new Branch();
        branch.setName("Branch " + System.nanoTime());
        return branchRepository.saveAndFlush(branch);
    }

    private Student student(Long branchId) throws Exception {
        Student student = newStudent();
        student.setFullName("Student " + System.nanoTime());
        student.setStudentNumber("STD-" + System.nanoTime());
        student.setBranchId(branchId);
        student.setEnrollmentDate(LocalDate.now());
        return studentRepository.saveAndFlush(student);
    }

    private AppUser user(Long branchId) {
        AppUser user = new AppUser("user-" + System.nanoTime(), "hash", UserRole.QURAN_TEACHER, branchId);
        return appUserRepository.saveAndFlush(user);
    }

    private static Student newStudent() throws Exception {
        var constructor = Student.class.getDeclaredConstructor();
        constructor.setAccessible(true);
        return constructor.newInstance();
    }

    // PERSIST-001
    @Test
    void duplicateStudentAttendanceOnSameDateViolatesUniqueConstraint() throws Exception {
        Branch branch = branch();
        Student student = student(branch.getId());
        AppUser recorder = user(branch.getId());
        LocalDate date = LocalDate.now();

        StudentAttendance first = new StudentAttendance();
        first.setStudentId(student.getId());
        first.setDate(date);
        first.setStatus(AttendanceStatus.PRESENT);
        first.setRecordedById(recorder.getId());
        first.setBranchId(branch.getId());
        studentAttendanceRepository.saveAndFlush(first);

        StudentAttendance duplicate = new StudentAttendance();
        duplicate.setStudentId(student.getId());
        duplicate.setDate(date);
        duplicate.setStatus(AttendanceStatus.ABSENT);
        duplicate.setRecordedById(recorder.getId());
        duplicate.setBranchId(branch.getId());

        assertThrows(DataIntegrityViolationException.class,
                () -> studentAttendanceRepository.saveAndFlush(duplicate));
    }

    // PERSIST-002
    @Test
    void duplicateTeacherAttendanceOnSameDateViolatesUniqueConstraint() {
        Branch branch = branch();
        AppUser teacher = user(branch.getId());
        AppUser recorder = user(branch.getId());
        LocalDate date = LocalDate.now();

        TeacherAttendance first = new TeacherAttendance();
        first.setTeacherId(teacher.getId());
        first.setDate(date);
        first.setStatus(AttendanceStatus.PRESENT);
        first.setBranchId(branch.getId());
        first.setRecordedById(recorder.getId());
        teacherAttendanceRepository.saveAndFlush(first);

        TeacherAttendance duplicate = new TeacherAttendance();
        duplicate.setTeacherId(teacher.getId());
        duplicate.setDate(date);
        duplicate.setStatus(AttendanceStatus.LATE);
        duplicate.setBranchId(branch.getId());
        duplicate.setRecordedById(recorder.getId());

        assertThrows(DataIntegrityViolationException.class,
                () -> teacherAttendanceRepository.saveAndFlush(duplicate));
    }

    // PERSIST-003
    @Test
    void prePersistPopulatesCreatedAtForStudentAndBranch() throws Exception {
        Branch branch = branch();
        assertNotNull(branch.getId());

        Student student = student(branch.getId());
        assertNotNull(student.getCreatedAt(), "Student.createdAt must be populated by @PrePersist");
        assertTrue(student.getCreatedAt().isBefore(LocalDateTime.now().plusSeconds(1)));

        StudentAttendance attendance = new StudentAttendance();
        attendance.setStudentId(student.getId());
        attendance.setDate(LocalDate.now());
        attendance.setStatus(AttendanceStatus.PRESENT);
        attendance.setRecordedById(1L);
        attendance.setBranchId(branch.getId());
        StudentAttendance saved = studentAttendanceRepository.saveAndFlush(attendance);
        assertNotNull(saved.getCreatedAt(), "StudentAttendance.createdAt must be populated by @PrePersist");
    }

    // PERSIST-004: referential/business-level FK consistency - branch with students cannot be deleted
    // via the repository layer without application-level protection (enforced in BranchController;
    // here we verify the underlying data relationship a controller-level guard depends on).
    @Test
    void branchWithStudentsIsDetectedByExistsByBranchId() throws Exception {
        Branch branch = branch();
        assertFalse(studentRepository.existsByBranchId(branch.getId()));
        student(branch.getId());
        assertTrue(studentRepository.existsByBranchId(branch.getId()));
    }

    // PERSIST-005
    @Test
    void idempotencyKeyHasRealUniqueIndex() throws Exception {
        Branch branch = branch();
        Student student = student(branch.getId());
        String key = "idem-" + System.nanoTime();

        ParentNotification first = new ParentNotification();
        first.setStudentId(student.getId());
        first.setNotificationType(NotificationType.GENERAL);
        first.setContent("First");
        first.setBranchId(branch.getId());
        first.setIdempotencyKey(key);
        parentNotificationRepository.saveAndFlush(first);

        ParentNotification duplicate = new ParentNotification();
        duplicate.setStudentId(student.getId());
        duplicate.setNotificationType(NotificationType.GENERAL);
        duplicate.setContent("Second");
        duplicate.setBranchId(branch.getId());
        duplicate.setIdempotencyKey(key);

        assertThrows(DataIntegrityViolationException.class,
                () -> parentNotificationRepository.saveAndFlush(duplicate));
    }

    // PERSIST-006: transactional rollback on a forced mid-operation error leaves zero orphan rows
    @Test
    void transactionRollsBackCompletelyOnForcedError() throws Exception {
        Branch branch = branch();
        Student student = student(branch.getId());
        long countBefore = studentAttendanceRepository.count();

        TransactionTemplate template = new TransactionTemplate(transactionManager);
        // REQUIRES_NEW so this runs as its own independent physical transaction (as a real
        // top-level @Transactional service method would), rather than merely joining and
        // marking rollback-only the surrounding @DataJpaTest test-managed transaction - which
        // would not actually roll back the connection until long after this assertion runs.
        template.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        try {
            template.execute((TransactionStatus status) -> {
                StudentAttendance attendance = new StudentAttendance();
                attendance.setStudentId(student.getId());
                attendance.setDate(LocalDate.now());
                attendance.setStatus(AttendanceStatus.PRESENT);
                attendance.setRecordedById(1L);
                attendance.setBranchId(branch.getId());
                entityManager.getEntityManager().persist(attendance);
                entityManager.getEntityManager().flush();
                throw new RuntimeException("forced mid-operation failure");
            });
        } catch (RuntimeException expected) {
            // expected: forces rollback of the whole transaction
        }

        long countAfter = studentAttendanceRepository.count();
        assertEquals(countBefore, countAfter, "No orphan rows should remain after a rolled-back transaction");
    }
}
