package com.jafar.management.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Branch;
import com.jafar.management.model.Student;
import com.jafar.management.repository.AppUserRepository;
import com.jafar.management.repository.BranchRepository;
import com.jafar.management.repository.NotificationDeliveryAttemptRepository;
import com.jafar.management.repository.ParentNotificationRepository;
import com.jafar.management.repository.QuranProgressRepository;
import com.jafar.management.repository.ReportRepository;
import com.jafar.management.repository.StudentAttendanceRepository;
import com.jafar.management.repository.StudentRepository;
import com.jafar.management.repository.TeacherAttendanceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicLong;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Shared scaffolding for real Spring Boot integration tests: boots the full application
 * context (real SecurityFilterChain, real @PreAuthorize interceptors, real H2 database via
 * JPA) and drives it through MockMvc. Named without a "Test" suffix so Surefire does not try
 * to execute it directly.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTestBase {

    protected static final AtomicLong SEQ = new AtomicLong(System.nanoTime());

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;
    @Autowired protected PasswordEncoder passwordEncoder;

    @Autowired protected BranchRepository branchRepository;
    @Autowired protected AppUserRepository userRepository;
    @Autowired protected StudentRepository studentRepository;
    @Autowired protected StudentAttendanceRepository studentAttendanceRepository;
    @Autowired protected TeacherAttendanceRepository teacherAttendanceRepository;
    @Autowired protected QuranProgressRepository quranProgressRepository;
    @Autowired protected ReportRepository reportRepository;
    @Autowired protected ParentNotificationRepository parentNotificationRepository;
    @Autowired protected NotificationDeliveryAttemptRepository deliveryAttemptRepository;

    /** Generates a short, test-run-unique token for natural-key fields (names, usernames...). */
    protected static String unique(String label) {
        return label + "-" + SEQ.incrementAndGet();
    }

    protected Branch createBranch(String label) {
        Branch branch = new Branch();
        branch.setName(unique(label));
        branch.setAddress("123 " + label + " Street");
        return branchRepository.save(branch);
    }

    protected AppUser createUser(UserRole role, Long branchId, String rawPassword) {
        AppUser user = new AppUser(unique(role.name().toLowerCase()), passwordEncoder.encode(rawPassword), role, branchId);
        user.setFullName(role.name() + " Fixture");
        user.setActive(true);
        return userRepository.save(user);
    }

    protected AppUser createInactiveUser(UserRole role, Long branchId, String rawPassword) {
        AppUser user = createUser(role, branchId, rawPassword);
        user.setActive(false);
        return userRepository.save(user);
    }

    protected Student createStudent(Long branchId, Long teacherId) {
        Student student = newStudent();
        student.setFullName("Student " + unique("name"));
        student.setStudentNumber(unique("STD"));
        student.setBranchId(branchId);
        student.setTeacherId(teacherId);
        student.setEnrollmentDate(LocalDate.now());
        student.setGuardianName("Guardian " + unique("g"));
        student.setGuardianPhone("+2519" + (SEQ.incrementAndGet() % 100000000L));
        return studentRepository.save(student);
    }

    /** Student's default constructor is protected; instantiate via reflection for fixtures. */
    protected static Student newStudent() {
        try {
            var constructor = Student.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            return constructor.newInstance();
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    /** Performs a real POST /api/auth/login and returns the resulting HTTP session. */
    protected MockHttpSession loginAs(String username, String rawPassword) throws Exception {
        String body = """
                {"username":"%s","password":"%s","rememberMe":false}
                """.formatted(username, rawPassword);
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    /** Like {@link #loginAs} but returns the raw MvcResult without asserting HTTP 200 (for negative-path auth tests). */
    protected MvcResult attemptLogin(String username, String rawPassword) throws Exception {
        String body = """
                {"username":"%s","password":"%s","rememberMe":false}
                """.formatted(username, rawPassword);
        return mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn();
    }

    /** Convenience: creates a branch + role-specific user, logs in, and returns the session. */
    protected record LoggedInUser(AppUser user, MockHttpSession session) {}

    protected LoggedInUser loginAsNewUser(UserRole role, Long branchId) throws Exception {
        String rawPassword = "Password123456";
        AppUser user = createUser(role, branchId, rawPassword);
        MockHttpSession session = loginAs(user.getUsername(), rawPassword);
        return new LoggedInUser(user, session);
    }

    protected static org.springframework.test.web.servlet.request.RequestPostProcessor withCsrf() {
        return csrf();
    }
}
