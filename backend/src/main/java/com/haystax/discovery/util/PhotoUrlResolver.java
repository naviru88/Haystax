package com.haystax.discovery.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PhotoUrlResolver {

    private final String storageBaseUrl;

    public PhotoUrlResolver(
            @Value("${haystax.storage.public-base-url:}") String storageBaseUrl) {
        this.storageBaseUrl = storageBaseUrl == null ? "" : storageBaseUrl.trim();
    }

    public String resolve(String storagePath) {
        if (storagePath == null || storagePath.isBlank()) return storagePath;
        if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
            return storagePath;
        }
        if (storageBaseUrl.isBlank()) return storagePath;
        String base = storageBaseUrl.endsWith("/")
                ? storageBaseUrl.substring(0, storageBaseUrl.length() - 1)
                : storageBaseUrl;
        String path = storagePath.startsWith("/")
                ? storagePath.substring(1)
                : storagePath;
        return base + "/" + path;
    }
}
