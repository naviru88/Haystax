import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EngagementApiService } from '../services/engagement-api.service';
import { DirectMessage } from '../../../core/models/message.model';

export interface ConversationThread {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

@Component({
  selector: 'app-messaging',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messaging.component.html',
  styleUrls: ['./messaging.component.css']
})
export class MessagingComponent implements OnInit {
  activeTab: 'messages' | 'notifications' = 'messages';

  threads: ConversationThread[] = [
    {
      id: 'c1111111-0000-0000-0000-000000000001',
      name: 'Boarding House Owner (GreenVilla)',
      role: 'Landlord / Owner',
      lastMessage: 'Hi, is room 101 available?',
      lastMessageTime: '10:15 AM',
      unreadCount: 0
    },
    {
      id: 'c2222222-0000-0000-0000-000000000002',
      name: 'John Doe (Tenant)',
      role: 'Student Tenant',
      lastMessage: 'I sent the booking inquiry form.',
      lastMessageTime: 'Yesterday',
      unreadCount: 2
    }
  ];

  selectedThread: ConversationThread = this.threads[0];
  messages: DirectMessage[] = [];
  notifications: any[] = [
    {
      id: 'notif-1',
      title: 'Booking Approved',
      body: 'Your tenancy request for GreenVilla listing-101 has been APPROVED by the owner.',
      time: '2 hours ago',
      isRead: false,
      type: 'success'
    },
    {
      id: 'notif-2',
      title: 'New System Announcement',
      body: 'Scheduled maintenance this Friday at 11:00 PM UTC.',
      time: '1 day ago',
      isRead: true,
      type: 'info'
    }
  ];

  newMessageContent = '';
  currentUserId = 'u1111111-0000-0000-0000-000000000001';

  constructor(private apiService: EngagementApiService) {}

  ngOnInit(): void {
    this.loadMessages();
  }

  selectThread(thread: ConversationThread): void {
    this.selectedThread = thread;
    thread.unreadCount = 0;
    this.loadMessages();
  }

  loadMessages(): void {
    this.apiService.getMessages(this.currentUserId).subscribe(data => {
      this.messages = data;
    });
  }

  sendMessage(): void {
    if (!this.newMessageContent.trim()) return;

    const content = this.newMessageContent.trim();
    this.apiService.sendMessage(
      { recipientId: this.selectedThread.id, content: content },
      this.currentUserId
    ).subscribe(msg => {
      this.messages.push(msg);
      this.selectedThread.lastMessage = content;
      this.selectedThread.lastMessageTime = 'Just now';
      this.newMessageContent = '';
    });
  }

  markNotificationRead(notif: any): void {
    notif.isRead = true;
  }
}
