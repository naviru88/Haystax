import { Injectable, signal } from '@angular/core';
import { AdminStats, DailyActivity } from '../models/admin-stats.model';
import { Report, ReportStatus } from '../models/report.model';
import { ModerationAction, ModerationActionType } from '../models/moderation-action.model';
import { Broadcast } from '../models/broadcast.model';
import { AuditLog } from '../models/audit-log.model';
import { AdminUser } from '../models/admin-user.model';

import adminStatsJson from '../mocks/admin-stats.json';
import activityJson from '../mocks/activity.json';
import reportsJson from '../mocks/reports.json';
import moderationJson from '../mocks/moderation-actions.json';
import broadcastsJson from '../mocks/broadcasts.json';
import auditJson from '../mocks/audit-logs.json';
import usersJson from '../mocks/admin-users.json';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly stats: AdminStats = adminStatsJson as AdminStats;
  private readonly activity: DailyActivity[] = activityJson as DailyActivity[];

  private readonly _reports = signal<Report[]>(reportsJson as Report[]);
  private readonly _moderationActions = signal<ModerationAction[]>(
    moderationJson as ModerationAction[]
  );
  private readonly _broadcasts = signal<Broadcast[]>(broadcastsJson as Broadcast[]);
  private readonly _auditLogs = signal<AuditLog[]>(auditJson as AuditLog[]);
  private readonly _users = signal<AdminUser[]>(usersJson as AdminUser[]);

  readonly reports = this._reports.asReadonly();
  readonly moderationActions = this._moderationActions.asReadonly();
  readonly broadcasts = this._broadcasts.asReadonly();
  readonly auditLogs = this._auditLogs.asReadonly();
  readonly users = this._users.asReadonly();

  // Overview / analytics
  getStats(): AdminStats {
    return this.stats;
  }

  /** Daily activity, newest first, limited to `days` most recent entries. */
  getActivity(days = 30): DailyActivity[] {
    return [...this.activity]
      .sort((a, b) => b.day.localeCompare(a.day))
      .slice(0, days);
  }

  // Reports
  getReportById(id: string): Report | undefined {
    return this._reports().find(r => r.id === id);
  }

  getReportsByStatus(status: ReportStatus | 'all'): Report[] {
    const all = this._reports();
    return status === 'all' ? all : all.filter(r => r.status === status);
  }

  /**
   * Mock: apply a moderation action to a report.
   * In Week 2 this becomes POST /api/admin/reports/:id/moderate
   */
  applyModeration(params: {
    reportId: string;
    actionType: ModerationActionType;
    reason: string;
  }): void {
    const report = this._reports().find(r => r.id === params.reportId);
    if (!report) return;

    const resolvedStatus: ReportStatus =
      params.actionType === 'dismiss_report' ? 'rejected' : 'resolved';

    this._reports.update(list =>
      list.map(r =>
        r.id === params.reportId
          ? {
              ...r,
              status: resolvedStatus,
              resolutionNote: params.reason,
              resolvedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );

    const newAction: ModerationAction = {
      id: `mod-${Date.now()}`,
      reportId: report.id,
      listingId: report.listingId,
      listingTitle: report.listingTitle,
      adminId: 'admin-01',
      adminDisplayName: 'Nadeesha P.',
      actionType: params.actionType,
      reason: params.reason,
      createdAt: new Date().toISOString(),
    };
    this._moderationActions.update(a => [newAction, ...a]);

    this._auditLogs.update(l => [
      {
        id: `aud-${Date.now()}`,
        actorId: 'admin-01',
        actorDisplayName: 'Nadeesha P.',
        action: `moderation.${params.actionType}`,
        entityType: 'boarding_listing',
        entityId: report.listingId,
        reason: params.reason,
        createdAt: new Date().toISOString(),
      },
      ...l,
    ]);
  }

  // Broadcasts
  sendBroadcast(params: {
    title: string;
    body: string;
    audience: 'all' | 'owners' | 'tenants';
  }): void {
    const draft: Broadcast = {
      id: `bc-${Date.now()}`,
      createdBy: 'admin-01',
      createdByDisplayName: 'Nadeesha P.',
      title: params.title,
      body: params.body,
      audience: params.audience,
      status: 'sent',
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this._broadcasts.update(b => [draft, ...b]);

    this._auditLogs.update(l => [
      {
        id: `aud-${Date.now()}`,
        actorId: 'admin-01',
        actorDisplayName: 'Nadeesha P.',
        action: 'broadcast.sent',
        entityType: 'broadcast',
        entityId: draft.id,
        createdAt: new Date().toISOString(),
      },
      ...l,
    ]);
  }

  // Users
  getUserById(id: string): AdminUser | undefined {
    return this._users().find(u => u.id === id);
  }

  suspendUser(userId: string, reason: string): void {
    this._users.update(list =>
      list.map(u =>
        u.id === userId
          ? { ...u, isSuspended: true, suspensionReason: reason }
          : u
      )
    );
    this._auditLogs.update(l => [
      {
        id: `aud-${Date.now()}`,
        actorId: 'admin-01',
        actorDisplayName: 'Nadeesha P.',
        action: 'user.suspended',
        entityType: 'profile',
        entityId: userId,
        reason,
        createdAt: new Date().toISOString(),
      },
      ...l,
    ]);
  }

  unsuspendUser(userId: string): void {
    this._users.update(list =>
      list.map(u =>
        u.id === userId
          ? { ...u, isSuspended: false, suspensionReason: undefined }
          : u
      )
    );
    this._auditLogs.update(l => [
      {
        id: `aud-${Date.now()}`,
        actorId: 'admin-01',
        actorDisplayName: 'Nadeesha P.',
        action: 'user.unsuspended',
        entityType: 'profile',
        entityId: userId,
        createdAt: new Date().toISOString(),
      },
      ...l,
    ]);
  }
}
