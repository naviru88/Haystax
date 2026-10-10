import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdminStats, DailyActivity } from '../models/admin-stats.model';
import { Report, ReportStatus } from '../models/report.model';
import { ModerationAction, ModerationActionType } from '../models/moderation-action.model';
import { Broadcast, BroadcastAudience } from '../models/broadcast.model';
import { AuditLog } from '../models/audit-log.model';
import { AdminUser } from '../models/admin-user.model';

//PRE-WIRE HTTP client for admin endpoints.

@Injectable({ providedIn: 'root' })
export class HttpAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/admin`;

  //Overview / analytics

  fetchStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.base}/stats`).pipe(
      catchError((err) => {
        console.error('Admin stats fetch failed', err);
        return of({
          submittedReportCount: 0,
          underReviewReportCount: 0,
          resolvedReportCount: 0,
          rejectedReportCount: 0,
          pendingListingCount: 0,
          removedListingCount: 0,
          suspendedUserCount: 0,
          publishedListingCount: 0,
          activeTenancyCount: 0,
          totalUserCount: 0,
        } as AdminStats);
      })
    );
  }

  fetchActivity(days = 30): Observable<DailyActivity[]> {
    const params = new HttpParams().set('days', days);
    return this.http
      .get<DailyActivity[]>(`${this.base}/activity`, { params })
      .pipe(catchError(() => of([])));
  }

  // ---------- Reports ----------

  fetchReports(status: ReportStatus | 'all' = 'all'): Observable<Report[]> {
    const params = new HttpParams().set('status', status);
    return this.http
      .get<Report[]>(`${this.base}/reports`, { params })
      .pipe(catchError(() => of([])));
  }

  fetchReportById(id: string): Observable<Report | null> {
    return this.http
      .get<Report>(`${this.base}/reports/${id}`)
      .pipe(catchError(() => of(null)));
  }

  applyModeration(payload: {
    reportId: string;
    actionType: ModerationActionType;
    reason: string;
  }): Observable<ModerationAction | null> {
    return this.http
      .post<ModerationAction>(`${this.base}/reports/${payload.reportId}/moderate`, {
        actionType: payload.actionType,
        reason: payload.reason,
      })
      .pipe(catchError(() => of(null)));
  }

  // Moderation actions (activity feed)

  fetchModerationActions(): Observable<ModerationAction[]> {
    return this.http
      .get<ModerationAction[]>(`${this.base}/moderation-actions`)
      .pipe(catchError(() => of([])));
  }

  //Broadcasts

  fetchBroadcasts(): Observable<Broadcast[]> {
    return this.http
      .get<Broadcast[]>(`${this.base}/broadcasts`)
      .pipe(catchError(() => of([])));
  }

  sendBroadcast(payload: {
    title: string;
    body: string;
    audience: BroadcastAudience;
  }): Observable<Broadcast | null> {
    return this.http
      .post<Broadcast>(`${this.base}/broadcasts`, payload)
      .pipe(catchError(() => of(null)));
  }

  // Audit log

  fetchAuditLogs(): Observable<AuditLog[]> {
    return this.http
      .get<AuditLog[]>(`${this.base}/audit-logs`)
      .pipe(catchError(() => of([])));
  }

  //Users

  fetchUsers(): Observable<AdminUser[]> {
    return this.http
      .get<AdminUser[]>(`${this.base}/users`)
      .pipe(catchError(() => of([])));
  }

  fetchUserById(id: string): Observable<AdminUser | null> {
    return this.http
      .get<AdminUser>(`${this.base}/users/${id}`)
      .pipe(catchError(() => of(null)));
  }

  suspendUser(userId: string, reason: string): Observable<void | null> {
    return this.http
      .post<void>(`${this.base}/users/${userId}/suspend`, { reason })
      .pipe(catchError(() => of(null)));
  }

  unsuspendUser(userId: string): Observable<void | null> {
    return this.http
      .post<void>(`${this.base}/users/${userId}/unsuspend`, {})
      .pipe(catchError(() => of(null)));
  }
}
