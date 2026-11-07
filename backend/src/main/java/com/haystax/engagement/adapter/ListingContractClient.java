package com.haystax.engagement.adapter;

import java.util.UUID;

public interface ListingContractClient {
    ListingOwner getListingOwner(UUID listingId);

    record ListingOwner(UUID listingId, UUID ownerId) {}
}
