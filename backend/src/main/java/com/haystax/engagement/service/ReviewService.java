package com.haystax.engagement.service;

import com.haystax.engagement.dto.ReviewDto;
import com.haystax.engagement.entity.ReviewEntity;
import com.haystax.engagement.repository.ReviewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;

    public ReviewService(ReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    public List<ReviewDto> getReviewsForListing(UUID listingId) {
        return reviewRepository.findByListingIdAndStatus(listingId, "published").stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional
    public ReviewDto submitReview(ReviewDto dto) {
        if (dto.getRating() < 1 || dto.getRating() > 5) {
            throw new IllegalArgumentException("Rating score must be between 1 and 5.");
        }

        ReviewEntity entity = new ReviewEntity();
        entity.setId(dto.getId() != null ? dto.getId() : UUID.randomUUID());
        entity.setListingId(dto.getListingId());
        entity.setAuthorId(dto.getAuthorId());
        entity.setTenancyId(dto.getTenancyId());
        entity.setRating(dto.getRating());
        entity.setTitle(dto.getTitle());
        entity.setBody(dto.getBody());
        entity.setStatus("published");
        entity.setCreatedAt(OffsetDateTime.now());
        entity.setUpdatedAt(OffsetDateTime.now());

        ReviewEntity saved = reviewRepository.save(entity);
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
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }
}
