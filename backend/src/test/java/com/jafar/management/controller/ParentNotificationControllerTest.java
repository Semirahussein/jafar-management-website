package com.jafar.management.controller;

import com.jafar.management.dto.enums.DeliveryStatus;
import com.jafar.management.dto.enums.NotificationType;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.ParentNotification;
import com.jafar.management.repository.NotificationDeliveryAttemptRepository;
import com.jafar.management.model.Student;
import com.jafar.management.repository.ParentNotificationRepository;
import com.jafar.management.repository.QuranProgressRepository;
import com.jafar.management.repository.StudentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Proxy;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class ParentNotificationControllerTest {
    @Test
    void managerCannotReadAnotherBranchesNotification() throws Exception {
        Student student = student(3L, 20L, 7L, "Guardian", "+251900000000");
        ParentNotification notification = notification(3L, 20L);
        ParentNotificationController controller = controller(notification, student, new AtomicReference<>());
        AppUser manager = user(UserRole.BRANCH_MANAGER, 10L, 5L);

        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> controller.getNotification(1L, manager)).getStatusCode().value());
    }

    @Test
    void teacherCannotReadNotificationsForUnassignedStudent() throws Exception {
        Student student = student(3L, 20L, 7L, "Guardian", "+251900000000");
        ParentNotificationController controller = controller(notification(3L, 20L), student, new AtomicReference<>());

        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> controller.getStudentNotifications(3L, user(UserRole.QURAN_TEACHER, 20L, 8L))).getStatusCode().value());
    }

    @Test
    void notificationCreationRequiresSavedGuardianContact() throws Exception {
        Student student = student(3L, 20L, 7L, "Guardian", " ");
        ParentNotificationController controller = controller(null, student, new AtomicReference<>());

        assertEquals(422, assertThrows(ResponseStatusException.class, () -> controller.createNotification(
                new ParentNotificationController.CreateNotificationRequest(3L, NotificationType.GENERAL, "Message", null),
                "request-key-123", user(UserRole.BRANCH_MANAGER, 20L, 5L))).getStatusCode().value());
    }

    @Test
    void managerListQueryIsForcedToTheirOwnBranch() throws Exception {
        AtomicReference<Object[]> captured = new AtomicReference<>();
        ParentNotificationRepository notifications = proxy(ParentNotificationRepository.class, (p, method, args) -> {
            if (method.getName().equals("searchNotifications")) { captured.set(args); return new PageImpl<>(List.of()); }
            return null;
        });
        StudentRepository students = proxy(StudentRepository.class, (p, method, args) ->
                method.getName().equals("findAllById") ? List.of() : null);
        ParentNotificationController controller = new ParentNotificationController(notifications,
                proxy(NotificationDeliveryAttemptRepository.class, (p, method, args) -> List.of()), students, null, null);

        controller.listNotifications(user(UserRole.BRANCH_MANAGER, 20L, 5L), null, null, null,
                88L, null, null, null, 0, 20);

        assertEquals(20L, captured.get()[0]);
    }

    private ParentNotificationController controller(ParentNotification notification, Student student,
            AtomicReference<Object[]> captured) {
        ParentNotificationRepository notifications = proxy(ParentNotificationRepository.class, (p, method, args) -> switch (method.getName()) {
            case "findById" -> Optional.ofNullable(notification);
            case "findAllByStudentIdOrderByCreatedAtDesc" -> List.of(notification);
            default -> null;
        });
        StudentRepository students = proxy(StudentRepository.class, (p, method, args) -> switch (method.getName()) {
            case "findById" -> Optional.ofNullable(student);
            case "findAllById" -> List.of(student);
            default -> null;
        });
        return new ParentNotificationController(notifications,
                proxy(NotificationDeliveryAttemptRepository.class, (p, method, args) -> List.of()), students, null, null);
    }

    private ParentNotification notification(Long studentId, Long branchId) {
        ParentNotification notification = new ParentNotification();
        notification.setId(1L); notification.setStudentId(studentId); notification.setBranchId(branchId);
        notification.setDeliveryStatus(DeliveryStatus.PENDING); notification.setParentName("Guardian");
        notification.setParentContact("+251900000000"); notification.setNotificationType(NotificationType.GENERAL);
        notification.setContent("Message"); return notification;
    }

    private Student student(Long id, Long branch, Long teacher, String guardian, String phone) throws Exception {
        var constructor = Student.class.getDeclaredConstructor(); constructor.setAccessible(true);
        Student student = constructor.newInstance();
        var idField = Student.class.getDeclaredField("id"); idField.setAccessible(true); idField.set(student, id);
        student.setBranchId(branch); student.setTeacherId(teacher); student.setGuardianName(guardian); student.setGuardianPhone(phone);
        student.setFullName("Student"); return student;
    }

    private AppUser user(UserRole role, Long branchId, Long userId) throws Exception {
        AppUser user = new AppUser("user", "hash", role, branchId);
        var field = AppUser.class.getDeclaredField("id"); field.setAccessible(true); field.set(user, userId);
        return user;
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, java.lang.reflect.InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, handler);
    }
}
