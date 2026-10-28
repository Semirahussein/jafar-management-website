package com.jafar.management.service;

import com.jafar.management.dto.enums.DeliveryStatus;
import com.jafar.management.dto.enums.NotificationType;
import com.jafar.management.model.ParentNotification;
import com.jafar.management.model.Student;
import com.jafar.management.repository.ParentNotificationRepository;
import com.jafar.management.repository.NotificationDeliveryAttemptRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Proxy;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class ParentNotificationServiceTest {
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-27T08:00:00Z"), ZoneId.of("Africa/Addis_Ababa"));

    @Test
    void missingProviderDoesNotPretendOrChangePendingStatus() throws Exception {
        ParentNotification notification = notification(9L, DeliveryStatus.PENDING);
        AtomicReference<ParentNotification> row = new AtomicReference<>(notification);
        ParentNotificationService service = service(row, Optional.empty(), new AtomicInteger());

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.deliver(9L));
        assertEquals(503, error.getStatusCode().value());
        assertEquals(DeliveryStatus.PENDING, row.get().getDeliveryStatus());
        assertEquals(0, row.get().getAttemptCount());
    }

    @Test
    void providerAcceptanceIsSentButNotMarkedDeliveredAndDuplicateSendIsIdempotent() throws Exception {
        ParentNotification notification = notification(9L, DeliveryStatus.PENDING);
        AtomicReference<ParentNotification> row = new AtomicReference<>(notification);
        AtomicInteger calls = new AtomicInteger();
        NotificationDeliveryProvider provider = provider((record, key) -> {
            calls.incrementAndGet(); assertEquals("request-key-123", key);
            return new NotificationDeliveryProvider.DeliveryResult(DeliveryStatus.SENT, "provider-1", "accepted", null);
        });
        ParentNotificationService service = service(row, Optional.of(provider), new AtomicInteger());

        var sent = service.deliver(9L);
        var duplicate = service.deliver(9L);

        assertEquals(DeliveryStatus.SENT, sent.notification().getDeliveryStatus());
        assertNull(sent.notification().getDeliveredAt());
        assertEquals(LocalDateTime.now(CLOCK), sent.notification().getSentAt());
        assertEquals(DeliveryStatus.SENT, duplicate.notification().getDeliveryStatus());
        assertEquals(1, calls.get());
    }

    @Test
    void providerDeliveryConfirmationAndFailureAreRecordedAndFailedItemsCanRetryWithSameKey() throws Exception {
        ParentNotification notification = notification(9L, DeliveryStatus.PENDING);
        AtomicReference<ParentNotification> row = new AtomicReference<>(notification);
        AtomicInteger calls = new AtomicInteger();
        NotificationDeliveryProvider provider = provider((record, key) -> {
            assertEquals("request-key-123", key);
            if (calls.getAndIncrement() == 0)
                return new NotificationDeliveryProvider.DeliveryResult(DeliveryStatus.FAILED, null, "rejected", "temporary provider rejection");
            return new NotificationDeliveryProvider.DeliveryResult(DeliveryStatus.DELIVERED, "provider-2", "delivered", null);
        });
        ParentNotificationService service = service(row, Optional.of(provider), new AtomicInteger());

        var failed = service.deliver(9L);
        assertEquals(DeliveryStatus.FAILED, failed.notification().getDeliveryStatus());
        assertEquals("temporary provider rejection", failed.notification().getFailureReason());
        var retried = service.deliver(9L);

        assertEquals(DeliveryStatus.DELIVERED, retried.notification().getDeliveryStatus());
        assertEquals(LocalDateTime.now(CLOCK), retried.notification().getDeliveredAt());
        assertEquals(2, retried.notification().getAttemptCount());
    }

    @Test
    void createIsIdempotentForSameRequestAndRejectsConflictingReuse() throws Exception {
        AtomicReference<ParentNotification> row = new AtomicReference<>();
        AtomicInteger saves = new AtomicInteger();
        ParentNotificationService service = service(row, Optional.empty(), saves);
        Student student = student();

        ParentNotification first = service.create(student, NotificationType.GENERAL, " Hello ", null, 5L, "request-key-123");
        ParentNotification retry = service.create(student, NotificationType.GENERAL, "Hello", null, 5L, "request-key-123");
        assertSame(first, retry);
        assertEquals(1, saves.get());
        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> service.create(student, NotificationType.GENERAL, "Different body", null, 5L, "request-key-123"))
                .getStatusCode().value());
    }

    private ParentNotificationService service(AtomicReference<ParentNotification> row,
            Optional<NotificationDeliveryProvider> provider, AtomicInteger saves) {
        ParentNotificationRepository repository = proxy(ParentNotificationRepository.class, (proxy, method, args) -> switch (method.getName()) {
            case "findById", "findByIdForUpdate" -> row.get() != null && row.get().getId().equals(args[0]) ? Optional.of(row.get()) : Optional.empty();
            case "findByIdempotencyKey" -> row.get() != null && row.get().getIdempotencyKey().equals(args[0]) ? Optional.of(row.get()) : Optional.empty();
            case "save", "saveAndFlush" -> { row.set((ParentNotification) args[0]); saves.incrementAndGet(); yield args[0]; }
            default -> null;
        });
        NotificationDeliveryAttemptRepository attempts = proxy(NotificationDeliveryAttemptRepository.class,
                (proxy, method, args) -> method.getName().equals("save") ? args[0] : List.of());
        return new ParentNotificationService(repository, attempts, provider, CLOCK);
    }

    private NotificationDeliveryProvider provider(DeliverAction action) {
        return new NotificationDeliveryProvider() {
            @Override public String channel() { return "test"; }
            @Override public DeliveryResult deliver(ParentNotification notification, String key) throws Exception { return action.deliver(notification, key); }
        };
    }

    private ParentNotification notification(Long id, DeliveryStatus status) throws Exception {
        ParentNotification notification = new ParentNotification();
        var idField = ParentNotification.class.getDeclaredField("id"); idField.setAccessible(true); idField.set(notification, id);
        notification.setIdempotencyKey("request-key-123"); notification.setCreatedById(5L);
        notification.setStudentId(3L); notification.setParentName("Guardian"); notification.setParentContact("+251900000000");
        notification.setNotificationType(NotificationType.GENERAL); notification.setContent("Message");
        notification.setBranchId(2L); notification.setDeliveryStatus(status);
        return notification;
    }

    private Student student() throws Exception {
        var constructor = Student.class.getDeclaredConstructor(); constructor.setAccessible(true);
        Student student = constructor.newInstance();
        var id = Student.class.getDeclaredField("id"); id.setAccessible(true); id.set(student, 3L);
        student.setGuardianName("Guardian"); student.setGuardianPhone("+251900000000");
        student.setBranchId(2L); student.setFullName("Student Name");
        return student;
    }

    private interface DeliverAction {
        NotificationDeliveryProvider.DeliveryResult deliver(ParentNotification notification, String key) throws Exception;
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, java.lang.reflect.InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, handler);
    }
}
