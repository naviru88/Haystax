package com.haystax.engagement.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "boarding_reviews")
public class ReviewEntity {

    @Id
    private String id;

    @Column(name = "listing_id", nullable = false)
    private String listingId;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(nullable = false)
    private Integer rating;

    private String comment;

    @Column(name = "owner_response")
    private String ownerResponse;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getListingId() { return listingId; }
    public void setListingId(String listingId) { this.listingId = listingId; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getOwnerResponse() { return ownerResponse; }
    public void setOwnerResponse(String ownerResponse) { this.ownerResponse = ownerResponse; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
