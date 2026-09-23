export interface DirectMessage {
  id: string;
  type: 'MESSAGE' | 'NOTIFICATION';
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface SendMessagePayload {
  recipientId: string;
  content: string;
}
