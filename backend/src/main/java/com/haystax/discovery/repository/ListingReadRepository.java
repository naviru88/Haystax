package com.haystax.discovery.repository;

import com.haystax.discovery.entity.PublishedListingView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ListingReadRepository extends JpaRepository<PublishedListingView, UUID> {

    //Radius search
    @Query(value = """
            select bl.id
            from public.published_listing_search bl
            where extensions.st_dwithin(
                    bl.location,
                    extensions.st_setsrid(extensions.st_makepoint(:lng, :lat), 4326)::extensions.geography,
                    :radiusMeters
                  )
            order by extensions.st_distance(
                    bl.location,
                    extensions.st_setsrid(extensions.st_makepoint(:lng, :lat), 4326)::extensions.geography
                  ) asc
            """, nativeQuery = true)
    List<UUID> findIdsWithinRadius(@Param("lat") double lat,
                                   @Param("lng") double lng,
                                   @Param("radiusMeters") double radiusMeters);

    //Distance in kilometers between a listing and a point
    @Query(value = """
            select extensions.st_distance(
                    bl.location,
                    extensions.st_setsrid(extensions.st_makepoint(:lng, :lat), 4326)::extensions.geography
                  ) / 1000.0
            from public.published_listing_search bl
            where bl.id = :listingId
            """, nativeQuery = true)
    Double distanceKmFrom(@Param("listingId") UUID listingId,
                          @Param("lat") double lat,
                          @Param("lng") double lng);
}
