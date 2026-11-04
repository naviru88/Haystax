package com.haystax.engagement;

import com.haystax.engagement.service.TenancyService;
import org.springframework.boot.test.context.TestConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.context.annotation.Import;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;
import org.springframework.security.web.FilterChainProxy;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Import(TenancySecurityIntegrationTest.MockTenancyServiceConfiguration.class)
class TenancySecurityIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private FilterChainProxy securityFilterChain;

    @Autowired
    private TenancyService tenancyService;

    @Test
    void engagementTenanciesRequireMockAuthentication() throws Exception {
        mockMvc().perform(get("/api/engagement/tenancies"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void validMockAuthenticationReachesTenancyController() throws Exception {
        UUID userId = UUID.randomUUID();
        when(tenancyService.getTenanciesForUser(userId)).thenReturn(List.of());

        mockMvc().perform(get("/api/engagement/tenancies")
                        .header("X-Mock-User-Id", userId)
                        .header("X-Mock-Role", "TENANT")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    private MockMvc mockMvc() {
        return MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .addFilters(securityFilterChain)
                .build();
    }

    @TestConfiguration
    static class MockTenancyServiceConfiguration {
        @Bean
        @Primary
        TenancyService tenancyService() {
            return mock(TenancyService.class);
        }
    }
}
