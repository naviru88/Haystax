package com.haystax.discovery.controller;

import com.haystax.discovery.dto.ListingDto;
import com.haystax.discovery.dto.PageResponseDto;
import com.haystax.discovery.dto.SearchFiltersDto;
import com.haystax.discovery.service.GeoSearchService;
import com.haystax.discovery.service.ListingQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/discovery/listings")
public class ListingQueryController {

    private final ListingQueryService queryService;
    private final GeoSearchService geoSearchService;

    public ListingQueryController(ListingQueryService queryService,
                                  GeoSearchService geoSearchService) {
        this.queryService = queryService;
        this.geoSearchService = geoSearchService;
    }

    @GetMapping
    public PageResponseDto<ListingDto> list(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String genderPolicy,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        SearchFiltersDto filters = new SearchFiltersDto(
                city, minPrice, maxPrice, genderPolicy, sort, page, pageSize);
        return queryService.search(filters);
    }

    @GetMapping("/near")
    public List<ListingDto> near(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "5") double radiusKm,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String genderPolicy) {
        SearchFiltersDto filters = new SearchFiltersDto(
                city, null, null, genderPolicy, "relevance", 1, 100);
        return geoSearchService.near(lat, lng, radiusKm, filters);
    }

    @GetMapping("/{id}")
    public ListingDto getById(@PathVariable UUID id) {
        return queryService.getById(id);
    }
}
