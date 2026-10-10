package com.haystax.discovery.service;

import com.haystax.discovery.dto.ListingDto;
import com.haystax.discovery.dto.PageResponseDto;
import com.haystax.discovery.dto.SearchFiltersDto;
import com.haystax.discovery.entity.PublishedListingView;
import com.haystax.discovery.mapper.ListingMapper;
import com.haystax.discovery.repository.ListingReadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class ListingQueryServiceTest {

    @Mock
    private ListingReadRepository repository;

    @Mock
    private ListingMapper mapper;

    @InjectMocks
    private ListingQueryService service;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        // Default stub: mapper returns a real DTO rather than a mock, so we can assert on the objects the service returns.
        when(mapper.toDto(any(PublishedListingView.class))).thenAnswer(inv -> {
            PublishedListingView e = inv.getArgument(0);
            return new ListingDto(
                    e.getId(), e.getTitle(), e.getDescription(),
                    e.getCity(), e.getDistrict(), e.getLocationLabel(),
                    e.getLatitude(), e.getLongitude(),
                    e.getPriceAmount(), e.getCurrencyCode(),
                    e.getGenderPolicy(), e.getTotalSlots(), e.getAvailableSlots(),
                    e.getStatus(), e.getOwnerDisplayName(),
                    List.of(), List.of(), List.of(),
                    null, null);
        });
    }

    //helpers

    private PublishedListingView listing(String city, BigDecimal price, String gender,
                                          int available, Instant publishedAt) {
        PublishedListingView l = new PublishedListingView();
        l.setId(UUID.randomUUID());
        // Helper sets title = city + "-" + price.intValue() so
        // sorting by title is predictable. See search_sortTitleAscCaseInsensitive.
        l.setTitle(city + "-" + price.intValue());
        l.setCity(city);
        l.setPriceAmount(price);
        l.setCurrencyCode("LKR");
        l.setGenderPolicy(gender);
        l.setTotalSlots(5);
        l.setAvailableSlots(available);
        l.setPublishedAt(publishedAt);
        return l;
    }

    private SearchFiltersDto filters(String city, BigDecimal min, BigDecimal max,
                                     String gender, String sort,
                                     Integer page, Integer pageSize) {
        return new SearchFiltersDto(city, min, max, gender, sort, page, pageSize);
    }

    // city filter

    @Test
    public void search_filtersByCityCaseInsensitive() {
        PublishedListingView colombo = listing("Colombo", BigDecimal.valueOf(100), "any", 3, Instant.now());
        PublishedListingView kandy   = listing("Kandy",   BigDecimal.valueOf(100), "any", 3, Instant.now());

        when(repository.findAll()).thenReturn(List.of(colombo, kandy));

        PageResponseDto<ListingDto> result = service.search(
                filters("colombo", null, null, null, null, 1, 12));

        assertEquals(1, result.items().size());
        assertEquals("Colombo", result.items().get(0).city());
    }

    @Test
    public void search_blankCityReturnsAll() {
        PublishedListingView a = listing("Colombo", BigDecimal.TEN, "any", 3, Instant.now());
        PublishedListingView b = listing("Kandy",   BigDecimal.TEN, "any", 3, Instant.now());

        when(repository.findAll()).thenReturn(List.of(a, b));

        PageResponseDto<ListingDto> result = service.search(
                filters("  ", null, null, null, null, 1, 12));

        assertEquals(2, result.items().size());
    }

    // price filters

    @Test
    public void search_filtersByMinPriceInclusive() {
        PublishedListingView cheap = listing("Colombo", BigDecimal.valueOf(50),  "any", 3, Instant.now());
        PublishedListingView exact = listing("Colombo", BigDecimal.valueOf(100), "any", 3, Instant.now());
        PublishedListingView pricey = listing("Colombo", BigDecimal.valueOf(200), "any", 3, Instant.now());

        when(repository.findAll()).thenReturn(List.of(cheap, exact, pricey));

        PageResponseDto<ListingDto> result = service.search(
                filters(null, BigDecimal.valueOf(100), null, null, null, 1, 12));

        assertEquals(2, result.items().size(), "min is inclusive → 100 and 200");
    }

    @Test
    public void search_filtersByMaxPriceInclusive() {
        PublishedListingView cheap = listing("Colombo", BigDecimal.valueOf(50),  "any", 3, Instant.now());
        PublishedListingView exact = listing("Colombo", BigDecimal.valueOf(100), "any", 3, Instant.now());
        PublishedListingView pricey = listing("Colombo", BigDecimal.valueOf(200), "any", 3, Instant.now());

        when(repository.findAll()).thenReturn(List.of(cheap, exact, pricey));

        PageResponseDto<ListingDto> result = service.search(
                filters(null, null, BigDecimal.valueOf(100), null, null, 1, 12));

        assertEquals(2, result.items().size(), "max is inclusive → 50 and 100");
    }

    //gender filter

    @Test
    public void search_filtersByGenderPolicyCaseInsensitive() {
        PublishedListingView female = listing("Colombo", BigDecimal.TEN, "female_only", 3, Instant.now());
        PublishedListingView male   = listing("Colombo", BigDecimal.TEN, "male_only",   3, Instant.now());
        PublishedListingView any    = listing("Colombo", BigDecimal.TEN, "any",         3, Instant.now());

        when(repository.findAll()).thenReturn(List.of(female, male, any));

        PageResponseDto<ListingDto> result = service.search(
                filters(null, null, null, "FEMALE_ONLY", null, 1, 12));

        assertEquals(1, result.items().size());
        assertEquals("female_only", result.items().get(0).genderPolicy());
    }

    // combined filters

    @Test
    public void search_combinesCityAndPriceAndGender() {
        PublishedListingView match = listing("Colombo", BigDecimal.valueOf(150), "female_only", 3, Instant.now());
        PublishedListingView wrongCity   = listing("Kandy",   BigDecimal.valueOf(150), "female_only", 3, Instant.now());
        PublishedListingView wrongPrice  = listing("Colombo", BigDecimal.valueOf(500), "female_only", 3, Instant.now());
        PublishedListingView wrongGender = listing("Colombo", BigDecimal.valueOf(150), "male_only",   3, Instant.now());

        when(repository.findAll()).thenReturn(List.of(match, wrongCity, wrongPrice, wrongGender));

        PageResponseDto<ListingDto> result = service.search(
                filters("Colombo", BigDecimal.valueOf(100), BigDecimal.valueOf(200),
                        "female_only", null, 1, 12));

        assertEquals(1, result.items().size());
        assertEquals("Colombo", result.items().get(0).city());
    }

    //sorting

    @Test
    public void search_sortPriceAsc() {
        PublishedListingView a = listing("Colombo", BigDecimal.valueOf(300), "any", 3, Instant.now());
        PublishedListingView b = listing("Colombo", BigDecimal.valueOf(100), "any", 3, Instant.now());
        PublishedListingView c = listing("Colombo", BigDecimal.valueOf(200), "any", 3, Instant.now());

        when(repository.findAll()).thenReturn(List.of(a, b, c));

        PageResponseDto<ListingDto> result = service.search(
                filters(null, null, null, null, "price_asc", 1, 12));

        assertEquals(BigDecimal.valueOf(100), result.items().get(0).priceAmount());
        assertEquals(BigDecimal.valueOf(200), result.items().get(1).priceAmount());
        assertEquals(BigDecimal.valueOf(300), result.items().get(2).priceAmount());
    }

    @Test
    public void search_sortPriceDesc() {
        PublishedListingView a = listing("Colombo", BigDecimal.valueOf(100), "any", 3, Instant.now());
        PublishedListingView b = listing("Colombo", BigDecimal.valueOf(300), "any", 3, Instant.now());
        PublishedListingView c = listing("Colombo", BigDecimal.valueOf(200), "any", 3, Instant.now());

        when(repository.findAll()).thenReturn(List.of(a, b, c));

        PageResponseDto<ListingDto> result = service.search(
                filters(null, null, null, null, "price_desc", 1, 12));

        assertEquals(BigDecimal.valueOf(300), result.items().get(0).priceAmount());
        assertEquals(BigDecimal.valueOf(200), result.items().get(1).priceAmount());
        assertEquals(BigDecimal.valueOf(100), result.items().get(2).priceAmount());
    }

    @Test
    public void search_sortTitleAscCaseInsensitive() {
        // Titles are built as city + "-" + price.intValue() → "alpha-10", "Beta-10", "gamma-10"
        // Case-insensitive ordering should give: alpha, Beta, gamma
        PublishedListingView b = listing("Beta",  BigDecimal.TEN, "any", 3, Instant.now());
        PublishedListingView a = listing("alpha", BigDecimal.TEN, "any", 3, Instant.now());
        PublishedListingView c = listing("gamma", BigDecimal.TEN, "any", 3, Instant.now());

        when(repository.findAll()).thenReturn(List.of(b, a, c));

        PageResponseDto<ListingDto> result = service.search(
                filters(null, null, null, null, "title_asc", 1, 12));

        assertEquals("alpha-10", result.items().get(0).title());
        assertEquals("Beta-10",  result.items().get(1).title());
        assertEquals("gamma-10", result.items().get(2).title());
    }

    @Test
    public void search_defaultRelevanceSortPutsMoreAvailableFirst() {
        PublishedListingView few  = listing("Colombo", BigDecimal.TEN, "any", 1, Instant.now());
        PublishedListingView many = listing("Colombo", BigDecimal.TEN, "any", 4, Instant.now());

        when(repository.findAll()).thenReturn(List.of(few, many));

        PageResponseDto<ListingDto> result = service.search(
                filters(null, null, null, null, null, 1, 12));

        assertEquals(4, result.items().get(0).availableSlots());
        assertEquals(1, result.items().get(1).availableSlots());
    }

    // pagination

    @Test
    public void search_firstPageReturnsPageSizeItems() {
        when(repository.findAll()).thenReturn(List.of(
                listing("A", BigDecimal.ONE, "any", 1, Instant.now()),
                listing("B", BigDecimal.ONE, "any", 1, Instant.now()),
                listing("C", BigDecimal.ONE, "any", 1, Instant.now()),
                listing("D", BigDecimal.ONE, "any", 1, Instant.now()),
                listing("E", BigDecimal.ONE, "any", 1, Instant.now())));

        PageResponseDto<ListingDto> result = service.search(
                filters(null, null, null, null, "price_asc", 1, 2));

        assertEquals(2, result.items().size());
        assertEquals(5, result.total());
    }

    @Test
    public void search_outOfRangePageReturnsEmptyItemsButRealTotal() {
        when(repository.findAll()).thenReturn(List.of(
                listing("A", BigDecimal.ONE, "any", 1, Instant.now()),
                listing("B", BigDecimal.ONE, "any", 1, Instant.now())));

        PageResponseDto<ListingDto> result = service.search(
                filters(null, null, null, null, "price_asc", 99, 12));

        assertTrue(result.items().isEmpty());
        assertEquals(2, result.total());
    }

    @Test
    public void search_lastPageReturnsRemainder() {
        when(repository.findAll()).thenReturn(List.of(
                listing("A", BigDecimal.ONE, "any", 1, Instant.now()),
                listing("B", BigDecimal.ONE, "any", 1, Instant.now()),
                listing("C", BigDecimal.ONE, "any", 1, Instant.now())));

        PageResponseDto<ListingDto> result = service.search(
                filters(null, null, null, null, "price_asc", 2, 2));

        assertEquals(1, result.items().size());
    }

    @Test
    public void search_safePageDefaultsTo1WhenNull() {
        when(repository.findAll()).thenReturn(List.of(
                listing("A", BigDecimal.ONE, "any", 1, Instant.now())));

        PageResponseDto<ListingDto> result = service.search(
                filters(null, null, null, null, "price_asc", null, null));

        assertEquals(1, result.items().size());
    }

    //getById

    @Test
    public void getById_returnsMappedDtoWhenFound() {
        UUID id = UUID.randomUUID();
        PublishedListingView l = listing("Colombo", BigDecimal.TEN, "any", 3, Instant.now());
        l.setId(id);

        when(repository.findById(id)).thenReturn(Optional.of(l));

        ListingDto result = service.getById(id);

        assertEquals(id, result.id());
    }

    @Test
    public void getById_throws404WhenMissing() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.getById(id));

        assertEquals(404, ex.getStatusCode().value());
    }
}
