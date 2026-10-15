package com.haystax.admin.repository;

import com.haystax.admin.entity.AdminModerationSummaryView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminModerationSummaryRepository
        extends JpaRepository<AdminModerationSummaryView, Integer> {
}
