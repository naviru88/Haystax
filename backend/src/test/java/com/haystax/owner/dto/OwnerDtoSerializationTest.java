package com.haystax.owner.dto;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies owner DTOs serialise to the exact wire shape in the C1 OpenAPI
 * ({@code docs/api-contracts/openapi-owner.yaml}) using the runtime Jackson 3
 * mapper (Spring Boot 4 ships {@code tools.jackson.*}).
 * <p>
 * Pure unit test — no Spring context, no DB — so it always runs, with or
 * without a datasource.
 */
class OwnerDtoSerializationTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void meDtoSerializesToSnakeCaseWireShape() throws Exception {
        MeDto me = new MeDto(
                UUID.fromString("00857d5e-ec1e-4d79-9e8d-da00c2c054cc"),
                "anoj@example.com", "Anoj Perera", "+94771234567",
                "/avatars/anoj.jpg", true, false, false, null);

        JsonNode n = mapper.readTree(mapper.writeValueAsString(me));

        assertEquals("00857d5e-ec1e-4d79-9e8d-da00c2c054cc", n.get("id").asText());
        assertEquals("anoj@example.com", n.get("email").asText());
        assertEquals("Anoj Perera", n.get("display_name").asText());
        assertEquals("+94771234567", n.get("phone_number").asText());
        assertEquals("/avatars/anoj.jpg", n.get("avatar_path").asText());
        assertTrue(n.get("is_owner").asBoolean());
        assertFalse(n.get("is_admin").asBoolean());
        assertFalse(n.get("is_suspended").asBoolean());
        assertTrue(n.get("suspension_reason").isNull());
    }

    @Test
    void errorResponseKeepsFieldErrorsVerbatim() throws Exception {
        JsonNode n = mapper.readTree(
                mapper.writeValueAsString(ErrorResponseDto.notImplemented("/api/owner/listings")));

        assertEquals(501, n.get("status").asInt());
        assertEquals("Not Implemented", n.get("error").asText());
        assertEquals("/api/owner/listings", n.get("path").asText());
        // Contract quirk: fieldErrors stays camelCase, present (null here) even on 501.
        assertTrue(n.has("fieldErrors"));
        assertTrue(n.has("timestamp"));
        assertTrue(n.has("message"));
    }

    @Test
    void enumsSerializeLowercase() throws Exception {
        assertEquals("\"published\"", mapper.writeValueAsString(ListingStatus.published));
        assertEquals("\"female_only\"", mapper.writeValueAsString(GenderPolicy.female_only));
    }
}
