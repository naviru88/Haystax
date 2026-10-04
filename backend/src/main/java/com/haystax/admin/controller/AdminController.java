package com.haystax.admin.controller;

import com.haystax.admin.dto.AdminStatsDto;
import com.haystax.admin.dto.DailyActivityDto;
import com.haystax.admin.service.AdminAnalyticsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

//Admin-only read endpoints.
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminAnalyticsService analyticsService;

    public AdminController(AdminAnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/stats")
    public AdminStatsDto stats() {
        return analyticsService.getStats();
    }

    @GetMapping("/activity")
    public List<DailyActivityDto> activity(
            @RequestParam(value = "days", defaultValue = "30") int days) {
        return analyticsService.getActivity(days);
    }
}
