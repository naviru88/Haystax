package com.haystax.engagement.adapter;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
public class FixtureListingContractClient implements ListingContractClient {
    private static final UUID OWNER_ID = UUID.fromString("44444444-0000-0000-0000-000000000002");
    private static final Map<UUID, UUID> LISTING_OWNERS = Map.of(
            UUID.fromString("22222222-0000-0000-0000-000000000101"), OWNER_ID,
            UUID.fromString("22222222-0000-0000-0000-000000000102"), OWNER_ID,
            UUID.fromString("22222222-0000-0000-0000-000000000103"), OWNER_ID
    );

    @Override
    public ListingOwner getListingOwner(UUID listingId) {
        UUID ownerId = LISTING_OWNERS.get(listingId);
        if (ownerId == null) {
            throw new IllegalArgumentException("Listing was not found: " + listingId);
        }
        return new ListingOwner(listingId, ownerId);
    }
}
