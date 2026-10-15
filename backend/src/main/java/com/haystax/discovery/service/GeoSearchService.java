package com.haystax.discovery.service;

import com.haystax.discovery.dto.ListingDto;
import com.haystax.discovery.dto.SearchFiltersDto;
import com.haystax.discovery.entity.PublishedListingView;
import com.haystax.discovery.mapper.ListingMapper;
import com.haystax.discovery.repository.ListingReadRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class GeoSearchService {

    private final ListingReadRepository repository;
    private final ListingMapper mapper;

    public GeoSearchService(ListingReadRepository repository, ListingMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    //Returns listings within radiusKm of (lat, lng), sorted by distance.
    public List<ListingDto> near(double lat, double lng, double radiusKm,
                                 SearchFiltersDto filters) {
        double radiusMeters = radiusKm * 1000.0;

        List<UUID> ids = repository.findIdsWithinRadius(lat, lng, radiusMeters);
        if (ids.isEmpty()) return List.of();

        Map<UUID, PublishedListingView> byId = repository.findAllById(ids).stream()
                .collect(Collectors.toMap(PublishedListingView::getId, Function.identity()));

        return ids.stream()
                .map(byId::get)
                .filter(l -> l != null)
                .filter(l -> matchesCity(l, filters.city()))
                .filter(l -> matchesGender(l, filters.genderPolicy()))
                .map(l -> {
                    Double distance = repository.distanceKmFrom(l.getId(), lat, lng);
                    return mapper.toDto(l, distance);
                })
                .toList();
    }

    private boolean matchesCity(PublishedListingView l, String city) {
        return city == null || city.isBlank()
                || (l.getCity() != null && l.getCity().equalsIgnoreCase(city));
    }

    private boolean matchesGender(PublishedListingView l, String gender) {
        return gender == null || gender.isBlank()
                || (l.getGenderPolicy() != null && l.getGenderPolicy().equalsIgnoreCase(gender));
    }
}
