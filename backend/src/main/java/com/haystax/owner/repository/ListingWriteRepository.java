package com.haystax.owner.repository;

import com.haystax.owner.dto.AmenityDto;
import com.haystax.owner.dto.GenderPolicy;
import com.haystax.owner.dto.ListingPhotoDto;
import com.haystax.owner.dto.ListingRuleDto;
import com.haystax.owner.dto.ListingStatus;
import com.haystax.owner.dto.LocationDto;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Types;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Read/write access to {@code public.boarding_listings} and its joins, using
 * {@link NamedParameterJdbcTemplate} (JPA cannot write the PostGIS geography
 * column). All reads/updates are scoped {@code WHERE id = :id AND owner_id =
 * :owner_id} so ownership is enforced by Spring, never by RLS alone (DB notes
 * issue #2).
 * <p>
 * PostGIS calls use the {@code extensions.} schema prefix and
 * {@code ::extensions.geography} cast, matching the working discovery slice in
 * this repo against this DB (see ListingReadRepository).
 */
@Repository
public class ListingWriteRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public ListingWriteRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ------------------------------------------------------------------
    // inserts / updates
    // ------------------------------------------------------------------

    public UUID insertListing(UUID ownerId, String title, String description,
                              String addressLine1, String addressLine2, String city,
                              String district, String locationLabel,
                              LocationDto location, BigDecimal priceAmount,
                              String currencyCode, GenderPolicy genderPolicy,
                              int totalSlots, int availableSlots) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("owner_id", ownerId)
                .addValue("title", title)
                .addValue("description", description)
                .addValue("a1", addressLine1)
                .addValue("a2", addressLine2)
                .addValue("city", city)
                .addValue("district", district)
                .addValue("label", locationLabel)
                .addValue("price", priceAmount)
                .addValue("currency", currencyCode)
                .addValue("gender", genderPolicy == null ? "any" : genderPolicy.name())
                .addValue("total", totalSlots)
                .addValue("available", availableSlots);
        params.addValue("lng", location.lng());
        params.addValue("lat", location.lat());

        String sql = """
                INSERT INTO public.boarding_listings
                  (owner_id, title, description, address_line_1, address_line_2, city,
                   district, location_label, location, price_amount, currency_code,
                   gender_policy, total_slots, available_slots, status)
                VALUES
                  (:owner_id, :title, :description, :a1, :a2, :city, :district, :label,
                   extensions.st_setsrid(extensions.st_makepoint(:lng, :lat), 4326)::extensions.geography,
                   :price, :currency,
                   CAST(:gender AS public.gender_policy), :total, :available, 'draft')
                RETURNING id
                """;
        jdbc.update(sql, params, keyHolder, new String[]{"id"});
        return (UUID) keyHolder.getKeys().get("id");
    }

    /** Returns true when exactly one row was updated (the caller's own listing). */
    public boolean updateListing(UUID id, UUID ownerId, String title, String description,
                                 String addressLine1, String addressLine2, String city,
                                 String district, String locationLabel,
                                 LocationDto location, BigDecimal priceAmount,
                                 String currencyCode, GenderPolicy genderPolicy,
                                 int totalSlots, int availableSlots) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("owner_id", ownerId)
                .addValue("title", title)
                .addValue("description", description)
                .addValue("a1", addressLine1)
                .addValue("a2", addressLine2)
                .addValue("city", city)
                .addValue("district", district)
                .addValue("label", locationLabel)
                .addValue("price", priceAmount)
                .addValue("currency", currencyCode)
                .addValue("gender", genderPolicy == null ? "any" : genderPolicy.name())
                .addValue("total", totalSlots)
                .addValue("available", availableSlots);
        params.addValue("lng", location.lng());
        params.addValue("lat", location.lat());

        String sql = """
                UPDATE public.boarding_listings
                SET title = :title, description = :description,
                    address_line_1 = :a1, address_line_2 = :a2, city = :city,
                    district = :district, location_label = :label,
                    location = extensions.st_setsrid(extensions.st_makepoint(:lng, :lat), 4326)::extensions.geography,
                    price_amount = :price, currency_code = :currency,
                    gender_policy = CAST(:gender AS public.gender_policy),
                    total_slots = :total, available_slots = :available
                WHERE id = :id AND owner_id = :owner_id
                """;
        return jdbc.update(sql, params) > 0;
    }

    public boolean updateStatus(UUID id, UUID ownerId, ListingStatus status) {
        return jdbc.update("""
                UPDATE public.boarding_listings
                SET status = CAST(:status AS public.listing_status)
                WHERE id = :id AND owner_id = :owner_id
                """,
                new MapSqlParameterSource()
                        .addValue("id", id)
                        .addValue("owner_id", ownerId)
                        .addValue("status", status.name())) > 0;
    }

    // ------------------------------------------------------------------
    // reads (all owner-scoped)
    // ------------------------------------------------------------------

    public Optional<ListingRow> findOwned(UUID id, UUID ownerId) {
        List<ListingRow> rows = jdbc.query("""
                SELECT id, owner_id, title, description, address_line_1, address_line_2,
                       city, district, location_label,
                       extensions.st_y(location::geometry) AS lat,
                       extensions.st_x(location::geometry) AS lng,
                       price_amount, currency_code, gender_policy::text AS gender_policy,
                       total_slots, available_slots, status::text AS status,
                       moderation_note, published_at, removed_at, created_at, updated_at
                FROM public.boarding_listings
                WHERE id = :id AND owner_id = :owner_id
                """,
                new MapSqlParameterSource().addValue("id", id).addValue("owner_id", ownerId),
                (rs, i) -> new ListingRow(
                        UUID.fromString(rs.getString("id")),
                        UUID.fromString(rs.getString("owner_id")),
                        rs.getString("title"),
                        rs.getString("description"),
                        rs.getString("address_line_1"),
                        rs.getString("address_line_2"),
                        rs.getString("city"),
                        rs.getString("district"),
                        rs.getString("location_label"),
                        toLocation(rs.getObject("lat"), rs.getObject("lng")),
                        rs.getBigDecimal("price_amount"),
                        rs.getString("currency_code"),
                        GenderPolicy.valueOf(rs.getString("gender_policy")),
                        rs.getInt("total_slots"),
                        rs.getInt("available_slots"),
                        ListingStatus.valueOf(rs.getString("status")),
                        rs.getString("moderation_note"),
                        toOffsetDateTime(rs.getObject("published_at")),
                        toOffsetDateTime(rs.getObject("removed_at")),
                        toOffsetDateTime(rs.getObject("created_at")),
                        toOffsetDateTime(rs.getObject("updated_at"))));
        return rows.stream().findFirst();
    }

    public List<ListingRow> findOwnedAll(UUID ownerId) {
        return jdbc.query("""
                SELECT id, owner_id, title, description, address_line_1, address_line_2,
                       city, district, location_label,
                       extensions.st_y(location::geometry) AS lat,
                       extensions.st_x(location::geometry) AS lng,
                       price_amount, currency_code, gender_policy::text AS gender_policy,
                       total_slots, available_slots, status::text AS status,
                       moderation_note, published_at, removed_at, created_at, updated_at
                FROM public.boarding_listings
                WHERE owner_id = :owner_id
                ORDER BY created_at DESC
                """,
                new MapSqlParameterSource().addValue("owner_id", ownerId),
                (rs, i) -> new ListingRow(
                        UUID.fromString(rs.getString("id")),
                        UUID.fromString(rs.getString("owner_id")),
                        rs.getString("title"),
                        rs.getString("description"),
                        rs.getString("address_line_1"),
                        rs.getString("address_line_2"),
                        rs.getString("city"),
                        rs.getString("district"),
                        rs.getString("location_label"),
                        toLocation(rs.getObject("lat"), rs.getObject("lng")),
                        rs.getBigDecimal("price_amount"),
                        rs.getString("currency_code"),
                        GenderPolicy.valueOf(rs.getString("gender_policy")),
                        rs.getInt("total_slots"),
                        rs.getInt("available_slots"),
                        ListingStatus.valueOf(rs.getString("status")),
                        rs.getString("moderation_note"),
                        toOffsetDateTime(rs.getObject("published_at")),
                        toOffsetDateTime(rs.getObject("removed_at")),
                        toOffsetDateTime(rs.getObject("created_at")),
                        toOffsetDateTime(rs.getObject("updated_at"))));
    }

    public List<UUID> findAmenityIds(UUID listingId) {
        return jdbc.query("SELECT amenity_id FROM public.listing_amenities WHERE listing_id = :id",
                new MapSqlParameterSource().addValue("id", listingId),
                (rs, i) -> UUID.fromString(rs.getString("amenity_id")));
    }

    public List<AmenityDto> findAmenitiesByIds(List<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        MapSqlParameterSource params = new MapSqlParameterSource().addValue("ids", ids);
        return jdbc.query("""
                SELECT id, code, name, description, is_active, sort_order
                FROM public.amenities
                WHERE id IN (:ids) AND is_active = true
                ORDER BY sort_order, name
                """, params,
                (rs, i) -> new AmenityDto(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("code"),
                        rs.getString("name"),
                        rs.getString("description"),
                        rs.getBoolean("is_active"),
                        rs.getInt("sort_order")));
    }

    public List<ListingRuleDto> findRules(UUID listingId) {
        return jdbc.query("""
                SELECT id, rule_code, label, is_allowed, notes
                FROM public.listing_rules
                WHERE listing_id = :id
                ORDER BY rule_code
                """,
                new MapSqlParameterSource().addValue("id", listingId),
                (rs, i) -> new ListingRuleDto(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("rule_code"),
                        rs.getString("label"),
                        rs.getBoolean("is_allowed"),
                        rs.getString("notes")));
    }

    public List<ListingPhotoDto> findPhotos(UUID listingId) {
        return jdbc.query("""
                SELECT id, listing_id, storage_path, alt_text, sort_order,
                       is_primary, is_approved, created_at
                FROM public.listing_photos
                WHERE listing_id = :id
                ORDER BY sort_order, created_at
                """,
                new MapSqlParameterSource().addValue("id", listingId),
                (rs, i) -> new ListingPhotoDto(
                        UUID.fromString(rs.getString("id")),
                        UUID.fromString(rs.getString("listing_id")),
                        rs.getString("storage_path"),
                        rs.getString("alt_text"),
                        rs.getInt("sort_order"),
                        rs.getBoolean("is_primary"),
                        rs.getBoolean("is_approved"),
                        toOffsetDateTime(rs.getObject("created_at"))));
    }

    public int countPhotos(UUID listingId) {
        Integer n = jdbc.queryForObject(
                "SELECT count(*) FROM public.listing_photos WHERE listing_id = :id",
                new MapSqlParameterSource().addValue("id", listingId), Integer.class);
        return n == null ? 0 : n;
    }

    public boolean amenityExistsAndActive(UUID amenityId) {
        Integer n = jdbc.queryForObject(
                "SELECT count(*) FROM public.amenities WHERE id = :id AND is_active = true",
                new MapSqlParameterSource().addValue("id", amenityId), Integer.class);
        return n != null && n > 0;
    }

    public void replaceAmenities(UUID listingId, List<UUID> amenityIds) {
        jdbc.update("DELETE FROM public.listing_amenities WHERE listing_id = :id",
                new MapSqlParameterSource().addValue("id", listingId));
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("listing_id", listingId)
                .addValue("amenity_ids", amenityIds);
        jdbc.update("""
                INSERT INTO public.listing_amenities (listing_id, amenity_id)
                SELECT :listing_id, unnest(:amenity_ids::uuid[])
                """, params);
    }

    public void replaceRules(UUID listingId, List<ListingRuleRow> rules) {
        jdbc.update("DELETE FROM public.listing_rules WHERE listing_id = :id",
                new MapSqlParameterSource().addValue("id", listingId));
        for (ListingRuleRow r : rules) {
            jdbc.update("""
                    INSERT INTO public.listing_rules
                      (listing_id, rule_code, label, is_allowed, notes)
                    VALUES (:listing_id, :rule_code, :label, :is_allowed, :notes)
                    """,
                    new MapSqlParameterSource()
                            .addValue("listing_id", listingId)
                            .addValue("rule_code", r.ruleCode())
                            .addValue("label", r.label())
                            .addValue("is_allowed", r.isAllowed())
                            .addValue("notes", r.notes()));
        }
    }

    // ------------------------------------------------------------------
    // value holder + helpers
    // ------------------------------------------------------------------

    public record ListingRow(
            UUID id, UUID ownerId, String title, String description,
            String addressLine1, String addressLine2, String city, String district,
            String locationLabel, LocationDto location, BigDecimal priceAmount,
            String currencyCode, GenderPolicy genderPolicy, int totalSlots,
            int availableSlots, ListingStatus status, String moderationNote,
            OffsetDateTime publishedAt, OffsetDateTime removedAt,
            OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    }

    public record ListingRuleRow(String ruleCode, String label, boolean isAllowed, String notes) {
    }

    private static LocationDto toLocation(Object latObj, Object lngObj) {
        if (latObj == null || lngObj == null) {
            return null;
        }
        double lat = ((Number) latObj).doubleValue();
        double lng = ((Number) lngObj).doubleValue();
        return new LocationDto(lat, lng);
    }

    private static OffsetDateTime toOffsetDateTime(Object o) {
        if (o == null) {
            return null;
        }
        if (o instanceof OffsetDateTime odt) {
            return odt;
        }
        if (o instanceof java.time.LocalDateTime ldt) {
            return ldt.atOffset(java.time.ZoneOffset.UTC);
        }
        if (o instanceof java.sql.Timestamp ts) {
            return ts.toInstant().atOffset(java.time.ZoneOffset.UTC);
        }
        return OffsetDateTime.parse(o.toString());
    }
}
