package com.jafar.management.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "students")
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank @Size(max = 150)
    @Column(nullable = false, length = 150)
    private String fullName;

    @NotBlank @Size(max = 50)
    @Column(nullable = false, unique = true, length = 50)
    private String studentNumber;

    @Size(max = 20) @Column(length = 20)
    private String gender;
    private LocalDate dateOfBirth;
    @Size(max = 150) @Column(length = 150)
    private String guardianName;
    @Size(max = 30) @Column(length = 30)
    private String guardianPhone;

    @NotNull @Column(nullable = false)
    private Long branchId;
    private Long teacherId;

    @NotNull @PastOrPresent @Column(nullable = false)
    private LocalDate enrollmentDate;
    @Size(max = 80) @Column(length = 80)
    private String currentLevel;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Student() {}

    @PrePersist
    void setCreatedAt() { createdAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public String getFullName() { return fullName; }
    public void setFullName(String value) { fullName = value; }
    public String getStudentNumber() { return studentNumber; }
    public void setStudentNumber(String value) { studentNumber = value; }
    public String getGender() { return gender; }
    public void setGender(String value) { gender = value; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate value) { dateOfBirth = value; }
    public String getGuardianName() { return guardianName; }
    public void setGuardianName(String value) { guardianName = value; }
    public String getGuardianPhone() { return guardianPhone; }
    public void setGuardianPhone(String value) { guardianPhone = value; }
    public Long getBranchId() { return branchId; }
    public void setBranchId(Long value) { branchId = value; }
    public Long getTeacherId() { return teacherId; }
    public void setTeacherId(Long value) { teacherId = value; }
    public LocalDate getEnrollmentDate() { return enrollmentDate; }
    public void setEnrollmentDate(LocalDate value) { enrollmentDate = value; }
    public String getCurrentLevel() { return currentLevel; }
    public void setCurrentLevel(String value) { currentLevel = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
