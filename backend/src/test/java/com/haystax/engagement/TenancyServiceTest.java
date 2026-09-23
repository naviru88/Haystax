package com.haystax.engagement;

import com.haystax.common.exception.DoubleBookingException;
import com.haystax.engagement.dto.TenancyDto;
import com.haystax.engagement.entity.TenancyEntity;
import com.haystax.engagement.repository.TenancyRepository;
import com.haystax.engagement.service.TenancyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class TenancyServiceTest {

    @Mock
    private TenancyRepository tenancyRepository;

    @InjectMocks
    private TenancyService tenancyService;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void testCreateTenancySuccess() {
        UUID listingId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        TenancyDto dto = new TenancyDto();
        dto.setListingId(listingId);
        dto.setTenantId(tenantId);
        dto.setMoveInDate(LocalDate.of(2026, 10, 1));

        when(tenancyRepository.countOverlappingBookings(listingId, LocalDate.of(2026, 10, 1))).thenReturn(0L);
        when(tenancyRepository.save(any(TenancyEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TenancyDto created = tenancyService.createTenancyRequest(dto);

        assertNotNull(created);
        assertEquals("active", created.getStatus());
        verify(tenancyRepository, times(1)).save(any(TenancyEntity.class));
    }

    @Test
    public void testDoubleBookingExceptionThrown() {
        UUID listingId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        TenancyDto dto = new TenancyDto();
        dto.setListingId(listingId);
        dto.setTenantId(tenantId);
        dto.setMoveInDate(LocalDate.of(2026, 10, 1));

        when(tenancyRepository.countOverlappingBookings(listingId, LocalDate.of(2026, 10, 1))).thenReturn(1L);

        assertThrows(DoubleBookingException.class, () -> {
            tenancyService.createTenancyRequest(dto);
        });

        verify(tenancyRepository, never()).save(any(TenancyEntity.class));
    }
}
