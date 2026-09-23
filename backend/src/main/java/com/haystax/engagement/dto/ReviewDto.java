package com.haystax.engagement.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public class ReviewDto {
    private UUID id;
    private UUID listingId;
    private UUID authorId;
    private UUID tenancyId;
    private Integer rating;
    private String title;
    private String body;
    private String status;
    private OffsetDateTime createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getListingId() { return listingId; }
    public void setListingId(UUID listingId) { this.listingId = listingId; }

    public UUID getAuthorId() { return authorId; }
    public void setAuthorId(UUID authorId) { this.authorId = authorId; }

    public UUID getTenancyId() { return tenancyId; }
    public void setTenancyId(UUID tenancyId) { this.tenancyId = tenancyId; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
