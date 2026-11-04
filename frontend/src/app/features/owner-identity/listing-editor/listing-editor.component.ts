import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators,
} from '@angular/forms';

import { OWNER_API } from '../services/owner-api.interface';
import { Amenity, ListingPhoto, ListingRuleWrite, ListingWrite, OwnerListing } from '../models/owner-listing.model';
import { OwnerUser } from '../models/owner-user.model';
import { ApiError, toApiError } from '../services/api-error';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonCardComponent } from '../../../shared/components/skeleton-card/skeleton-card.component';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';

/**
 * Listing Editor — W3-C3 [MOWN-01][MOWN-03][MOWN-04].
 * Routes /owner/listings/new (create) and /owner/listings/:id (edit). Page state:
 * loading | ready | notFound | forbidden | suspended | readOnly | error.
 *
 * - The form has EXACTLY the contract controls; owner_id and status do not exist in the
 *   form or the payload (server-decided). [AGENTS-W3 W3-C3.3]
 * - Server 422 fieldErrors map onto matching controls; unknown fields go to a form-level list.
 * - Photos (edit mode only): client pre-checks per D-LIMITS (jpeg/png/webp, ≤5MB, ≤10),
 *   upload shows progress % then success/error, delete asks for confirmation, thumbnails via
 *   getPhotoBlob -> object URLs (revoked on destroy), is_approved shown as a read-only badge.
 * - Publish (draft/paused only): saves pending edits first, then publishListing; 422 shows
 *   the readable "Missing…" list. removed/suspended modes disable the whole form.
 * [AGENTS-W3 W3-C3][page contract §7]
 */
export type EditorState = 'loading' | 'ready' | 'notFound' | 'forbidden' | 'suspended' | 'readOnly' | 'error';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;      // D-LIMITS
export const MAX_PHOTOS = 10;                          // D-LIMITS
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']; // D-LIMITS

@Component({
  selector: 'app-listing-editor',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, PageHeaderComponent, SkeletonCardComponent, StateViewComponent],
  templateUrl: './listing-editor.component.html',
})
export class ListingEditorComponent implements OnInit, OnDestroy {
  private readonly api = inject(OWNER_API);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly state = signal<EditorState>('loading');
  readonly isNew = signal(false);
  readonly listingId = signal<string | null>(null);

  /** Server-decided profile; only used to gate suspended/read-only display. */
  readonly me = signal<OwnerUser | undefined>(undefined);
  readonly listing = signal<OwnerListing | undefined>(undefined);
  readonly amenities = signal<Amenity[]>([]);

  readonly errorMessage = signal('');
  readonly formError = signal<string[]>([]);           // form-level 422 messages (unknown fields)

  readonly saving = signal(false);
  readonly savedAt = signal<string | null>(null);
  readonly dirtyLeaving = signal(false);

  readonly publishSaving = signal(false);
  readonly publishMissing = signal<string[]>([]);
  readonly publishMessage = signal<string | null>(null);

  // Photo upload state per file in flight.
  readonly uploads = signal<Record<string, { percent: number; error: string | null; done: ListingPhoto | null }>>({});
  readonly deleteTarget = signal<ListingPhoto | null>(null);
  readonly deleting = signal(false);
  readonly thumbnails = signal<Record<string, string>>({});
  private readonly objectUrls = new Map<string, string>();
  private uploadId = 0;

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(160)]],
    description: ['', [Validators.required]],
    address_line_1: ['', [Validators.required]],
    address_line_2: [''],
    city: ['', [Validators.required]],
    district: [''],
    location_label: [''],
    lat: [null as number | null, [Validators.pattern(/^-?\d+(\.\d+)?$/), Validators.min(-90), Validators.max(90)]],
    lng: [null as number | null, [Validators.pattern(/^-?\d+(\.\d+)?$/), Validators.min(-180), Validators.max(180)]],
    price_amount: [null as number | null, [Validators.required, Validators.min(0)]],
    currency_code: ['LKR', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
    gender_policy: ['any'],
    total_slots: [null as number | null, [Validators.required, Validators.min(1)]],
    available_slots: [null as number | null, [Validators.required, Validators.min(0)]],
    amenity_ids: this.fb.array<boolean>([]),
    rules: this.fb.array<FormGroup>([]),
  }, { validators: this.slotsRangeValidator });

  readonly ruleControls = computed(() => this.form.get('rules') as FormArray);

  get c(): Record<string, AbstractControl> {
    const g = this.form;
    return {
      title: g.get('title')!,
      description: g.get('description')!,
      address_line_1: g.get('address_line_1')!,
      address_line_2: g.get('address_line_2')!,
      city: g.get('city')!,
      district: g.get('district')!,
      location_label: g.get('location_label')!,
      lat: g.get('lat')!,
      lng: g.get('lng')!,
      price_amount: g.get('price_amount')!,
      currency_code: g.get('currency_code')!,
      gender_policy: g.get('gender_policy')!,
      total_slots: g.get('total_slots')!,
      available_slots: g.get('available_slots')!,
    };
  }

  async ngOnInit(): Promise<void> {
    const raw = this.route.snapshot.paramMap.get('id');
    if (raw === 'new') {
      this.isNew.set(true);
      this.state.set('ready');
      return;
    }
    if (!raw) {
      this.notFoundState();
      return;
    }
    this.listingId.set(raw);
    await this.load(raw);
  }

  ngOnDestroy(): void {
    this.revokeAllThumbnails();
  }

  private async load(id: string): Promise<void> {
    this.state.set('loading');
    try {
      const [me, listing] = await Promise.all([this.api.getMe(), this.api.getListing(id)]);
      this.me.set(me);
      this.listing.set(listing);

      if (!me.is_owner && !me.is_suspended) {
        this.state.set('forbidden');          // guard normally redirects first
        return;
      }

      // Populate the form in every allowed state so read-only modes still show the data.
      await this.loadAmenities();
      this.populateForm(listing);

      if (me.is_suspended) {
        this.form.disable();                  // whole form disabled + banner [W3-C3.7]
        this.state.set('suspended');
        return;
      }
      if (listing.status === 'removed') {
        this.form.disable();                  // whole form disabled + moderation_note [W3-C3.7]
        this.state.set('readOnly');
        return;
      }

      this.state.set('ready');
      this.loadThumbnails(listing.photos);
    } catch (err) {
      const e = toApiError(err);
      if (e.kind === 'notfound') {
        this.notFoundState();
      } else {
        this.errorMessage.set(e.message || 'Could not load this listing.');
        this.state.set('error');
      }
    }
  }

  private notFoundState(): void {
    this.state.set('notFound');
    this.errorMessage.set('');
  }

  private async loadAmenities(): Promise<void> {
    try {
      this.amenities.set(await this.api.listAmenities());
    } catch {
      this.amenities.set([]);   // optional for the form; server still validates ids
    }
  }

  /** Map an existing listing onto the form (edit mode). */
  private populateForm(l: OwnerListing): void {
    this.form.patchValue({
      title: l.title,
      description: l.description,
      address_line_1: l.address_line_1,
      address_line_2: l.address_line_2 ?? '',
      city: l.city,
      district: l.district ?? '',
      location_label: l.location_label ?? '',
      lat: l.location?.lat ?? null,
      lng: l.location?.lng ?? null,
      price_amount: l.price_amount,
      currency_code: l.currency_code,
      gender_policy: l.gender_policy,
      total_slots: l.total_slots,
      available_slots: l.available_slots,
    });

    const amenityArr = this.form.get('amenity_ids') as FormArray;
    amenityArr.clear();
    const selected = new Set(l.amenities.map(a => a.id));
    for (const a of this.amenities()) amenityArr.push(this.fb.control(selected.has(a.id)));

    const rulesArr = this.form.get('rules') as FormArray;
    rulesArr.clear();
    for (const r of l.rules) rulesArr.push(this.newRule(r));
  }

  private newRule(r?: ListingRuleWrite): FormGroup {
    return this.fb.group({
      rule_code: [r?.rule_code ?? '', Validators.required],
      label: [r?.label ?? '', Validators.required],
      is_allowed: [r?.is_allowed ?? true],
      notes: [r?.notes ?? ''],
    });
  }

  addRule(): void {
    (this.form.get('rules') as FormArray).push(this.newRule());
  }

  removeRule(i: number): void {
    (this.form.get('rules') as FormArray).removeAt(i);
  }

  /** Cross-field: 0 <= available_slots <= total_slots. [W3-C3.3] */
  private slotsRangeValidator(g: AbstractControl): ValidationErrors | null {
    const total = g.get('total_slots')?.value;
    const available = g.get('available_slots')?.value;
    if (total === null || total === undefined || total === '' ||
        available === null || available === undefined || available === '') {
      return null;
    }
    const t = Number(total);
    const a = Number(available);
    if (Number.isNaN(t) || Number.isNaN(a)) return null;
    if (a < 0 || a > t) return { slotsRange: true };
    return null;
  }

  /** The write payload. owner_id and status NEVER appear here. [AGENTS-W3 W3-C3.3] */
  buildPayload(): ListingWrite {
    const v = this.form.getRawValue() as {
      title: string; description: string; address_line_1: string; address_line_2: string;
      city: string; district: string; location_label: string;
      lat: number | null; lng: number | null;
      price_amount: number | null; currency_code: string; gender_policy: string;
      total_slots: number | null; available_slots: number | null;
      amenity_ids: boolean[];
      rules: Array<{ rule_code: string; label: string; is_allowed: boolean; notes: string }>;
    };
    return {
      title: v.title,
      description: v.description,
      address_line_1: v.address_line_1,
      address_line_2: v.address_line_2 || undefined,
      city: v.city,
      district: v.district || undefined,
      location_label: v.location_label || undefined,
      location: (v.lat !== null && v.lng !== null)
        ? { lat: Number(v.lat), lng: Number(v.lng) }
        : null,
      price_amount: Number(v.price_amount),
      currency_code: v.currency_code,
      gender_policy: v.gender_policy as ListingWrite['gender_policy'],
      total_slots: Number(v.total_slots),
      available_slots: Number(v.available_slots),
      amenity_ids: (v.amenity_ids as boolean[]).map((sel, i) => (sel ? this.amenities()[i].id : null))
        .filter((x): x is string => x !== null),
      rules: (v.rules as Array<{ rule_code: string; label: string; is_allowed: boolean; notes?: string }>)
        .map(r => ({ rule_code: r.rule_code, label: r.label, is_allowed: r.is_allowed, notes: r.notes || undefined }))
        .filter(r => r.rule_code && r.label),
    };
  }

  /** Map a server 422 onto controls or a form-level list. [W3-C3.3] */
  private applyFieldErrors(fieldErrors: ApiError['fieldErrors']): void {
    const mapped: string[] = [];
    for (const fe of fieldErrors) {
      const control = this.form.get(fe.field);
      if (control) {
        control.setErrors({ server: fe.message });
        control.markAsTouched();
      } else {
        mapped.push(fe.message);
      }
    }
    this.formError.set(mapped);
  }

  private async save(): Promise<OwnerListing | null> {
    if (this.saving()) return null;
    this.formError.set([]);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return null;
    }
    this.saving.set(true);
    try {
      const payload = this.buildPayload();
      const saved = this.isNew()
        ? await this.api.createListing(payload)
        : await this.api.updateListing(this.listingId()!, payload);
      this.savedAt.set(new Date().toISOString());
      if (this.isNew()) {
        await this.router.navigate(['/owner/listings', saved.id]);   // create → edit mode
      }
      return saved;
    } catch (err) {
      const e = toApiError(err);
      if (e.kind === 'validation' && e.fieldErrors.length > 0) {
        this.applyFieldErrors(e.fieldErrors);
      } else if (e.kind === 'validation') {
        this.formError.set([e.message]);
      } else {
        this.formError.set([e.message || 'Could not save the listing.']);
      }
      return null;
    } finally {
      this.saving.set(false);
    }
  }

  async saveDraft(): Promise<void> {
    await this.save();
  }

  /** Publish: save pending edits first, then publishListing. [W3-C3.6] */
  async submitForPublication(): Promise<void> {
    if (this.publishSaving()) return;
    this.publishMissing.set([]);
    this.publishMessage.set(null);

    if (this.form.dirty || this.form.touched) {
      const saved = await this.save();
      if (!saved) return;                       // validation failed → user fixes fields
      this.listing.set(saved);
    }

    const id = this.listingId();
    if (!id) return;
    this.publishSaving.set(true);
    try {
      const updated = await this.api.publishListing(id);
      this.listing.set(updated);
      this.publishMessage.set(null);
      this.publishMissing.set([]);
      this.savedAt.set(new Date().toISOString());
    } catch (err) {
      const e = toApiError(err);
      if (e.kind === 'validation' && e.fieldErrors.length > 0) {
        this.publishMissing.set(e.fieldErrors.map(fe => fe.message));
      } else {
        this.publishMessage.set(e.message || 'Could not submit for publication.');
      }
    } finally {
      this.publishSaving.set(false);
    }
  }

  /** Unsaved-change protection: confirm before leaving a dirty form. [W3-C3.4] */
  onLeave(): void {
    if (this.form.dirty && !this.saving()) {
      this.dirtyLeaving.set(true);
      return;
    }
    void this.router.navigate(['/owner/dashboard']);
  }

  confirmLeave(): void {
    this.dirtyLeaving.set(false);
    void this.router.navigate(['/owner/dashboard']);
  }

  // ---------- Photos (edit mode only; create first, then upload) ----------
  isReadOnly(): boolean {
    return this.state() === 'suspended' || this.state() === 'readOnly';
  }

  canUpload(): boolean {
    if (this.isNew() || this.isReadOnly()) return false;
    return (this.listing()?.photos.length ?? 0) < MAX_PHOTOS;
  }

  photoCount(): number {
    return this.listing()?.photos.length ?? 0;
  }

  /** Client-side pre-checks per D-LIMITS with visible messages. [W3-C3.5] */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';                        // allow re-selecting the same file
    if (!file) return;
    const listingId = this.listingId();
    if (!listingId) return;

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      this.pushUploadError(file, `Only JPEG, PNG or WebP images are allowed (got ${file.type || 'unknown type'}).`);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      this.pushUploadError(file, 'Images must be 5 MB or smaller.');
      return;
    }
    if ((this.listing()?.photos.length ?? 0) >= MAX_PHOTOS) {
      this.pushUploadError(file, `A listing can have at most ${MAX_PHOTOS} photos.`);
      return;
    }

    const id = `upload-${++this.uploadId}`;
    this.uploads.update(u => ({ ...u, [id]: { percent: 0, error: null, done: null } }));

    this.api.uploadPhoto(listingId, file, {}).subscribe({
      next: ev => {
        if (ev.kind === 'progress') {
          this.uploads.update(u => ({ ...u, [id]: { ...u[id], percent: ev.percent } }));
        } else {
          const photo = ev.photo;
          this.uploads.update(u => ({ ...u, [id]: { percent: 100, error: null, done: photo } }));
          const l = this.listing();
          if (l) {
            this.listing.set({ ...l, photos: [...l.photos, photo] });
            void this.loadThumbnails([...l.photos, photo]);
          }
        }
      },
      error: err => {
        const e = toApiError(err);
        this.uploads.update(u => ({ ...u, [id]: { percent: 0, error: e.message || 'Upload failed.', done: null } }));
      },
    });
  }

  private pushUploadError(file: File, message: string): void {
    const id = `upload-err-${++this.uploadId}`;
    this.uploads.update(u => ({ ...u, [id]: { percent: 0, error: `${file.name}: ${message}`, done: null } }));
  }

  uploadsList(): Array<{ id: string; percent: number; error: string | null; done: ListingPhoto | null }> {
    return Object.entries(this.uploads()).map(([id, v]) => ({ id, ...v }));
  }

  clearUpload(id: string): void {
    this.uploads.update(u => {
      const next = { ...u };
      delete next[id];
      return next;
    });
  }

  requestDelete(photo: ListingPhoto): void {
    this.deleteTarget.set(photo);
  }

  closeDelete(): void {
    if (this.deleting()) return;
    this.deleteTarget.set(null);
  }

  async confirmDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target || this.deleting()) return;
    this.deleting.set(true);
    try {
      const listingId = this.listingId()!;
      await this.api.deletePhoto(listingId, target.id);
      const l = this.listing();
      if (l) {
        const photos = l.photos.filter(p => p.id !== target.id);
        this.listing.set({ ...l, photos });
        this.revokeThumbnail(target.id);
      }
      this.deleteTarget.set(null);
    } catch (err) {
      const e = toApiError(err);
      this.formError.set([e.message || 'Could not delete the photo.']);
    } finally {
      this.deleting.set(false);
    }
  }

  // ---------- Thumbnails (D-PHOTOVIEW) ----------
  async loadThumbnails(photos: ListingPhoto[]): Promise<void> {
    const next = { ...this.thumbnails() };
    for (const p of photos) {
      if (next[p.id]) continue;
      try {
        const blob = await this.api.getPhotoBlob(this.listingId()!, p.id);
        const url = URL.createObjectURL(blob);
        this.objectUrls.set(p.id, url);
        next[p.id] = url;
      } catch {
        // template falls back to the placeholder
      }
    }
    this.thumbnails.set(next);
  }

  private revokeThumbnail(photoId: string): void {
    const url = this.objectUrls.get(photoId);
    if (url) {
      URL.revokeObjectURL(url);
      this.objectUrls.delete(photoId);
    }
    this.thumbnails.update(t => {
      const next = { ...t };
      delete next[photoId];
      return next;
    });
  }

  private revokeAllThumbnails(): void {
    for (const url of this.objectUrls.values()) URL.revokeObjectURL(url);
    this.objectUrls.clear();
    this.thumbnails.set({});
  }

  // ---------- Display helpers ----------
  statusLabel(s: OwnerListing['status']): string {
    switch (s) {
      case 'draft': return 'Draft';
      case 'pending_review': return 'Under review';
      case 'published': return 'Published';
      case 'paused': return 'Paused';
      case 'removed': return 'Removed';
    }
  }

  errorText(control: AbstractControl | null, fallback: string): string {
    if (!control || !control.errors || !control.touched) return '';
    if (control.errors['server']) return control.errors['server'] as string;
    if (control.errors['required']) return fallback;
    if (control.errors['minlength']) return `Must be at least ${control.errors['minlength'].requiredLength} characters.`;
    if (control.errors['maxlength']) return `Must be at most ${control.errors['maxlength'].requiredLength} characters.`;
    if (control.errors['min']) return `Must be at least ${control.errors['min'].min}.`;
    if (control.errors['max']) return `Must be at most ${control.errors['max'].max}.`;
    if (control.errors['pattern']) return 'Invalid value.';
    return '';
  }
}
