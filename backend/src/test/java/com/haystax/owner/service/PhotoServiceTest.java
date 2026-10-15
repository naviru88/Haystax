package com.haystax.owner.service;

import com.haystax.owner.dto.ErrorResponseDto.FieldErrorDto;
import com.haystax.owner.dto.ListingPhotoDto;
import com.haystax.owner.entity.ProfileEntity;
import com.haystax.owner.exception.OwnerApiException;
import com.haystax.owner.repository.ListingWriteRepository;
import com.haystax.owner.repository.ProfileRepository;
import com.haystax.owner.storage.LocalPhotoStorage;
import com.haystax.owner.storage.PhotoStorage;
import com.haystax.owner.util.CurrentUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * W2-C3 tests for photo upload / delete / content (D-PHOTOLIMITS).
 * Repository + profile repo are mocked; LocalPhotoStorage uses a real temp dir.
 */
class PhotoServiceTest {

    @TempDir
    Path tempDir;

    @Mock
    private ListingWriteRepository repository;
    @Mock
    private ProfileRepository profileRepository;

    private PhotoStorage storage;
    private PhotoService service;
    private UUID ownerId;
    private UUID listingId;
    private UUID otherListingId;

    private static final byte[] PNG_MAGIC = {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0
    };
    private static final byte[] TEXT_BYTES = "this is not an image".getBytes();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        storage = new LocalPhotoStorage(tempDir.toString());
        service = new PhotoService(new CurrentUser(), profileRepository, repository, storage);
        ownerId = UUID.randomUUID();
        listingId = UUID.randomUUID();
        otherListingId = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(ownerId.toString(), null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private ProfileEntity ownerProfile(boolean owner, boolean suspended) {
        ProfileEntity p = new ProfileEntity();
        p.setId(ownerId);
        p.setDisplayName("Owner");
        p.setOwner(owner);
        p.setSuspended(suspended);
        return p;
    }

    private void stubOwnerAndOwnership() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, false)));
        when(repository.findOwned(listingId, ownerId)).thenReturn(Optional.of(
                listingRow(listingId)));
        when(repository.findOwned(otherListingId, ownerId)).thenReturn(Optional.empty());
    }

    private ListingWriteRepository.ListingRow listingRow(UUID id) {
        return new ListingWriteRepository.ListingRow(
                id, ownerId, "Sunny Boarding House", "A lovely place to stay.",
                "12 Lake Road", null, "Kandy", "Kandy", "Near Temple",
                new com.haystax.owner.dto.LocationDto(7.2906, 80.6337),
                new java.math.BigDecimal("15000.00"), "LKR",
                com.haystax.owner.dto.GenderPolicy.any, 5, 3,
                com.haystax.owner.dto.ListingStatus.draft, null, null, null,
                OffsetDateTime.now(), OffsetDateTime.now());
    }

    private MockMultipartFile pngFile(String name, byte[] content, String contentType) {
        return new MockMultipartFile("file", name, contentType, content);
    }

    // ------------------------------------------------------------------
    // upload
    // ------------------------------------------------------------------

    @Test
    void uploadRejectsWrongMimeWith422() {
        stubOwnerAndOwnership();
        MockMultipartFile file = pngFile("photo.txt", TEXT_BYTES, "text/plain");
        OwnerApiException ex = assertThrows(OwnerApiException.class,
                () -> service.upload(listingId, file, false, null, 0));
        assertEquals(422, ex.status().value());
        assertTrue(ex.fieldErrors().stream().anyMatch(fe -> fe.field().equals("file")));
    }

    @Test
    void uploadRejectsPngNameWithTextContent() {
        stubOwnerAndOwnership();
        // Correct Content-Type and extension, but the bytes are text -> magic-byte mismatch.
        MockMultipartFile file = pngFile("photo.png", TEXT_BYTES, "image/png");
        OwnerApiException ex = assertThrows(OwnerApiException.class,
                () -> service.upload(listingId, file, false, null, 0));
        assertEquals(422, ex.status().value());
        assertTrue(ex.fieldErrors().stream().anyMatch(fe -> fe.field().equals("file")));
    }

    @Test
    void uploadRejectsFileOver5Mb() {
        stubOwnerAndOwnership();
        byte[] big = new byte[6 * 1024 * 1024];
        MockMultipartFile file = pngFile("big.png", big, "image/png");
        OwnerApiException ex = assertThrows(OwnerApiException.class,
                () -> service.upload(listingId, file, false, null, 0));
        assertEquals(422, ex.status().value());
    }

    @Test
    void uploadRejects11thPhotoWith409() {
        stubOwnerAndOwnership();
        when(repository.countPhotos(listingId)).thenReturn(10);
        MockMultipartFile file = pngFile("photo.png", PNG_MAGIC, "image/png");
        OwnerApiException ex = assertThrows(OwnerApiException.class,
                () -> service.upload(listingId, file, false, null, 0));
        assertEquals(409, ex.status().value());
    }

    @Test
    void secondPrimaryLeavesExactlyOnePrimary() {
        stubOwnerAndOwnership();
        when(repository.countPhotos(listingId)).thenReturn(1);
        UUID firstId = UUID.randomUUID();
        when(repository.findPhoto(any(), eq(listingId))).thenReturn(Optional.of(
                photoDto(firstId, listingId, "p1.png", true)));
        when(repository.insertPhoto(eq(listingId), any(), any(), anyInt(), eq(true)))
                .thenAnswer(inv -> {
                    UUID newId = UUID.randomUUID();
                    return photoDto(newId, listingId,
                            inv.getArgument(1), true);
                });

        MockMultipartFile file = pngFile("photo.png", PNG_MAGIC, "image/png");
        ListingPhotoDto saved = service.upload(listingId, file, true, null, 0);

        assertNotNull(saved);
        assertTrue(saved.isPrimary());
        // clearPrimary must be called so only one primary remains (partial unique index).
        verify(repository).clearPrimary(listingId);
    }

    @Test
    void uploadFailsForForeignListingWith404() {
        stubOwnerAndOwnership();
        MockMultipartFile file = pngFile("photo.png", PNG_MAGIC, "image/png");
        OwnerApiException ex = assertThrows(OwnerApiException.class,
                () -> service.upload(otherListingId, file, false, null, 0));
        assertEquals(404, ex.status().value());
    }

    @Test
    void suspendedOwnerCannotUpload() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, true)));
        MockMultipartFile file = pngFile("photo.png", PNG_MAGIC, "image/png");
        OwnerApiException ex = assertThrows(OwnerApiException.class,
                () -> service.upload(listingId, file, false, null, 0));
        assertEquals(403, ex.status().value());
    }

    // ------------------------------------------------------------------
    // delete
    // ------------------------------------------------------------------

    @Test
    void deleteOfAnotherListingsPhotoIs404AndFileUntouched() throws IOException {
        stubOwnerAndOwnership();
        // A real file stored for the listing, and a photo row belonging to a foreign listing.
        String stored = storage.save(listingId, "png", new java.io.ByteArrayInputStream(PNG_MAGIC));
        when(repository.findPhoto(any(), eq(listingId))).thenReturn(Optional.empty());
        when(repository.findPhoto(any(), eq(otherListingId))).thenReturn(Optional.of(
                photoDto(UUID.randomUUID(), otherListingId, stored, false)));

        UUID foreignPhoto = UUID.randomUUID();
        OwnerApiException ex = assertThrows(OwnerApiException.class,
                () -> service.delete(otherListingId, foreignPhoto));
        assertEquals(404, ex.status().value());

        // The stored file must still exist.
        Path p = tempDir.resolve(stored);
        assertTrue(Files.exists(p), "file must be untouched after 404 delete");
        verify(repository, never()).deletePhoto(any(), any());
    }

    @Test
    void deleteRemovesRowAndFile() throws IOException {
        stubOwnerAndOwnership();
        String stored = storage.save(listingId, "png", new java.io.ByteArrayInputStream(PNG_MAGIC));
        UUID photoId = UUID.randomUUID();
        when(repository.findPhoto(photoId, listingId)).thenReturn(Optional.of(
                photoDto(photoId, listingId, stored, false)));
        when(repository.deletePhoto(photoId, listingId)).thenReturn(true);

        service.delete(listingId, photoId);

        verify(repository).deletePhoto(photoId, listingId);
        assertFalse(Files.exists(tempDir.resolve(stored)), "file must be deleted");
    }

    // ------------------------------------------------------------------
    // path traversal
    // ------------------------------------------------------------------

    @Test
    void traversalStoragePathCannotEscapeUploadDir() {
        stubOwnerAndOwnership();
        when(repository.findPhoto(any(), eq(listingId))).thenReturn(Optional.of(
                photoDto(UUID.randomUUID(), listingId, "../../../etc/passwd", false)));
        // load() must reject a traversal path.
        assertThrows(IllegalArgumentException.class,
                () -> service.content(listingId, UUID.randomUUID()));
    }

    // ------------------------------------------------------------------
    // content
    // ------------------------------------------------------------------

    @Test
    void contentForForeignListingIs404() {
        stubOwnerAndOwnership();
        when(repository.findPhoto(any(), eq(otherListingId))).thenReturn(Optional.of(
                photoDto(UUID.randomUUID(), otherListingId, "x.png", false)));
        OwnerApiException ex = assertThrows(OwnerApiException.class,
                () -> service.content(otherListingId, UUID.randomUUID()));
        assertEquals(404, ex.status().value());
    }

    @Test
    void contentReturnsStoredResource() throws IOException {
        stubOwnerAndOwnership();
        String stored = storage.save(listingId, "png", new java.io.ByteArrayInputStream(PNG_MAGIC));
        UUID photoId = UUID.randomUUID();
        when(repository.findPhoto(photoId, listingId)).thenReturn(Optional.of(
                photoDto(photoId, listingId, stored, false)));

        PhotoService.PhotoContent content = service.content(listingId, photoId);

        assertEquals("image/png", content.contentType());
        assertTrue(content.resource().exists());
    }

    private ListingPhotoDto photoDto(UUID id, UUID listingId, String storagePath,
                                     boolean isPrimary) {
        return new ListingPhotoDto(id, listingId, storagePath, "alt", 0,
                isPrimary, false, OffsetDateTime.now());
    }
}
