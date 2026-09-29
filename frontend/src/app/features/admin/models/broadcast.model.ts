export type BroadcastAudience = 'all' | 'owners' | 'tenants';
export type BroadcastStatus = 'draft' | 'sent' | 'cancelled';

export interface Broadcast {
  id: string;
  createdBy: string;
  createdByDisplayName: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  status: BroadcastStatus;
  sentAt?: string;
  createdAt: string;
}
