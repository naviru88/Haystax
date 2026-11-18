export interface DirectMessage {
  id: string;
  type: 'MESSAGE' | 'NOTIFICATION';
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
}
