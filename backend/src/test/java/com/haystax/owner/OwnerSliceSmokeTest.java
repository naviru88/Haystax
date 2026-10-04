package com.haystax.owner;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * C2 smoke test: boots the Spring context and checks the ONE public owner
 * endpoint ({@code GET /api/owner/health}).
 * <p>
 * The context needs a reachable datasource (the project ships no embedded DB), so
 * the test skips cleanly — <em>without booting anything</em> — when no DB is
 * configured: OS env {@code HAYSTAX_DB_URL} is set, or {@code backend/.env} exists
 * (which spring-dotenv loads). Only read operations are performed against a DB
 * (none, here); no data is ever touched.
 */
@SpringBootTest
@AutoConfigureMockMvc
class OwnerSliceSmokeTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @EnabledIf("databaseConfigured")
    void ownerHealthIsPublicAndReportsOk() throws Exception {
        mockMvc.perform(get("/api/owner/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.slice").value("owner"));
    }

    static boolean databaseConfigured() {
        if (System.getenv("HAYSTAX_DB_URL") != null) {
            return true;
        }
        return Files.exists(Path.of("backend/.env")) || Files.exists(Path.of(".env"));
    }
}