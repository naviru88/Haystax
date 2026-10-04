package com.haystax.owner;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.DynamicTest.dynamicTest;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * C2 smoke test: boots the Spring context and checks the ONE public owner
 * endpoint ({@code GET /api/owner/health}).
 * <p>
 * AGENTS §6: the context needs a reachable datasource (no embedded DB ships),
 * so this test skips cleanly — <em>before any Spring context work</em> — when
 * the OS env {@code HAYSTAX_DB_URL} is not set. The skip decision lives in an
 * {@link ExecutionCondition}, which JUnit evaluates at discovery time, before
 * the Spring Boot test bootstrapper would try to load the context. On a machine
 * with the DB configured it boots the real context and verifies the endpoint.
 * Only read operations are performed; no data is ever touched.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ExtendWith(OwnerSliceSmokeTest.SkipWithoutDb.class)
class OwnerSliceSmokeTest {

    @Autowired
    private ObjectProvider<MockMvc> mockMvcProvider;

    @TestFactory
    Stream<DynamicTest> ownerHealthIsPublicAndReportsOk() {
        return Stream.of(dynamicTest("GET /api/owner/health returns ok", () -> {
            MockMvc mockMvc = mockMvcProvider.getIfAvailable();
            assertNotNull(mockMvc, "MockMvc bean should be present in the booted context");
            mockMvc.perform(get("/api/owner/health"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ok"))
                    .andExpect(jsonPath("$.slice").value("owner"));
        }));
    }

    /** JUnit discovery-time gate: skip before Spring attempts to boot the context. */
    public static class SkipWithoutDb implements ExecutionCondition {
        @Override
        public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
            return System.getenv("HAYSTAX_DB_URL") != null
                    ? ConditionEvaluationResult.enabled("HAYSTAX_DB_URL is set")
                    : ConditionEvaluationResult.disabled(
                            "HAYSTAX_DB_URL not set — skipping context-boot smoke test (AGENTS §6)");
        }
    }
}
