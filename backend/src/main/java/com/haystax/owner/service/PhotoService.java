package com.haystax.owner.service;

import com.haystax.owner.dto.ErrorResponseDto.FieldErrorDto;
import com.haystax.owner.dto.ListingPhotoDto;
import com.haystax.owner.entity.ProfileEntity;
import com.haystax.owner.exception.OwnerApiException;
import com.haystax.owner.repository.ListingWriteRepository;
import com.haystax.owner.repository.ProfileRepository;
import com.haystax.owner.storage.PhotoStorage;
import com.haystax.owner.util.CurrentUser;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;

/**
 * Photo upload / delete / content for the owner slice (W2-C3).
 * <p>
 * D-PHOTOLIMITS: allowed MIME {@code image/jpeg|png|webp}, max 5 MB, max 10
 * photos per listing, magic bytes verified — never just the Content-Type header.
 * D-PHOTO: local disk behind {@link PhotoStorage} (Supabase Storage is a Week 4
 * swap); {@code storage_path} = {@code {listing_id}/{uuid}.{ext}}.
 */
@Service
public class PhotoService {

    private static final long MAX_PHOTO_BYTES = 5L * 1024 * 1024; // 5 MB
    private static final int MAX_PHOTOS_PER_LISTING = 10;

    private final CurrentUser currentUser;
    private final ProfileRepository profileRepository;
    private final ListingWriteRepository repository;
    private final PhotoStorage photoStorage;

    public PhotoService(CurrentUser currentUser,
                        ProfileRepository profileRepository,
                        ListingWriteRepository repository,
                        PhotoStorage photoStorage) {
        this.currentUser = currentUser;
        this.profileRepository = profileRepository;
        this.repository = repository;
        this.photoStorage = photoStorage;
    }

    /** {@code POST /api/owner/listings/{id}/photos}. */
    @Transactional
    public ListingPhotoDto upload(UUID listingId, MultipartFile file,
                                  Boolean isPrimary, String altText, Integer sortOrder) {
        requireOwnerAndNotSuspended();
        requireOwnsListing(listingId);

        if (file == null || file.isEmpty()) {
            throw new OwnerApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "One or more fields are invalid.",
                    List.of(new FieldErrorDto("file", "A photo file is required.")));
        }
        if (file.getSize() > MAX_PHOTO_BYTES) {
            throw new OwnerApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Photo is larger than 5 MB.");
        }
        if (altText != null && altText.length() > 500) {
            throw new OwnerApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "One or more fields are invalid.",
                    List.of(new FieldErrorDto("alt_text", "Alt text must be at most 500 characters.")));
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType();
        String ext;
        switch (contentType.toLowerCase()) {
            case "image/jpeg" -> ext = "jpg";
            case "image/png" -> ext = "png";
            case "image/webp" -> ext = "webp";
            default -> throw new OwnerApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "One or more fields are invalid.",
                    List.of(new FieldErrorDto("file", "Only JPEG, PNG and WebP images are allowed.")));
        }

        if (repository.countPhotos(listingId) >= MAX_PHOTOS_PER_LISTING) {
            throw new OwnerApiException(HttpStatus.CONFLICT,
                    "A listing can have at most 10 photos.");
        }

        // Verify magic bytes, not just the Content-Type header (D-PHOTOLIMITS).
        byte[] magic;
        try (InputStream in = file.getInputStream()) {
            magic = in.readNBytes(12);
        } catch (IOException e) {
            throw new OwnerApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Could not read the uploaded file.");
        }
        if (!matchesMagic(magic, ext)) {
            throw new OwnerApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "One or more fields are invalid.",
                    List.of(new FieldErrorDto("file",
                            "File content does not match the declared image type.")));
        }

        String storagePath;
        try {
            storagePath = photoStorage.save(listingId, ext, file.getInputStream());
        } catch (IOException e) {
            throw new OwnerApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not store the photo.");
        }

        boolean primary = Boolean.TRUE.equals(isPrimary);
        if (primary) {
            repository.clearPrimary(listingId);
        }
        ListingPhotoDto saved;
        try {
            saved = repository.insertPhoto(listingId, storagePath, altText,
                    sortOrder == null ? 0 : sortOrder, primary);
        } catch (RuntimeException e) {
            // If the DB row fails, do not leave the stored file behind.
            photoStorage.delete(storagePath);
            throw e;
        }
        return saved;
    }

    /** {@code DELETE /api/owner/listings/{id}/photos/{photoId}}. */
    @Transactional
    public void delete(UUID listingId, UUID photoId) {
        requireOwnerAndNotSuspended();
        requireOwnsListing(listingId);
        ListingPhotoDto photo = repository.findPhoto(photoId, listingId)
                .orElseThrow(() -> notFound());
        repository.deletePhoto(photoId, listingId);
        photoStorage.delete(photo.storagePath());
    }

    /** {@code GET /api/owner/listings/{id}/photos/{photoId}/content} (CC-2). */
    public PhotoContent content(UUID listingId, UUID photoId) {
        requireOwner();
        requireOwnsListing(listingId);
        ListingPhotoDto photo = repository.findPhoto(photoId, listingId)
                .orElseThrow(() -> notFound());
        Resource resource = photoStorage.load(photo.storagePath());
        return new PhotoContent(resource, contentTypeFor(photo.storagePath()));
    }

    public record PhotoContent(Resource resource, String contentType) {
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private void requireOwnerAndNotSuspended() {
        ProfileEntity p = requireOwner();
        if (p.isSuspended()) {
            throw new OwnerApiException(HttpStatus.FORBIDDEN, "Account suspended");
        }
    }

    private ProfileEntity requireOwner() {
        ProfileEntity p = profileRepository.findById(currentUser.id())
                .orElseThrow(() -> new OwnerApiException(HttpStatus.FORBIDDEN,
                        "No profile found for this account."));
        if (!p.isOwner()) {
            throw new OwnerApiException(HttpStatus.FORBIDDEN,
                    "Only owners can manage listings.");
        }
        return p;
    }

    private void requireOwnsListing(UUID listingId) {
        if (repository.findOwned(listingId, currentUser.id()).isEmpty()) {
            throw notFound();
        }
    }

    private OwnerApiException notFound() {
        return new OwnerApiException(HttpStatus.NOT_FOUND,
                "Listing or photo not found, or you do not own it.");
    }

    private static boolean matchesMagic(byte[] magic, String ext) {
        if (magic == null || magic.length < 12) {
            return false;
        }
        // JPEG: FF D8 FF
        if ("jpg".equals(ext)) {
            return (magic[0] & 0xFF) == 0xFF && (magic[1] & 0xFF) == 0xD8 && (magic[2] & 0xFF) == 0xFF;
        }
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if ("png".equals(ext)) {
            byte[] png = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
            for (int i = 0; i < png.length; i++) {
                if (magic[i] != png[i]) {
                    return false;
                }
            }
            return true;
        }
        // WebP: 'RIFF' .... 'WEBP'
        if ("webp".equals(ext)) {
            return magic[0] == 'R' && magic[1] == 'I' && magic[2] == 'F' && magic[3] == 'F'
                    && magic[8] == 'W' && magic[9] == 'E' && magic[10] == 'B' && magic[11] == 'P';
        }
        return false;
    }

    private static String contentTypeFor(String storagePath) {
        String lower = storagePath.toLowerCase();
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        if (lower.endsWith(".webp")) {
            return "image/webp";
        }
        return "image/jpeg";
    }
}
