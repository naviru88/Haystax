package com.haystax.engagement.repository;

import com.haystax.engagement.entity.TenancyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface TenancyRepository extends JpaRepository<TenancyEntity, UUID> {

    List<TenancyEntity> findByTenantIdOrOwnerId(UUID tenantId, UUID ownerId);

    @Query("SELECT COUNT(t) FROM TenancyEntity t WHERE t.listingId = :listingId AND t.startDate <= :moveInDate AND (t.endDate IS NULL OR t.endDate >= :moveInDate) AND t.status = 'active'")
    long countOverlappingBookings(UUID listingId, LocalDate moveInDate);
}
