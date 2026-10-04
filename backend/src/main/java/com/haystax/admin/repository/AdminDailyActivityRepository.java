package com.haystax.admin.repository;

import com.haystax.admin.entity.AdminDailyActivityView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AdminDailyActivityRepository
        extends JpaRepository<AdminDailyActivityView, LocalDate> {

    List<AdminDailyActivityView> findAllByOrderByDayDesc();
}
