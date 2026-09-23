package com.haystax.engagement.controller;

import com.haystax.engagement.dto.ReviewDto;
import com.haystax.engagement.service.ReviewService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/engagement/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    public ResponseEntity<List<ReviewDto>> getReviews(@RequestParam UUID listingId) {
        return ResponseEntity.ok(reviewService.getReviewsForListing(listingId));
    }

    @PostMapping
    public ResponseEntity<ReviewDto> submitReview(@RequestBody ReviewDto reviewDto) {
        ReviewDto created = reviewService.submitReview(reviewDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
