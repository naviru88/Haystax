package com.haystax.engagement.repository;

import com.haystax.engagement.entity.ReviewEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<ReviewEntity, UUID> {

    List<ReviewEntity> findByListingIdAndStatus(UUID listingId, String status);

    Page<ReviewEntity> findByListingIdAndStatus(UUID listingId, String status, Pageable pageable);

    Optional<ReviewEntity> findByAuthorIdAndTenancyId(UUID authorId, UUID tenancyId);

    long countByListingId(UUID listingId);

    @Query("SELECT AVG(r.rating) FROM ReviewEntity r WHERE r.listingId = :listingId AND r.status = 'published'")
    Double findAverageRatingByListingId(UUID listingId);
}
