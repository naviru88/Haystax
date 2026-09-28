export interface AuditLog {
  id: string;
  actorId?: string;
  actorDisplayName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  reason?: string;
  requestId?: string;
  createdAt: string;
}
