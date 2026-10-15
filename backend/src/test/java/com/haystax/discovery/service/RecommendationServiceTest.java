package com.haystax.discovery.service;

import com.haystax.discovery.dto.ListingDto;
import com.haystax.discovery.entity.PublishedListingView;
import com.haystax.discovery.mapper.ListingMapper;
import com.haystax.discovery.repository.ListingReadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class RecommendationServiceTest {

    @Mock
    private ListingReadRepository repository;

    @Mock
    private ListingMapper mapper;

    @InjectMocks
    private RecommendationService service;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    //helpers

    private PublishedListingView listing(String title, int total, int available, Instant publishedAt) {
        PublishedListingView l = new PublishedListingView();
        l.setId(UUID.randomUUID());
        l.setTitle(title);
        l.setTotalSlots(total);
        l.setAvailableSlots(available);
        l.setPublishedAt(publishedAt);
        return l;
    }

    private ListingDto dtoFor(PublishedListingView l) {
        ListingDto dto = mock(ListingDto.class);
        when(mapper.toDto(l)).thenReturn(dto);
        return dto;
    }

    private static Instant daysAgo(long days) {
        return Instant.now().minus(Duration.ofDays(days));
    }

    //tests

    @Test
    public void recommend_excludesListingsWithZeroAvailableSlots() {
        PublishedListingView available = listing("A", 5, 3, daysAgo(1));
        PublishedListingView full = listing("B", 5, 0, daysAgo(1));

        when(repository.findAll()).thenReturn(List.of(available, full));
        dtoFor(available);

        List<ListingDto> result = service.recommend(12);

        assertEquals(1, result.size());
        verify(mapper, times(1)).toDto(available);
        verify(mapper, never()).toDto(full);
    }

    @Test
    public void recommend_excludesListingsWithNullAvailableSlots() {
        PublishedListingView nullSlots = listing("A", 5, 0, daysAgo(1));
        nullSlots.setAvailableSlots(null);

        when(repository.findAll()).thenReturn(List.of(nullSlots));

        List<ListingDto> result = service.recommend(12);

        assertTrue(result.isEmpty());
        verify(mapper, never()).toDto(any(PublishedListingView.class));
    }

    @Test
    public void recommend_ranksHigherAvailabilityRatioFirst() {
        // Same recency, different availability ratios → higher ratio wins
        PublishedListingView high = listing("High", 10, 9, daysAgo(1));
        PublishedListingView low  = listing("Low",  10, 1, daysAgo(1));

        when(repository.findAll()).thenReturn(List.of(low, high));

        ListingDto highDto = mock(ListingDto.class);
        ListingDto lowDto  = mock(ListingDto.class);
        when(mapper.toDto(high)).thenReturn(highDto);
        when(mapper.toDto(low)).thenReturn(lowDto);

        List<ListingDto> result = service.recommend(12);

        assertEquals(2, result.size());
        assertSame(highDto, result.get(0), "higher availability ratio should rank first");
        assertSame(lowDto,  result.get(1));
    }

    @Test
    public void recommend_tieBreaksByPublishedAtDescending() {
        // Identical availability ratios (both fully available)
        // Different publish dates → newer first
        PublishedListingView newer = listing("Newer", 5, 5, daysAgo(1));
        PublishedListingView older = listing("Older", 5, 5, daysAgo(10));

        when(repository.findAll()).thenReturn(List.of(older, newer));

        ListingDto newerDto = mock(ListingDto.class);
        ListingDto olderDto = mock(ListingDto.class);
        when(mapper.toDto(newer)).thenReturn(newerDto);
        when(mapper.toDto(older)).thenReturn(olderDto);

        List<ListingDto> result = service.recommend(12);

        assertSame(newerDto, result.get(0));
        assertSame(olderDto, result.get(1));
    }

    @Test
    public void recommend_tieBreaksByIdWhenEverythingElseEqual() {
        // Identical availability AND identical publishedAt → falls back to id
        Instant same = daysAgo(2);
        PublishedListingView a = listing("A", 5, 5, same);
        PublishedListingView b = listing("B", 5, 5, same);
        // force deterministic ids so we know order
        UUID idA = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID idB = UUID.fromString("00000000-0000-0000-0000-000000000002");
        a.setId(idA);
        b.setId(idB);

        when(repository.findAll()).thenReturn(List.of(b, a));

        ListingDto dtoA = mock(ListingDto.class);
        ListingDto dtoB = mock(ListingDto.class);
        when(mapper.toDto(a)).thenReturn(dtoA);
        when(mapper.toDto(b)).thenReturn(dtoB);

        List<ListingDto> result = service.recommend(12);

        assertSame(dtoA, result.get(0), "lower UUID should rank first");
        assertSame(dtoB, result.get(1));
    }

    @Test
    public void recommend_respectsLimit() {
        PublishedListingView a = listing("A", 5, 5, daysAgo(1));
        PublishedListingView b = listing("B", 5, 5, daysAgo(2));
        PublishedListingView c = listing("C", 5, 5, daysAgo(3));

        when(repository.findAll()).thenReturn(List.of(a, b, c));
        dtoFor(a);
        dtoFor(b);

        List<ListingDto> result = service.recommend(2);

        assertEquals(2, result.size());
        verify(mapper, times(2)).toDto(any(PublishedListingView.class));
    }

    @Test
    public void recommend_defaultsLimitWhenNonPositive() {
        // Passing 0 or negative should not return zero — should default to 12
        PublishedListingView a = listing("A", 5, 5, daysAgo(1));
        when(repository.findAll()).thenReturn(List.of(a));
        dtoFor(a);

        List<ListingDto> result = service.recommend(0);

        assertEquals(1, result.size());
    }

    @Test
    public void recommend_emptyRepositoryReturnsEmptyList() {
        when(repository.findAll()).thenReturn(List.of());

        List<ListingDto> result = service.recommend(12);

        assertTrue(result.isEmpty());
    }

    @Test
    public void recommend_isDeterministic() {
        // Same input, same result order — no randomness
        PublishedListingView a = listing("A", 5, 5, daysAgo(1));
        PublishedListingView b = listing("B", 5, 3, daysAgo(1));
        PublishedListingView c = listing("C", 5, 5, daysAgo(5));

        when(repository.findAll()).thenReturn(List.of(a, b, c));
        dtoFor(a); dtoFor(b); dtoFor(c);

        List<ListingDto> first  = service.recommend(12);
        List<ListingDto> second = service.recommend(12);

        assertEquals(first, second);
    }

    @Test
    public void recommend_ignoresNullTotalSlotsInScoring() {
        // totalSlots == null → availabilityRatio = 0, but still eligible if available > 0
        PublishedListingView nullTotal = listing("A", 0, 5, daysAgo(1));
        nullTotal.setTotalSlots(null);

        when(repository.findAll()).thenReturn(List.of(nullTotal));
        dtoFor(nullTotal);

        List<ListingDto> result = service.recommend(12);

        assertEquals(1, result.size());
    }
}
