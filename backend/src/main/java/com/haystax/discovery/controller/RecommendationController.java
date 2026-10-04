package com.haystax.discovery.controller;

import com.haystax.discovery.dto.ListingDto;
import com.haystax.discovery.service.RecommendationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/discovery/recommendations")
public class RecommendationController {

    private final RecommendationService recommendationService;

    public RecommendationController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @GetMapping
    public List<ListingDto> recommend(@RequestParam(defaultValue = "12") int limit) {
        return recommendationService.recommend(limit);
    }
}
