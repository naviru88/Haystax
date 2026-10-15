package com.haystax.discovery.service;

import com.haystax.discovery.dto.ListingDto;
import com.haystax.discovery.dto.SearchFiltersDto;
import com.haystax.discovery.entity.PublishedListingView;
import com.haystax.discovery.mapper.ListingMapper;
import com.haystax.discovery.repository.ListingReadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

public class GeoSearchServiceTest {

    @Mock
    private ListingReadRepository repository;

    @Mock
    private ListingMapper mapper;

    @InjectMocks
    private GeoSearchService service;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    //helpers

    private PublishedListingView listing(String city, String gender) {
        PublishedListingView l = new PublishedListingView();
        l.setId(UUID.randomUUID());
        l.setTitle("L");
        l.setCity(city);
        l.setGenderPolicy(gender);
        l.setPriceAmount(BigDecimal.TEN);
        l.setCurrencyCode("LKR");
        l.setTotalSlots(5);
        l.setAvailableSlots(3);
        return l;
    }

    private ListingDto dtoFor(PublishedListingView l, Double distanceKm) {
        ListingDto dto = mock(ListingDto.class);
        when(mapper.toDto(l, distanceKm)).thenReturn(dto);
        return dto;
    }

    private SearchFiltersDto filters(String city, String gender) {
        return new SearchFiltersDto(city, null, null, gender, null, 1, 100);
    }

    // radius filter is delegated to the repo

    @Test
    public void near_convertsRadiusToMeters() {
        // 5 km → 5000 m must be passed to the repository
        when(repository.findIdsWithinRadius(6.9, 79.8, 5000.0)).thenReturn(List.of());

        service.near(6.9, 79.8, 5.0, filters(null, null));

        verify(repository).findIdsWithinRadius(6.9, 79.8, 5000.0);
    }

    @Test
    public void near_returnsEmptyWhenNoIdsInRadius() {
        when(repository.findIdsWithinRadius(anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(List.of());

        List<ListingDto> result = service.near(6.9, 79.8, 5.0, filters(null, null));

        assertTrue(result.isEmpty());
        // No point querying the full rows if the id list is empty
        verify(repository, never()).findAllById(any());
    }

    //filters applied after radius

    @Test
    public void near_filtersByCityAfterRadiusQuery() {
        PublishedListingView colombo = listing("Colombo", "any");
        PublishedListingView kandy   = listing("Kandy",   "any");

        when(repository.findIdsWithinRadius(anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(List.of(colombo.getId(), kandy.getId()));
        when(repository.findAllById(any()))
                .thenReturn(List.of(colombo, kandy));
        when(repository.distanceKmFrom(any(), anyDouble(), anyDouble()))
                .thenReturn(1.0);

        ListingDto colomboDto = mock(ListingDto.class);
        when(mapper.toDto(colombo, 1.0)).thenReturn(colomboDto);

        List<ListingDto> result = service.near(6.9, 79.8, 5.0, filters("Colombo", null));

        assertEquals(1, result.size());
        assertSame(colomboDto, result.get(0));
        verify(mapper, never()).toDto(eq(kandy), anyDouble());
    }

    @Test
    public void near_filtersByGenderAfterRadiusQuery() {
        PublishedListingView female = listing("Colombo", "female_only");
        PublishedListingView male   = listing("Colombo", "male_only");

        when(repository.findIdsWithinRadius(anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(List.of(female.getId(), male.getId()));
        when(repository.findAllById(any())).thenReturn(List.of(female, male));
        when(repository.distanceKmFrom(any(), anyDouble(), anyDouble())).thenReturn(2.0);

        ListingDto femaleDto = mock(ListingDto.class);
        when(mapper.toDto(female, 2.0)).thenReturn(femaleDto);

        List<ListingDto> result = service.near(6.9, 79.8, 5.0, filters(null, "female_only"));

        assertEquals(1, result.size());
        assertSame(femaleDto, result.get(0));
        verify(mapper, never()).toDto(eq(male), anyDouble());
    }

    @Test
    public void near_noFiltersReturnsAllWithinRadius() {
        PublishedListingView a = listing("Colombo", "any");
        PublishedListingView b = listing("Kandy",   "female_only");

        when(repository.findIdsWithinRadius(anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(List.of(a.getId(), b.getId()));
        when(repository.findAllById(any())).thenReturn(List.of(a, b));
        when(repository.distanceKmFrom(any(), anyDouble(), anyDouble())).thenReturn(1.5);

        dtoFor(a, 1.5);
        dtoFor(b, 1.5);

        List<ListingDto> result = service.near(6.9, 79.8, 5.0, filters(null, null));

        assertEquals(2, result.size());
    }

    //distance math is delegated to the repo

    @Test
    public void near_attachesDistanceFromRepository() {
        PublishedListingView l = listing("Colombo", "any");

        when(repository.findIdsWithinRadius(anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(List.of(l.getId()));
        when(repository.findAllById(any())).thenReturn(List.of(l));
        when(repository.distanceKmFrom(l.getId(), 6.9, 79.8)).thenReturn(3.7);

        ListingDto dto = mock(ListingDto.class);
        when(mapper.toDto(l, 3.7)).thenReturn(dto);

        List<ListingDto> result = service.near(6.9, 79.8, 5.0, filters(null, null));

        assertSame(dto, result.get(0));
        verify(repository).distanceKmFrom(l.getId(), 6.9, 79.8);
    }

    //ordering preserved from repo

    @Test
    public void near_preservesRepoOrder() {
        PublishedListingView near1 = listing("Colombo", "any");
        PublishedListingView near2 = listing("Colombo", "any");
        PublishedListingView near3 = listing("Colombo", "any");

        // Repo returns sorted-by-distance ids
        when(repository.findIdsWithinRadius(anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(List.of(near1.getId(), near2.getId(), near3.getId()));
        when(repository.findAllById(any())).thenReturn(List.of(near3, near1, near2));
        when(repository.distanceKmFrom(any(), anyDouble(), anyDouble())).thenReturn(1.0);

        ListingDto d1 = mock(ListingDto.class);
        ListingDto d2 = mock(ListingDto.class);
        ListingDto d3 = mock(ListingDto.class);
        when(mapper.toDto(near1, 1.0)).thenReturn(d1);
        when(mapper.toDto(near2, 1.0)).thenReturn(d2);
        when(mapper.toDto(near3, 1.0)).thenReturn(d3);

        List<ListingDto> result = service.near(6.9, 79.8, 5.0, filters(null, null));

        // Must follow the id order, not the findAllById order
        assertSame(d1, result.get(0));
        assertSame(d2, result.get(1));
        assertSame(d3, result.get(2));
    }

    //defensive: null row from findAllById

    @Test
    public void near_skipsNullRowsFromFindAllById() {
        PublishedListingView real = listing("Colombo", "any");
        UUID orphanId = UUID.randomUUID();

        when(repository.findIdsWithinRadius(anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(List.of(real.getId(), orphanId));
        when(repository.findAllById(any())).thenReturn(List.of(real)); // orphan missing
        when(repository.distanceKmFrom(real.getId(), 6.9, 79.8)).thenReturn(2.0);

        dtoFor(real, 2.0);

        List<ListingDto> result = service.near(6.9, 79.8, 5.0, filters(null, null));

        assertEquals(1, result.size());
    }
}
