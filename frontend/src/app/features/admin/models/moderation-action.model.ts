export type ModerationActionType =
  | 'warning'
  | 'unpublish_listing'
  | 'remove_listing'
  | 'restrict_owner'
  | 'restore_listing'
  | 'dismiss_report';

export interface ModerationAction {
  id: string;
  reportId?: string;
  listingId?: string;
  listingTitle?: string;
  ownerId?: string;
  ownerDisplayName?: string;
  adminId: string;
  adminDisplayName: string;
  actionType: ModerationActionType;
  reason: string;
  thresholdCount?: number;
  createdAt: string;
}
