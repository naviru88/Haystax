import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EngagementApiService } from '../services/engagement-api.service';
import { DirectMessage } from '../../../core/models/message.model';
import { NotificationItem } from '../../../core/models/notification.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';
import { SkeletonCardComponent } from '../../../shared/components/skeleton-card/skeleton-card.component';

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
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    PageHeaderComponent,
    StateViewComponent,
    SkeletonCardComponent
  ],
  templateUrl: './messaging.component.html'
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
      unreadCount: 1
    }
  ];

  selectedThread: ConversationThread = this.threads[0];
  messages: DirectMessage[] = [];
  notifications: NotificationItem[] = [];

  loadingMessages = false;
  loadingNotifications = false;
  newMessageContent = '';
  currentUserId = 'u1111111-0000-0000-0000-000000000001';

  constructor(private apiService: EngagementApiService) {}

  ngOnInit(): void {
    this.loadMessages();
    this.loadNotifications();
  }

  selectThread(thread: ConversationThread): void {
    this.selectedThread = thread;
    thread.unreadCount = 0;
    this.loadMessages();
  }

  loadMessages(): void {
    this.loadingMessages = true;
    this.apiService.getMessages(this.currentUserId).subscribe({
      next: (data) => {
        this.messages = data || [];
        this.loadingMessages = false;
      },
      error: () => {
        this.loadingMessages = false;
      }
    });
  }

  loadNotifications(): void {
    this.loadingNotifications = true;
    this.apiService.getNotifications(this.currentUserId).subscribe({
      next: (data) => {
        this.notifications = data || [];
        this.loadingNotifications = false;
      },
      error: () => {
        this.loadingNotifications = false;
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessageContent.trim()) return;

    const content = this.newMessageContent.trim();
    this.apiService.sendMessage(
      { recipientId: this.selectedThread.id, content: content },
      this.currentUserId
    ).subscribe({
      next: (msg) => {
        this.messages.push(msg);
        this.selectedThread.lastMessage = content;
        this.selectedThread.lastMessageTime = 'Just now';
        this.newMessageContent = '';
      }
    });
  }

  markNotificationRead(notif: NotificationItem): void {
    notif.isRead = true;
    this.apiService.markNotificationRead(notif.id).subscribe();
  }
}
