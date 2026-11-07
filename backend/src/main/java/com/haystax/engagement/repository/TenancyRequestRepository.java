package com.haystax.engagement.repository;

import com.haystax.engagement.entity.TenancyRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TenancyRequestRepository extends JpaRepository<TenancyRequestEntity, UUID> {
    Optional<TenancyRequestEntity> findByTenantIdAndIdempotencyKey(UUID tenantId, String idempotencyKey);

    List<TenancyRequestEntity> findByTenantIdOrId(UUID tenantId, UUID id);

    @Query("""
        select count(r) from TenancyRequestEntity r
        where r.listingId = :listingId
          and r.status in ('pending', 'confirmed')
          and r.startDate < :endDate
          and r.endDate > :startDate
        """)
    long countOverlapping(UUID listingId, LocalDate startDate, LocalDate endDate);
}
