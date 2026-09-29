export interface AdminUser {
  id: string;
  displayName: string;
  phoneNumber?: string;
  isOwner: boolean;
  isAdmin: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  createdAt: string;
  lastSeenAt?: string;
  ownedListingCount: number;
}
