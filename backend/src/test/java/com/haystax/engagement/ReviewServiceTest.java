package com.haystax.engagement;

import com.haystax.engagement.adapter.ListingContractClient;
import com.haystax.engagement.auth.RequestScopedCurrentUser;
import com.haystax.engagement.dto.PageResponse;
import com.haystax.engagement.dto.ReviewDto;
import com.haystax.engagement.entity.ReviewEntity;
import com.haystax.engagement.entity.TenancyEntity;
import com.haystax.engagement.event.EngagementEventBus;
import com.haystax.engagement.repository.ReviewRepository;
import com.haystax.engagement.repository.TenancyRepository;
import com.haystax.engagement.service.ReviewService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ReviewServiceTest {

    private static final UUID AUTHOR_ID = UUID.randomUUID();
    private static final UUID OWNER_ID = UUID.randomUUID();
    private static final UUID LISTING_ID = UUID.randomUUID();
    private static final UUID TENANCY_ID = UUID.randomUUID();

    private ReviewRepository reviewRepository;
    private TenancyRepository tenancyRepository;
    private RequestScopedCurrentUser currentUser;
    private ListingContractClient listingClient;
    private EngagementEventBus eventBus;
    private ReviewService service;

    @BeforeEach
    void setUp() {
        reviewRepository = mock(ReviewRepository.class);
        tenancyRepository = mock(TenancyRepository.class);
        currentUser = new RequestScopedCurrentUser();
        listingClient = mock(ListingContractClient.class);
        eventBus = mock(EngagementEventBus.class);

        when(listingClient.getListingOwner(LISTING_ID))
                .thenReturn(new ListingContractClient.ListingOwner(LISTING_ID, OWNER_ID));

        service = new ReviewService(reviewRepository, tenancyRepository, currentUser, listingClient, eventBus);
    }

    @Test
    void submitReviewSuccessfully() {
        currentUser.set(AUTHOR_ID, "TENANT");

        TenancyEntity tenancy = new TenancyEntity();
        tenancy.setId(TENANCY_ID);
        tenancy.setListingId(LISTING_ID);
        tenancy.setTenantId(AUTHOR_ID);
        when(tenancyRepository.findById(TENANCY_ID)).thenReturn(Optional.of(tenancy));
        when(reviewRepository.findByAuthorIdAndTenancyId(AUTHOR_ID, TENANCY_ID)).thenReturn(Optional.empty());
        when(reviewRepository.save(any(ReviewEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        ReviewDto input = new ReviewDto();
        input.setListingId(LISTING_ID);
        input.setTenancyId(TENANCY_ID);
        input.setRating(5);
        input.setTitle("Great stay");
        input.setBody("Clean and quiet");

        ReviewDto result = service.submitReview(input);

        assertNotNull(result);
        assertEquals(5, result.getRating());
        assertEquals("Clean and quiet", result.getBody());
        assertEquals("published", result.getStatus());
        verify(eventBus).publish(any());
    }

    @Test
    void rejectsInvalidRating() {
        currentUser.set(AUTHOR_ID, "TENANT");

        ReviewDto input = new ReviewDto();
        input.setListingId(LISTING_ID);
        input.setTenancyId(TENANCY_ID);
        input.setRating(6);
        input.setBody("Too high");

        assertThrows(IllegalArgumentException.class, () -> service.submitReview(input));
    }

    @Test
    void rejectsEmptyBody() {
        currentUser.set(AUTHOR_ID, "TENANT");

        ReviewDto input = new ReviewDto();
        input.setListingId(LISTING_ID);
        input.setTenancyId(TENANCY_ID);
        input.setRating(4);
        input.setBody("   ");

        assertThrows(IllegalArgumentException.class, () -> service.submitReview(input));
    }

    @Test
    void forbidsNonTenantFromSubmittingReview() {
        currentUser.set(UUID.randomUUID(), "TENANT");

        TenancyEntity tenancy = new TenancyEntity();
        tenancy.setId(TENANCY_ID);
        tenancy.setListingId(LISTING_ID);
        tenancy.setTenantId(AUTHOR_ID);
        when(tenancyRepository.findById(TENANCY_ID)).thenReturn(Optional.of(tenancy));

        ReviewDto input = new ReviewDto();
        input.setListingId(LISTING_ID);
        input.setTenancyId(TENANCY_ID);
        input.setRating(4);
        input.setBody("Nice");

        assertThrows(SecurityException.class, () -> service.submitReview(input));
    }

    @Test
    void ownerCanRespondToReview() {
        currentUser.set(OWNER_ID, "OWNER");

        ReviewEntity review = new ReviewEntity();
        review.setId(UUID.randomUUID());
        review.setListingId(LISTING_ID);
        review.setAuthorId(AUTHOR_ID);
        review.setStatus("published");
        when(reviewRepository.findById(review.getId())).thenReturn(Optional.of(review));
        when(reviewRepository.save(any(ReviewEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        ReviewDto result = service.respondToReview(review.getId(), "Thank you for the review!");

        assertEquals("Thank you for the review!", result.getOwnerResponse());
        verify(eventBus).publish(any());
    }

    @Test
    void getReviewsPagedReturnsPageResponse() {
        ReviewEntity review = new ReviewEntity();
        review.setId(UUID.randomUUID());
        review.setListingId(LISTING_ID);
        review.setAuthorId(AUTHOR_ID);
        review.setRating(4);
        review.setBody("Good place");
        review.setStatus("published");
        review.setCreatedAt(OffsetDateTime.now());

        when(reviewRepository.findByListingIdAndStatus(eq(LISTING_ID), eq("published"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(review)));

        PageResponse<ReviewDto> response = service.getReviewsForListingPaged(LISTING_ID, 0, 10);

        assertNotNull(response);
        assertEquals(1, response.content().size());
        assertEquals(1, response.page().totalElements());
    }
}
