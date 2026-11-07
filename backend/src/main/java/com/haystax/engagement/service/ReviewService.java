package com.haystax.engagement.service;

import com.haystax.engagement.adapter.ListingContractClient;
import com.haystax.engagement.auth.RequestScopedCurrentUser;
import com.haystax.engagement.dto.PageResponse;
import com.haystax.engagement.dto.ReviewDto;
import com.haystax.engagement.entity.ReviewEntity;
import com.haystax.engagement.entity.TenancyEntity;
import com.haystax.engagement.event.EngagementEventBus;
import com.haystax.engagement.event.ReviewCreatedEvent;
import com.haystax.engagement.event.ReviewDeletedEvent;
import com.haystax.engagement.event.ReviewUpdatedEvent;
import com.haystax.engagement.repository.ReviewRepository;
import com.haystax.engagement.repository.TenancyRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final TenancyRepository tenancyRepository;
    private final RequestScopedCurrentUser currentUser;
    private final ListingContractClient listingClient;
    private final EngagementEventBus eventBus;

    public ReviewService(ReviewRepository reviewRepository,
                         TenancyRepository tenancyRepository,
                         RequestScopedCurrentUser currentUser,
                         ListingContractClient listingClient,
                         EngagementEventBus eventBus) {
        this.reviewRepository = reviewRepository;
        this.tenancyRepository = tenancyRepository;
        this.currentUser = currentUser;
        this.listingClient = listingClient;
        this.eventBus = eventBus;
    }

    public List<ReviewDto> getReviewsForListing(UUID listingId) {
        return reviewRepository.findByListingIdAndStatus(listingId, "published").stream()
                .map(this::mapToDto)
                .toList();
    }

    public PageResponse<ReviewDto> getReviewsForListingPaged(UUID listingId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ReviewEntity> entityPage = reviewRepository.findByListingIdAndStatus(listingId, "published", pageable);

        List<ReviewDto> dtos = entityPage.getContent().stream()
                .map(this::mapToDto)
                .toList();

        PageResponse.PageMetadata metadata = new PageResponse.PageMetadata(
                entityPage.getNumber(),
                entityPage.getSize(),
                entityPage.getTotalElements(),
                entityPage.getTotalPages()
        );

        return new PageResponse<>(dtos, metadata);
    }

    @Transactional
    public ReviewDto submitReview(ReviewDto dto) {
        if (dto.getRating() == null || dto.getRating() < 1 || dto.getRating() > 5) {
            throw new IllegalArgumentException("Rating score must be between 1 and 5.");
        }
        if (dto.getBody() == null || dto.getBody().trim().isEmpty()) {
            throw new IllegalArgumentException("Review body cannot be empty.");
        }
        if (dto.getTenancyId() == null) {
            throw new IllegalArgumentException("tenancyId is required to submit a review.");
        }

        UUID authorId = currentUser.getId();

        // Check if author has a valid confirmed/active tenancy for this listing
        TenancyEntity tenancy = tenancyRepository.findById(dto.getTenancyId())
                .orElseThrow(() -> new IllegalArgumentException("Tenancy record not found: " + dto.getTenancyId()));

        if (!tenancy.getTenantId().equals(authorId)) {
            throw new SecurityException("Only the tenant of this tenancy can submit a review.");
        }
        if (!tenancy.getListingId().equals(dto.getListingId())) {
            throw new IllegalArgumentException("Tenancy does not match the provided listing.");
        }

        // Prevent duplicate review for the same tenancy
        Optional<ReviewEntity> existing = reviewRepository.findByAuthorIdAndTenancyId(authorId, dto.getTenancyId());
        if (existing.isPresent()) {
            throw new IllegalStateException("A review for this tenancy already exists.");
        }

        ReviewEntity entity = new ReviewEntity();
        entity.setId(dto.getId() != null ? dto.getId() : UUID.randomUUID());
        entity.setListingId(dto.getListingId());
        entity.setAuthorId(authorId);
        entity.setTenancyId(dto.getTenancyId());
        entity.setRating(dto.getRating());
        entity.setTitle(dto.getTitle());
        entity.setBody(dto.getBody());
        entity.setStatus("published");
        entity.setCreatedAt(OffsetDateTime.now());
        entity.setUpdatedAt(OffsetDateTime.now());

        ReviewEntity saved = reviewRepository.save(entity);

        eventBus.publish(new ReviewCreatedEvent(
                UUID.randomUUID(),
                1,
                OffsetDateTime.now(),
                saved.getId(),
                authorId,
                mapToDto(saved)
        ));

        return mapToDto(saved);
    }

    @Transactional
    public ReviewDto updateReview(UUID reviewId, ReviewDto update) {
        ReviewEntity entity = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found: " + reviewId));

        if (!entity.getAuthorId().equals(currentUser.getId()) && !"ADMIN".equals(currentUser.getRole())) {
            throw new SecurityException("You can only update your own review.");
        }

        if (update.getRating() != null) {
            if (update.getRating() < 1 || update.getRating() > 5) {
                throw new IllegalArgumentException("Rating score must be between 1 and 5.");
            }
            entity.setRating(update.getRating());
        }
        if (update.getTitle() != null) {
            entity.setTitle(update.getTitle());
        }
        if (update.getBody() != null) {
            if (update.getBody().trim().isEmpty()) {
                throw new IllegalArgumentException("Review body cannot be empty.");
            }
            entity.setBody(update.getBody());
        }
        entity.setUpdatedAt(OffsetDateTime.now());

        ReviewEntity saved = reviewRepository.save(entity);

        eventBus.publish(new ReviewUpdatedEvent(
                UUID.randomUUID(),
                1,
                OffsetDateTime.now(),
                saved.getId(),
                currentUser.getId(),
                mapToDto(saved)
        ));

        return mapToDto(saved);
    }

    @Transactional
    public void deleteReview(UUID reviewId) {
        ReviewEntity entity = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found: " + reviewId));

        if (!entity.getAuthorId().equals(currentUser.getId()) && !"ADMIN".equals(currentUser.getRole())) {
            throw new SecurityException("You can only delete your own review.");
        }

        entity.setStatus("removed");
        entity.setUpdatedAt(OffsetDateTime.now());
        reviewRepository.save(entity);

        eventBus.publish(new ReviewDeletedEvent(
                UUID.randomUUID(),
                1,
                OffsetDateTime.now(),
                reviewId,
                currentUser.getId(),
                reviewId
        ));
    }

    @Transactional
    public ReviewDto respondToReview(UUID reviewId, String responseBody) {
        if (responseBody == null || responseBody.trim().isEmpty()) {
            throw new IllegalArgumentException("Response body cannot be empty.");
        }

        ReviewEntity entity = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found: " + reviewId));

        UUID ownerId = listingClient.getListingOwner(entity.getListingId()).ownerId();
        if (!ownerId.equals(currentUser.getId()) && !"ADMIN".equals(currentUser.getRole())) {
            throw new SecurityException("Only the listing owner can respond to this review.");
        }

        entity.setOwnerResponse(responseBody);
        entity.setUpdatedAt(OffsetDateTime.now());

        ReviewEntity saved = reviewRepository.save(entity);

        eventBus.publish(new ReviewUpdatedEvent(
                UUID.randomUUID(),
                1,
                OffsetDateTime.now(),
                saved.getId(),
                currentUser.getId(),
                mapToDto(saved)
        ));

        return mapToDto(saved);
    }

    private ReviewDto mapToDto(ReviewEntity entity) {
        ReviewDto dto = new ReviewDto();
        dto.setId(entity.getId());
        dto.setListingId(entity.getListingId());
        dto.setAuthorId(entity.getAuthorId());
        dto.setTenancyId(entity.getTenancyId());
        dto.setRating(entity.getRating());
        dto.setTitle(entity.getTitle());
        dto.setBody(entity.getBody());
        dto.setStatus(entity.getStatus());
        dto.setOwnerResponse(entity.getOwnerResponse());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}
