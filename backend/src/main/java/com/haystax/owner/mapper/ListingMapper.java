package com.haystax.owner.mapper;

import com.haystax.owner.dto.AmenityDto;
import com.haystax.owner.dto.ListingDto;
import com.haystax.owner.dto.ListingPhotoDto;
import com.haystax.owner.dto.ListingRuleDto;
import com.haystax.owner.repository.ListingWriteRepository;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Maps a repository {@link ListingWriteRepository.ListingRow} to the wire
 * {@link ListingDto}. Amenities/rules/photos are already DTOs from the
 * repository and passed straight through.
 */
@Component
public class ListingMapper {

    public ListingDto toDto(ListingWriteRepository.ListingRow row,
                            List<AmenityDto> amenities,
                            List<ListingRuleDto> rules,
                            List<ListingPhotoDto> photos) {
        return new ListingDto(
                row.id(), row.ownerId(), row.title(), row.description(),
                row.addressLine1(), row.addressLine2(), row.city(), row.district(),
                row.locationLabel(), row.location(), row.priceAmount(),
                row.currencyCode(), row.genderPolicy(), row.totalSlots(),
                row.availableSlots(), row.status(), row.moderationNote(),
                row.publishedAt(), row.removedAt(), row.createdAt(), row.updatedAt(),
                photos, amenities, rules);
    }
}
