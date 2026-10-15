package com.haystax.owner.repository;

import com.haystax.owner.entity.BoardingListingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Week 1 (C2) skeleton — read/write access to {@code public.boarding_listings}.
 * <p>
 * Week 2+ adds ownership-scoped queries ({@code owner_id = :id}) and status
 * transitions. The PostGIS {@code location} column is deliberately NOT mapped in
 * Week 1 (AGENTS.md C2: no hibernate-spatial/PostGIS mapping without asking) —
 * see {@code x-todo} in docs/m2-db-notes.md gap #7.
 */
@Repository
public interface ListingWriteRepository extends JpaRepository<BoardingListingEntity, UUID> {
}