package com.haystax.owner.service;

import com.haystax.owner.dto.AmenityDto;
import com.haystax.owner.dto.ErrorResponseDto.FieldErrorDto;
import com.haystax.owner.dto.GenderPolicy;
import com.haystax.owner.dto.ListingDto;
import com.haystax.owner.dto.ListingPhotoDto;
import com.haystax.owner.dto.ListingRuleDto;
import com.haystax.owner.dto.ListingRuleWriteDto;
import com.haystax.owner.dto.ListingStatus;
import com.haystax.owner.dto.ListingWriteDto;
import com.haystax.owner.dto.LocationDto;
import com.haystax.owner.entity.ProfileEntity;
import com.haystax.owner.exception.OwnerApiException;
import com.haystax.owner.mapper.ListingMapper;
import com.haystax.owner.repository.ListingWriteRepository;
import com.haystax.owner.repository.ProfileRepository;
import com.haystax.owner.util.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Listing create / list / get / update / publish for the owner slice.
 * <p>
 * Ownership: {@code owner_id} is ALWAYS the caller (from the token), never from
 * the request body. Every read/update is scoped {@code WHERE id = :id AND
 * owner_id = :owner_id} — Spring enforces ownership because the DB owner role
 * bypasses RLS (DB notes issue #2).
 * <p>
 * Decisions: D-NOTFOUND (foreign/unknown id → 404, no existence leak), D-SUSPENDED
 * (writes → 403), D-EDIT (removed → 409), D-PUBLISH (draft/paused → pending_review).
 */
@Service
public class ListingWriteService {

    private static final int MAX_RULES_DUPLICATES = 0;
    private static final int PHOTO_LIMIT = 10;

    private final CurrentUser currentUser;
    private final ProfileRepository profileRepository;
    private final ListingWriteRepository repository;
    private final ListingMapper mapper;

    public ListingWriteService(CurrentUser currentUser,
                               ProfileRepository profileRepository,
                               ListingWriteRepository repository,
                               ListingMapper mapper) {
        this.currentUser = currentUser;
        this.profileRepository = profileRepository;
        this.repository = repository;
        this.mapper = mapper;
    }

    /** {@code GET /api/owner/listings} — own listings, created_at desc. */
    public List<ListingDto> listOwn() {
        requireOwner();
        return repository.findOwnedAll(currentUser.id()).stream()
                .map(this::toDto)
                .toList();
    }

    /** {@code POST /api/owner/listings} — create draft; status/owner_id from server. */
    @Transactional
    public ListingDto create(ListingWriteDto dto) {
        requireOwnerAndNotSuspended();
        List<FieldErrorDto> errors = validate(dto);
        throwIfErrors(errors);

        UUID ownerId = currentUser.id();
        UUID listingId = repository.insertListing(
                ownerId, dto.title(), dto.description(), dto.addressLine1(),
                dto.addressLine2(), dto.city(), dto.district(), dto.locationLabel(),
                dto.location(), dto.priceAmount(), currency(dto), gender(dto),
                dto.totalSlots(), dto.availableSlots());

        applyAmenities(listingId, dto.amenityIds());
        applyRules(listingId, dto.rules());

        return findOwned(listingId, ownerId);
    }

    /** {@code GET /api/owner/listings/{id}} — own only; not-found-or-not-yours → 404. */
    public ListingDto get(UUID id) {
        requireOwner();
        return findOwned(id, currentUser.id());
    }

    /** {@code PUT /api/owner/listings/{id}} — status unchanged by an edit (D-EDIT). */
    @Transactional
    public ListingDto update(UUID id, ListingWriteDto dto) {
        requireOwnerAndNotSuspended();
        List<FieldErrorDto> errors = validate(dto);
        throwIfErrors(errors);

        UUID ownerId = currentUser.id();
        ListingWriteRepository.ListingRow existing = repository.findOwned(id, ownerId)
                .orElseThrow(() -> notFound());
        if (existing.status() == ListingStatus.removed) {
            throw new OwnerApiException(HttpStatus.CONFLICT,
                    "A removed listing cannot be edited.");
        }

        boolean updated = repository.updateListing(
                id, ownerId, dto.title(), dto.description(), dto.addressLine1(),
                dto.addressLine2(), dto.city(), dto.district(), dto.locationLabel(),
                dto.location(), dto.priceAmount(), currency(dto), gender(dto),
                dto.totalSlots(), dto.availableSlots());
        if (!updated) {
            throw notFound();
        }

        applyAmenities(id, dto.amenityIds());
        applyRules(id, dto.rules());

        return findOwned(id, ownerId);
    }

    /** {@code POST /api/owner/listings/{id}/publish} — draft/paused → pending_review (D-PUBLISH). */
    @Transactional
    public ListingDto publish(UUID id) {
        requireOwnerAndNotSuspended();

        UUID ownerId = currentUser.id();
        ListingWriteRepository.ListingRow existing = repository.findOwned(id, ownerId)
                .orElseThrow(() -> notFound());

        if (existing.status() != ListingStatus.draft
                && existing.status() != ListingStatus.paused) {
            throw new OwnerApiException(HttpStatus.CONFLICT,
                    "Only draft or paused listings can be submitted for publication.");
        }

        List<FieldErrorDto> missing = completenessErrors(id, existing);
        throwIfErrors(missing);

        repository.updateStatus(id, ownerId, ListingStatus.pending_review);
        return findOwned(id, ownerId);
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private ListingDto findOwned(UUID id, UUID ownerId) {
        ListingWriteRepository.ListingRow row = repository.findOwned(id, ownerId)
                .orElseThrow(() -> notFound());
        return toDto(row);
    }

    private ListingDto toDto(ListingWriteRepository.ListingRow row) {
        List<AmenityDto> amenities =
                repository.findAmenitiesByIds(repository.findAmenityIds(row.id()));
        List<ListingRuleDto> rules = repository.findRules(row.id());
        List<ListingPhotoDto> photos = repository.findPhotos(row.id());
        return mapper.toDto(row, amenities, rules, photos);
    }

    private void requireOwner() {
        if (!currentProfile().isOwner()) {
            throw new OwnerApiException(HttpStatus.FORBIDDEN,
                    "Only owners can manage listings.");
        }
    }

    private void requireOwnerAndNotSuspended() {
        requireOwner();
        if (currentProfile().isSuspended()) {
            throw new OwnerApiException(HttpStatus.FORBIDDEN, "Account suspended");
        }
    }

    private ProfileEntity currentProfile() {
        return profileRepository.findById(currentUser.id())
                .orElseThrow(() -> new OwnerApiException(HttpStatus.FORBIDDEN,
                        "No profile found for this account."));
    }

    private String currency(ListingWriteDto dto) {
        return dto.currencyCode() == null || dto.currencyCode().isBlank()
                ? "LKR" : dto.currencyCode();
    }

    private GenderPolicy gender(ListingWriteDto dto) {
        return dto.genderPolicy() == null ? GenderPolicy.any : dto.genderPolicy();
    }

    private OwnerApiException notFound() {
        return new OwnerApiException(HttpStatus.NOT_FOUND,
                "Listing not found or you do not own it.");
    }

    private void throwIfErrors(List<FieldErrorDto> errors) {
        if (!errors.isEmpty()) {
            throw new OwnerApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "One or more fields are invalid.", errors);
        }
    }

    private void applyAmenities(UUID listingId, List<UUID> amenityIds) {
        if (amenityIds == null || amenityIds.isEmpty()) {
            repository.replaceAmenities(listingId, List.of());
            return;
        }
        for (UUID aid : amenityIds) {
            if (!repository.amenityExistsAndActive(aid)) {
                throw new OwnerApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "One or more fields are invalid.",
                        List.of(new FieldErrorDto("amenity_ids",
                                "Unknown or inactive amenity id: " + aid)));
            }
        }
        repository.replaceAmenities(listingId, new ArrayList<>(amenityIds));
    }

    private void applyRules(UUID listingId, List<ListingRuleWriteDto> rules) {
        if (rules == null || rules.isEmpty()) {
            repository.replaceRules(listingId, List.of());
            return;
        }
        List<ListingWriteRepository.ListingRuleRow> rows = rules.stream()
                .map(r -> new ListingWriteRepository.ListingRuleRow(
                        r.ruleCode(), r.label(), r.isAllowed(), r.notes()))
                .toList();
        repository.replaceRules(listingId, rows);
    }

    // ------------------------------------------------------------------
    // validation (service layer, field-level 422)
    // ------------------------------------------------------------------

    private List<FieldErrorDto> validate(ListingWriteDto dto) {
        List<FieldErrorDto> errors = new ArrayList<>();

        if (dto.title() == null || dto.title().isBlank()) {
            errors.add(new FieldErrorDto("title", "Title is required."));
        } else if (dto.title().length() < 5 || dto.title().length() > 160) {
            errors.add(new FieldErrorDto("title", "Title must be 5–160 characters."));
        }
        if (dto.description() == null || dto.description().isBlank()) {
            errors.add(new FieldErrorDto("description", "Description is required."));
        }
        if (dto.addressLine1() == null || dto.addressLine1().isBlank()) {
            errors.add(new FieldErrorDto("address_line_1", "Address line 1 is required."));
        }
        if (dto.city() == null || dto.city().isBlank()) {
            errors.add(new FieldErrorDto("city", "City is required."));
        }
        if (dto.priceAmount() == null || dto.priceAmount().signum() < 0) {
            errors.add(new FieldErrorDto("price_amount", "Price must be >= 0."));
        }
        if (dto.currencyCode() != null && !dto.currencyCode().isBlank()
                && !dto.currencyCode().matches("[A-Za-z]{3}")) {
            errors.add(new FieldErrorDto("currency_code", "Currency code must be 3 letters."));
        }
        if (dto.genderPolicy() != null
                && dto.genderPolicy() != GenderPolicy.any
                && dto.genderPolicy() != GenderPolicy.female_only
                && dto.genderPolicy() != GenderPolicy.male_only) {
            errors.add(new FieldErrorDto("gender_policy", "Invalid gender policy."));
        }
        if (dto.totalSlots() == null || dto.totalSlots() <= 0) {
            errors.add(new FieldErrorDto("total_slots", "Total slots must be > 0."));
        }
        if (dto.availableSlots() == null || dto.availableSlots() < 0) {
            errors.add(new FieldErrorDto("available_slots", "Available slots must be >= 0."));
        } else if (dto.totalSlots() != null && dto.availableSlots() > dto.totalSlots()) {
            errors.add(new FieldErrorDto("available_slots",
                    "Available slots cannot exceed total slots."));
        }
        LocationDto loc = dto.location();
        if (loc == null) {
            errors.add(new FieldErrorDto("location", "Location coordinates are required."));
        } else {
            if (loc.lat() < -90.0 || loc.lat() > 90.0) {
                errors.add(new FieldErrorDto("location.lat", "Latitude must be in [-90, 90]."));
            }
            if (loc.lng() < -180.0 || loc.lng() > 180.0) {
                errors.add(new FieldErrorDto("location.lng", "Longitude must be in [-180, 180]."));
            }
        }

        if (dto.rules() != null) {
            Set<String> seen = new HashSet<>();
            for (ListingRuleWriteDto r : dto.rules()) {
                if (r.ruleCode() == null || r.ruleCode().isBlank()) {
                    errors.add(new FieldErrorDto("rules", "Each rule needs a rule_code."));
                } else if (!seen.add(r.ruleCode())) {
                    errors.add(new FieldErrorDto("rules.rule_code",
                            "Rule codes must be unique within the request: " + r.ruleCode()));
                }
            }
        }

        return errors;
    }

    private List<FieldErrorDto> completenessErrors(UUID listingId,
                                                   ListingWriteRepository.ListingRow row) {
        List<FieldErrorDto> errors = new ArrayList<>();
        if (row.title() == null || row.title().isBlank()) {
            errors.add(new FieldErrorDto("title", "Title is required to publish."));
        }
        if (row.description() == null || row.description().isBlank()) {
            errors.add(new FieldErrorDto("description", "Description is required to publish."));
        }
        if (row.addressLine1() == null || row.addressLine1().isBlank()) {
            errors.add(new FieldErrorDto("address_line_1", "Address is required to publish."));
        }
        if (row.city() == null || row.city().isBlank()) {
            errors.add(new FieldErrorDto("city", "City is required to publish."));
        }
        if (row.priceAmount() == null) {
            errors.add(new FieldErrorDto("price_amount", "Price is required to publish."));
        }
        if (row.totalSlots() <= 0) {
            errors.add(new FieldErrorDto("total_slots", "Total slots are required to publish."));
        }
        if (row.location() == null) {
            errors.add(new FieldErrorDto("location", "Location coordinates are required to publish."));
        }
        if (repository.findAmenityIds(listingId).isEmpty()) {
            errors.add(new FieldErrorDto("amenities", "At least one amenity is required."));
        }
        if (repository.countPhotos(listingId) == 0) {
            errors.add(new FieldErrorDto("photos", "At least one photo is required."));
        }
        return errors;
    }
}
