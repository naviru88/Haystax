package com.haystax.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI haystaxOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Haystax API")
                        .description("Boarding management platform — backend API")
                        .version("0.1.0")
                        .contact(new Contact()
                                .name("Haystax Team")
                                .url("https://github.com/naviru88/Haystax"))
                        .license(new License().name("Private")));
    }
}
