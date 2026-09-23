package com.haystax.engagement.repository;

import com.haystax.engagement.entity.ReviewEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<ReviewEntity, UUID> {

    List<ReviewEntity> findByListingIdAndStatus(UUID listingId, String status);

    @Query("SELECT AVG(r.rating) FROM ReviewEntity r WHERE r.listingId = :listingId AND r.status = 'published'")
    Double findAverageRatingByListingId(UUID listingId);
}
