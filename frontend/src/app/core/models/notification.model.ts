export interface NotificationItem {
  id: string;
  recipientId: string;
  type: 'MESSAGE' | 'BOOKING_CREATED' | 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'REVIEW_CREATED' | 'SYSTEM';
  title: string;
  body: string;
  listingId?: string;
  conversationId?: string;
  tenancyId?: string;
  reportId?: string;
  broadcastId?: string;
  data?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

