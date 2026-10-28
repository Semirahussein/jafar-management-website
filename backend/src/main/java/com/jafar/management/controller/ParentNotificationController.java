package com.jafar.management.controller;

import com.jafar.management.dto.enums.DeliveryStatus;
import com.jafar.management.dto.enums.NotificationType;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.ParentNotification;
import com.jafar.management.model.NotificationDeliveryAttempt;
import com.jafar.management.model.Student;
import com.jafar.management.repository.ParentNotificationRepository;
import com.jafar.management.repository.NotificationDeliveryAttemptRepository;
import com.jafar.management.repository.QuranProgressRepository;
import com.jafar.management.repository.StudentRepository;
import com.jafar.management.service.ParentNotificationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.regex.Pattern;

@RestController
@Validated
@RequestMapping("/api/notifications")
public class ParentNotificationController {
    private static final Pattern IDEMPOTENCY_KEY = Pattern.compile("[A-Za-z0-9._:-]{8,80}");
    private final ParentNotificationRepository notifications;
    private final NotificationDeliveryAttemptRepository attempts;
    private final StudentRepository students;
    private final QuranProgressRepository progress;
    private final ParentNotificationService notificationService;

    public ParentNotificationController(ParentNotificationRepository notifications, NotificationDeliveryAttemptRepository attempts,
            StudentRepository students,
            QuranProgressRepository progress, ParentNotificationService notificationService) {
        this.notifications = notifications;
        this.attempts = attempts;
        this.students = students;
        this.progress = progress;
        this.notificationService = notificationService;
    }

    public record CreateNotificationRequest(@NotNull Long studentId, @NotNull NotificationType notificationType,
            @NotBlank @Size(max = 4000) String content, @Positive Long relatedProgressId) {}

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public Page<ParentNotification> listNotifications(@AuthenticationPrincipal AppUser user,
            @RequestParam(required = false) DeliveryStatus status,
            @RequestParam(required = false) NotificationType notificationType,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        if (page < 0 || size < 1 || size > 100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page must be non-negative and size must be between 1 and 100");
        if (startDate != null && endDate != null && startDate.isAfter(endDate))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date cannot be after end date");
        Long branch = user.getRole() == UserRole.BRANCH_MANAGER ? requireBranch(user) : branchId;
        Long teacher = user.getRole() == UserRole.QURAN_TEACHER ? user.getId() : null;
        Page<ParentNotification> result = notifications.searchNotifications(branch, teacher, studentId, q == null || q.isBlank() ? null : q.trim(), status, notificationType,
                startDate == null ? null : startDate.atStartOfDay(),
                endDate == null ? null : endDate.atTime(LocalTime.MAX),
                PageRequest.of(page, size, Sort.by("createdAt").descending().and(Sort.by("id").descending())));
        attachStudentNames(result.getContent());
        return result;
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public List<ParentNotification> getStudentNotifications(@PathVariable Long studentId, @AuthenticationPrincipal AppUser user) {
        Student student = findStudent(studentId);
        ensureCanAccess(student, user);
        List<ParentNotification> result = notifications.findAllByStudentIdOrderByCreatedAtDesc(studentId);
        attachStudentNames(result);
        return result;
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public ParentNotification getNotification(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        ParentNotification notification = notifications.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        Student student = findStudent(notification.getStudentId());
        ensureNotificationAccess(notification, student, user);
        notification.setStudentName(student.getFullName());
        return notification;
    }

    @GetMapping("/{id}/attempts")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public List<NotificationDeliveryAttempt> getAttempts(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        ParentNotification notification = notifications.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        ensureNotificationAccess(notification, findStudent(notification.getStudentId()), user);
        return attempts.findAllByNotificationIdOrderByAttemptedAtDesc(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('BRANCH_MANAGER', 'QURAN_TEACHER')")
    public ParentNotification createNotification(@RequestBody @Valid CreateNotificationRequest request,
            @RequestHeader("Idempotency-Key") @NotBlank @Size(max = 80) String idempotencyKey,
            @AuthenticationPrincipal AppUser user) {
        if (!IDEMPOTENCY_KEY.matcher(idempotencyKey).matches())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Idempotency-Key must contain 8 to 80 letters, digits, dots, underscores, colons, or dashes");
        Student student = findStudent(request.studentId());
        ensureCanAccess(student, user);
        if (student.getGuardianName() == null || student.getGuardianName().isBlank()
                || student.getGuardianPhone() == null || student.getGuardianPhone().isBlank())
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "A guardian name and contact number must be saved on the student profile before creating a notification");
        if (request.relatedProgressId() != null) {
            var progressRecord = progress.findById(request.relatedProgressId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Related Quran progress record was not found"));
            if (!Objects.equals(progressRecord.getStudentId(), student.getId()))
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Related progress must belong to the selected student");
        }
        ParentNotification notification = notificationService.create(student, request.notificationType(), request.content(),
                request.relatedProgressId(), user.getId(), idempotencyKey);
        notification.setStudentName(student.getFullName());
        return notification;
    }

    @PutMapping("/{id}/send")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public ResponseEntity<?> sendNotification(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        ParentNotification existing = notifications.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        ensureNotificationAccess(existing, findStudent(existing.getStudentId()), user);
        var attempt = notificationService.deliver(id);
        attempt.notification().setStudentName(findStudent(attempt.notification().getStudentId()).getFullName());
        if (attempt.notification().getDeliveryStatus() == DeliveryStatus.FAILED)
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                    "message", "The delivery provider reported a failure. You may retry this notification.",
                    "notification", attempt.notification()));
        return ResponseEntity.ok(attempt.notification());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public void deleteNotification(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        ParentNotification notification = notifications.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        ensureNotificationAccess(notification, findStudent(notification.getStudentId()), user);
        if (notification.getDeliveryStatus() != DeliveryStatus.PENDING)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending notifications can be deleted");
        notifications.delete(notification);
    }

    private Student findStudent(Long id) {
        return students.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
    }

    private Long requireBranch(AppUser user) {
        if (user.getBranchId() == null)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account is not assigned to a branch");
        return user.getBranchId();
    }

    private void ensureCanAccess(Student student, AppUser user) {
        if (user.getRole() == UserRole.BRANCH_MANAGER && !Objects.equals(student.getBranchId(), requireBranch(user)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Student is outside your assigned branch");
        if (user.getRole() == UserRole.QURAN_TEACHER && !Objects.equals(student.getTeacherId(), user.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Student is not assigned to you");
    }

    private void ensureNotificationAccess(ParentNotification notification, Student student, AppUser user) {
        if (user.getRole() == UserRole.BRANCH_MANAGER && !Objects.equals(notification.getBranchId(), requireBranch(user)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Notification is outside your assigned branch");
        if (user.getRole() == UserRole.QURAN_TEACHER && !Objects.equals(student.getTeacherId(), user.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Student is not assigned to you");
    }

    private void attachStudentNames(List<ParentNotification> rows) {
        Map<Long, String> names = students.findAllById(rows.stream().map(ParentNotification::getStudentId).distinct().toList())
                .stream().collect(Collectors.toMap(Student::getId, Student::getFullName, (first, second) -> first));
        rows.forEach(row -> row.setStudentName(names.get(row.getStudentId())));
    }
}
