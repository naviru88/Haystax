package com.haystax.owner.storage;

import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

/**
 * Photo persistence behind an interface so Week 2-3 uses local disk
 * ({@link LocalPhotoStorage}) and Week 4 can swap in Supabase Storage
 * (decision D-PHOTO).
 */
public interface PhotoStorage {

    /**
     * Persist a photo for a listing. Implementations must generate the file
     * name themselves (never trust client filenames — D-PHOTOLIMITS).
     *
     * @return the storage path, e.g. {@code {listingId}/{uuid}.{ext}}
     */
    String save(UUID listingId, String extension, InputStream data) throws IOException;

    /**
     * Delete a stored photo. A missing file is not an error.
     */
    void delete(String storagePath);

    /**
     * Load a stored photo as a resource.
     */
    Resource load(String storagePath);
}
