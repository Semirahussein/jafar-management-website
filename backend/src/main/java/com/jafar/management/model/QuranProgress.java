package com.jafar.management.model;

import com.jafar.management.dto.enums.ActivityType;
import com.jafar.management.dto.enums.ProgressStatus;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Column;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.PrePersist;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "quran_progress")
public class QuranProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "student_id")
    private Long studentId;

    @NotNull
    @Column(name = "teacher_id")
    private Long teacherId;

    @NotNull
    @Column(name = "branch_id")
    private Long branchId;

    @NotNull
    private LocalDate date;

    @NotBlank
    @Size(max = 100)
    @Column(name = "surah_name")
    private String surahName;

    @NotNull
    @Positive
    @Column(name = "start_ayah")
    private Integer startAyah;

    @NotNull
    @Positive
    @Column(name = "end_ayah")
    private Integer endAyah;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "activity_type")
    private ActivityType activityType;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "progress_status")
    private ProgressStatus progressStatus;

    @Size(max = 1000)
    private String remarks;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public QuranProgress() {}

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public Long getTeacherId() { return teacherId; }
    public void setTeacherId(Long teacherId) { this.teacherId = teacherId; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getSurahName() { return surahName; }
    public void setSurahName(String surahName) { this.surahName = surahName; }

    public Integer getStartAyah() { return startAyah; }
    public void setStartAyah(Integer startAyah) { this.startAyah = startAyah; }

    public Integer getEndAyah() { return endAyah; }
    public void setEndAyah(Integer endAyah) { this.endAyah = endAyah; }

    public ActivityType getActivityType() { return activityType; }
    public void setActivityType(ActivityType activityType) { this.activityType = activityType; }

    public ProgressStatus getProgressStatus() { return progressStatus; }
    public void setProgressStatus(ProgressStatus progressStatus) { this.progressStatus = progressStatus; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
