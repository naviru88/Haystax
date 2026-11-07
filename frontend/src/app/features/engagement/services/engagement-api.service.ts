import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { TenancyRequest, CreateTenancyPayload } from '../../../core/models/tenancy.model';
import { DirectMessage, SendMessagePayload } from '../../../core/models/message.model';
import { NotificationItem } from '../../../core/models/notification.model';
import { ReviewItem, ReviewCreateRequest, ReviewUpdateRequest, AnalyticsSummary, PageResponse } from '../../../core/models/review.model';

@Injectable({
  providedIn: 'root'
})
export class EngagementApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/engagement`;
  private readonly currentUserId = 'u1111111-0000-0000-0000-000000000001';
  private readonly currentRole = 'TENANT';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(idempotencyKey?: string): HttpHeaders {
    let headers = new HttpHeaders({
      'X-Mock-User-Id': this.currentUserId,
      'X-Mock-Role': this.currentRole
    });
    if (idempotencyKey) {
      headers = headers.set('Idempotency-Key', idempotencyKey);
    }
    return headers;
  }

  // --- Tenancies & Bookings ---

  public getBookings(userId: string = this.currentUserId, page: number = 0, size: number = 20): Observable<PageResponse<TenancyRequest>> {
    const params = new HttpParams()
      .set('userId', userId)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<TenancyRequest>>(`${this.baseUrl}/tenancies`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  public createBooking(payload: CreateTenancyPayload, idempotencyKey?: string): Observable<TenancyRequest> {
    const body: any = {
      listingId: payload.listingId,
      tenantId: payload.tenantId || this.currentUserId,
      moveInDate: payload.moveInDate,
      endDate: payload.endDate,
      notes: payload.notes
    };

    return this.http.post<TenancyRequest>(`${this.baseUrl}/tenancies`, body, {
      headers: this.getAuthHeaders(idempotencyKey)
    });
  }

  public getTenancy(tenancyId: string): Observable<TenancyRequest> {
    return this.http.get<TenancyRequest>(`${this.baseUrl}/tenancies/${tenancyId}`, {
      headers: this.getAuthHeaders()
    });
  }

  public updateTenancyStatus(tenancyId: string, status: string, notes?: string): Observable<TenancyRequest> {
    return this.http.patch<TenancyRequest>(`${this.baseUrl}/tenancies/${tenancyId}`, { status, notes }, {
      headers: this.getAuthHeaders()
    });
  }

  // --- Direct Messages & Conversations ---

  public getMessages(userId: string = this.currentUserId): Observable<DirectMessage[]> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<DirectMessage[]>(`${this.baseUrl}/messages`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  public sendMessage(payload: SendMessagePayload, senderId: string = this.currentUserId): Observable<DirectMessage> {
    const body = {
      senderId,
      recipientId: payload.recipientId,
      content: payload.content
    };
    return this.http.post<DirectMessage>(`${this.baseUrl}/messages`, body, {
      headers: this.getAuthHeaders()
    });
  }

  // --- Notifications ---

  public getNotifications(userId: string = this.currentUserId): Observable<NotificationItem[]> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<NotificationItem[]>(`${this.baseUrl}/notifications`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  public markNotificationRead(notificationId: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/notifications/${notificationId}/read`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // --- Reviews & Ratings ---

  public getReviews(listingId: string, page: number = 0, size: number = 20): Observable<PageResponse<ReviewItem>> {
    const params = new HttpParams()
      .set('listingId', listingId)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<ReviewItem>>(`${this.baseUrl}/reviews`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  public submitReview(payload: ReviewCreateRequest): Observable<ReviewItem> {
    return this.http.post<ReviewItem>(`${this.baseUrl}/reviews`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  public updateReview(reviewId: string, payload: ReviewUpdateRequest): Observable<ReviewItem> {
    return this.http.put<ReviewItem>(`${this.baseUrl}/reviews/${reviewId}`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  public deleteReview(reviewId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/reviews/${reviewId}`, {
      headers: this.getAuthHeaders()
    });
  }

  public respondToReview(reviewId: string, body: string): Observable<ReviewItem> {
    return this.http.post<ReviewItem>(`${this.baseUrl}/reviews/${reviewId}/response`, { body }, {
      headers: this.getAuthHeaders()
    });
  }

  // --- Analytics Dashboard ---

  public getAnalyticsSummary(listingId: string, from?: string, to?: string): Observable<AnalyticsSummary> {
    let params = new HttpParams().set('listingId', listingId);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    return this.http.get<AnalyticsSummary>(`${this.baseUrl}/analytics/summary`, {
      headers: this.getAuthHeaders(),
      params
    });
  }
}
