package com.haystax.engagement.repository;

import com.haystax.engagement.entity.AnalyticsSummaryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AnalyticsSummaryRepository extends JpaRepository<AnalyticsSummaryEntity, UUID> {

    Optional<AnalyticsSummaryEntity> findByListingIdAndPeriodStartAndPeriodEnd(
            UUID listingId, LocalDate periodStart, LocalDate periodEnd);
}

