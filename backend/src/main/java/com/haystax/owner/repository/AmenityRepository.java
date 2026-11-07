package com.haystax.owner.repository;

import com.haystax.owner.dto.AmenityDto;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Read-only access to the existing {@code public.amenities} table for the
 * listing editor ({@code GET /api/owner/amenities}).
 * <p>
 * Uses JDBC (no JPA entity write path) and returns active amenities ordered by
 * {@code sort_order, name} per the OpenAPI contract.
 */
@Repository
public class AmenityRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public AmenityRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<AmenityDto> findActiveOrdered() {
        return jdbc.query(
                """
                SELECT id, code, name, description, is_active, sort_order
                FROM public.amenities
                WHERE is_active = true
                ORDER BY sort_order, name
                """,
                (rs, i) -> new AmenityDto(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("code"),
                        rs.getString("name"),
                        rs.getString("description"),
                        rs.getBoolean("is_active"),
                        rs.getInt("sort_order")));
    }
}
