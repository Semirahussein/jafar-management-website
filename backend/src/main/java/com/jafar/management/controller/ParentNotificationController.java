package com.jafar.management.controller;

import com.jafar.management.dto.enums.DeliveryStatus;
import com.jafar.management.dto.enums.NotificationType;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.ParentNotification;
import com.jafar.management.model.Student;
import com.jafar.management.repository.ParentNotificationRepository;
import com.jafar.management.repository.StudentRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class ParentNotificationController {

    private final ParentNotificationRepository notificationRepository;
    private final StudentRepository studentRepository;

    public ParentNotificationController(ParentNotificationRepository notificationRepository, StudentRepository studentRepository) {
        this.notificationRepository = notificationRepository;
        this.studentRepository = studentRepository;
    }

    public record CreateNotificationRequest(Long studentId, NotificationType notificationType, String content, Long relatedProgressId) {}

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public List<ParentNotification> listNotifications(@AuthenticationPrincipal AppUser user) {
        if (user.getRole() == UserRole.ADMINISTRATOR) {
            return notificationRepository.findAll();
        } else if (user.getRole() == UserRole.BRANCH_MANAGER) {
            return notificationRepository.findAllByBranchId(user.getBranchId());
        } else {
            // Only notifications for students assigned to the teacher
            List<Student> students = studentRepository.findAllByTeacherId(user.getId());
            return students.stream()
                    .flatMap(s -> notificationRepository.findAllByStudentId(s.getId()).stream())
                    .toList();
        }
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public List<ParentNotification> getStudentNotifications(@PathVariable Long studentId, @AuthenticationPrincipal AppUser user) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (user.getRole() == UserRole.QURAN_TEACHER && !student.getTeacherId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (user.getRole() == UserRole.BRANCH_MANAGER && !student.getBranchId().equals(user.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        
        return notificationRepository.findAllByStudentIdOrderByCreatedAtDesc(studentId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public ParentNotification getNotification(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        ParentNotification notif = notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (user.getRole() != UserRole.ADMINISTRATOR && !notif.getBranchId().equals(user.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return notif;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('BRANCH_MANAGER', 'QURAN_TEACHER')")
    public ParentNotification createNotification(@RequestBody @Valid CreateNotificationRequest request, @AuthenticationPrincipal AppUser user) {
        Student student = studentRepository.findById(request.studentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (user.getRole() == UserRole.QURAN_TEACHER && !student.getTeacherId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (user.getRole() == UserRole.BRANCH_MANAGER && !student.getBranchId().equals(user.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        ParentNotification notif = new ParentNotification();
        notif.setStudentId(student.getId());
        notif.setParentName(student.getGuardianName());
        notif.setParentContact(student.getGuardianPhone());
        notif.setNotificationType(request.notificationType());
        notif.setContent(request.content());
        notif.setRelatedProgressId(request.relatedProgressId());
        notif.setBranchId(student.getBranchId());
        notif.setDeliveryStatus(DeliveryStatus.PENDING);
        
        return notificationRepository.save(notif);
    }

    @PutMapping("/{id}/send")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public ParentNotification sendNotification(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        ParentNotification notif = notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        
        if (user.getRole() == UserRole.BRANCH_MANAGER && !notif.getBranchId().equals(user.getBranchId())) {
             throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        notif.setDeliveryStatus(DeliveryStatus.SENT);
        notif.setSentAt(LocalDateTime.now());
        return notificationRepository.save(notif);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public void deleteNotification(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        ParentNotification notif = notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (user.getRole() == UserRole.BRANCH_MANAGER && !notif.getBranchId().equals(user.getBranchId())) {
             throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (notif.getDeliveryStatus() != DeliveryStatus.PENDING) {
             throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PENDING notifications can be deleted");
        }

        notificationRepository.delete(notif);
    }
}
