package com.haystax.engagement.repository;

import com.haystax.engagement.entity.TenancyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TenancyRepository extends JpaRepository<TenancyEntity, String> {

    List<TenancyEntity> findByStudentIdOrOwnerId(String studentId, String ownerId);

    @Query("SELECT COUNT(t) FROM TenancyEntity t WHERE t.listingId = :listingId AND t.moveInDate = :moveInDate AND t.status IN ('PENDING', 'APPROVED')")
    long countOverlappingBookings(String listingId, LocalDate moveInDate);
}
