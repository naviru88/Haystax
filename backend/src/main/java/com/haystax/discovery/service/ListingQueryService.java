package com.haystax.discovery.service;

import com.haystax.discovery.dto.ListingDto;
import com.haystax.discovery.dto.PageResponseDto;
import com.haystax.discovery.dto.SearchFiltersDto;
import com.haystax.discovery.entity.PublishedListingView;
import com.haystax.discovery.mapper.ListingMapper;
import com.haystax.discovery.repository.ListingReadRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class ListingQueryService {

    private final ListingReadRepository repository;
    private final ListingMapper mapper;

    public ListingQueryService(ListingReadRepository repository, ListingMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    public PageResponseDto<ListingDto> search(SearchFiltersDto filters) {
        List<PublishedListingView> all = repository.findAll();

        List<PublishedListingView> filtered = all.stream()
                .filter(l -> matchesCity(l, filters.city()))
                .filter(l -> matchesMinPrice(l, filters.minPrice()))
                .filter(l -> matchesMaxPrice(l, filters.maxPrice()))
                .filter(l -> matchesGender(l, filters.genderPolicy()))
                .toList();

        List<PublishedListingView> sorted = switch (filters.safeSort()) {
            case "price_asc"  -> filtered.stream()
                    .sorted(Comparator.comparing(PublishedListingView::getPriceAmount,
                            Comparator.nullsLast(Comparator.naturalOrder())))
                    .toList();
            case "price_desc" -> filtered.stream()
                    .sorted(Comparator.comparing(PublishedListingView::getPriceAmount,
                            Comparator.nullsLast(Comparator.reverseOrder())))
                    .toList();
            default -> filtered.stream()
                    .sorted(Comparator
                            .comparing(PublishedListingView::getAvailableSlots,
                                    Comparator.nullsLast(Comparator.reverseOrder()))
                            .thenComparing(PublishedListingView::getPublishedAt,
                                    Comparator.nullsLast(Comparator.reverseOrder())))
                    .toList();
        };

        int page = filters.safePage();
        int pageSize = filters.safePageSize();
        int start = (page - 1) * pageSize;
        int end = Math.min(start + pageSize, sorted.size());

        List<ListingDto> items = (start >= sorted.size())
                ? List.of()
                : sorted.subList(start, end).stream()
                    .map(mapper::toDto)
                    .toList();

        return PageResponseDto.of(items, sorted.size(), page, pageSize);
    }

    public ListingDto getById(UUID id) {
        PublishedListingView entity = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Listing not found"));
        return mapper.toDto(entity);
    }

    private boolean matchesCity(PublishedListingView l, String city) {
        return city == null || city.isBlank()
                || (l.getCity() != null && l.getCity().equalsIgnoreCase(city));
    }

    private boolean matchesMinPrice(PublishedListingView l, BigDecimal min) {
        return min == null
                || (l.getPriceAmount() != null && l.getPriceAmount().compareTo(min) >= 0);
    }

    private boolean matchesMaxPrice(PublishedListingView l, BigDecimal max) {
        return max == null
                || (l.getPriceAmount() != null && l.getPriceAmount().compareTo(max) <= 0);
    }

    private boolean matchesGender(PublishedListingView l, String gender) {
        return gender == null || gender.isBlank()
                || (l.getGenderPolicy() != null && l.getGenderPolicy().equalsIgnoreCase(gender));
    }
}
