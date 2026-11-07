package com.haystax.engagement.controller;

import com.haystax.engagement.dto.PageResponse;
import com.haystax.engagement.dto.ReviewDto;
import com.haystax.engagement.service.ReviewService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/engagement/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<ReviewDto>> getReviews(
            @RequestParam UUID listingId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(reviewService.getReviewsForListingPaged(listingId, page, size));
    }

    @PostMapping
    public ResponseEntity<ReviewDto> submitReview(@RequestBody ReviewDto reviewDto) {
        ReviewDto created = reviewService.submitReview(reviewDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{reviewId}")
    public ResponseEntity<ReviewDto> updateReview(
            @PathVariable UUID reviewId,
            @RequestBody ReviewDto updateDto) {
        return ResponseEntity.ok(reviewService.updateReview(reviewId, updateDto));
    }

    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Void> deleteReview(@PathVariable UUID reviewId) {
        reviewService.deleteReview(reviewId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{reviewId}/response")
    public ResponseEntity<ReviewDto> respondToReview(
            @PathVariable UUID reviewId,
            @RequestBody Map<String, String> body) {
        String responseText = body.get("body");
        return ResponseEntity.ok(reviewService.respondToReview(reviewId, responseText));
    }
}
