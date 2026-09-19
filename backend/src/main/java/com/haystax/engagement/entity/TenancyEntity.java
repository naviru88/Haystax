package com.haystax.engagement.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tenancy_requests")
public class TenancyEntity {

    @Id
    private String id;

    @Column(name = "listing_id", nullable = false)
    private String listingId;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(name = "owner_id", nullable = false)
    private String ownerId;

    @Column(name = "move_in_date", nullable = false)
    private LocalDate moveInDate;

    @Column(nullable = false)
    private String status;

    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    private Long version;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getListingId() { return listingId; }
    public void setListingId(String listingId) { this.listingId = listingId; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public LocalDate getMoveInDate() { return moveInDate; }
    public void setMoveInDate(LocalDate moveInDate) { this.moveInDate = moveInDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
