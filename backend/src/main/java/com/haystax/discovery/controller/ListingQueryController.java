package com.haystax.discovery.controller;

import com.haystax.discovery.dto.ListingDto;
import com.haystax.discovery.dto.PageResponseDto;
import com.haystax.discovery.dto.SearchFiltersDto;
import com.haystax.discovery.service.GeoSearchService;
import com.haystax.discovery.service.ListingQueryService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

    //Server-side proxy to ipapi.co for IP-based geolocation.
    @GetMapping("/geo/ip-locate")
    public Map<String, Object> ipLocate(HttpServletRequest request) {
        try {
            RestTemplate rt = new RestTemplate();
            @SuppressWarnings("unchecked")
            Map<String, Object> ipapi = rt.getForObject(
                    "https://ipapi.co/json/", Map.class);

            if (ipapi == null || !ipapi.containsKey("latitude")) {
                throw new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Geolocation service unavailable");
            }

            Map<String, Object> out = new HashMap<>();
            out.put("lat", ipapi.get("latitude"));
            out.put("lng", ipapi.get("longitude"));
            out.put("city", ipapi.get("city"));
            out.put("region", ipapi.get("region"));
            out.put("country", ipapi.get("country_name"));
            return out;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Could not determine location: " + e.getMessage());
        }
    }
}
