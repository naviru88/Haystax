package com.haystax.owner.repository;

import com.haystax.owner.entity.ListingPhotoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Week 1 (C2) skeleton — read access to {@code public.listing_photos}.
 * <p>
 * Week 2+: photo insert/delete for {@code /api/owner/listings/{id}/photos} and
 * {@code /api/owner/listings/{id}/photos/{photoId}}, and the one-primary-photo
 * per-listing partial unique index.
 */
@Repository
public interface ListingPhotoRepository extends JpaRepository<ListingPhotoEntity, UUID> {
}