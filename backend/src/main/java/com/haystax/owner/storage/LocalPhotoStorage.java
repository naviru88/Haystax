package com.haystax.owner.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Local-disk {@link PhotoStorage} (decision D-PHOTO).
 * <p>
 * Directory: {@code HAYSTAX_UPLOAD_DIR} (default {@code ${java.io.tmpdir}/haystax-uploads}).
 * Files are stored as {@code {listingId}/{uuid}.{ext}}; file names are always
 * server-generated — client-supplied names are never used and cannot escape the
 * upload directory (path-traversal rejected).
 */
@Component
public class LocalPhotoStorage implements PhotoStorage {

    private final Path root;

    public LocalPhotoStorage(
            @Value("${HAYSTAX_UPLOAD_DIR:${java.io.tmpdir}/haystax-uploads}") String uploadDir) {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Override
    public String save(UUID listingId, String extension, InputStream data) throws IOException {
        Path listingDir = root.resolve(listingId.toString()).normalize();
        if (!listingDir.startsWith(root)) {
            throw new IOException("Invalid listing id for storage");
        }
        Files.createDirectories(listingDir);
        String fileName = UUID.randomUUID() + "." + extension;
        Path target = listingDir.resolve(fileName).normalize();
        if (!target.startsWith(listingDir)) {
            throw new IOException("Invalid storage target");
        }
        try (InputStream in = data) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
        return listingId + "/" + fileName;
    }

    @Override
    public void delete(String storagePath) {
        try {
            Path file = resolve(storagePath);
            Files.deleteIfExists(file);
        } catch (IOException e) {
            // D-PHOTO: a missing/unreadable file is not an error for delete.
        }
    }

    @Override
    public Resource load(String storagePath) {
        Path file = resolve(storagePath);
        return new FileSystemResource(file);
    }

    private Path resolve(String storagePath) {
        Path p = root.resolve(storagePath).normalize();
        if (!p.startsWith(root)) {
            throw new IllegalArgumentException("Storage path escapes the upload directory");
        }
        return p;
    }
}
