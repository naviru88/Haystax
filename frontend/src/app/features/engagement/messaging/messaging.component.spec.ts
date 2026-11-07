import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessagingComponent } from './messaging.component';
import { EngagementApiService } from '../services/engagement-api.service';
import { of } from 'rxjs';
import { DirectMessage } from '../../../core/models/message.model';
import { NotificationItem } from '../../../core/models/notification.model';

describe('MessagingComponent', () => {
  let component: MessagingComponent;
  let fixture: ComponentFixture<MessagingComponent>;
  let apiServiceMock: any;

  const mockMessages: DirectMessage[] = [
    {
      id: 'm-1',
      type: 'MESSAGE',
      senderId: 'u1111111-0000-0000-0000-000000000001',
      recipientId: 'u1111111-0000-0000-0000-000000000002',
      content: 'Hello owner',
      isRead: true,
      createdAt: '2026-10-01T10:00:00Z'
    }
  ];

  const mockNotifications: NotificationItem[] = [
    {
      id: 'n-1',
      recipientId: 'u1111111-0000-0000-0000-000000000001',
      type: 'BOOKING_CONFIRMED',
      title: 'Booking Approved',
      body: 'Your booking has been approved',
      isRead: false,
      createdAt: '2026-10-01T11:00:00Z'
    }
  ];

  beforeEach(async () => {
    apiServiceMock = {
      getMessages: vi.fn().mockReturnValue(of(mockMessages)),
      sendMessage: vi.fn(),
      getNotifications: vi.fn().mockReturnValue(of(mockNotifications)),
      markNotificationRead: vi.fn().mockReturnValue(of(void 0))
    };

    await TestBed.configureTestingModule({
      imports: [MessagingComponent],
      providers: [{ provide: EngagementApiService, useValue: apiServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(MessagingComponent);
    component = fixture.componentInstance;
  });

  it('should load messages and notifications on initialization', () => {
    fixture.detectChanges();
    expect(component.messages.length).toBe(1);
    expect(component.notifications.length).toBe(1);
    expect(component.loadingMessages).toBeFalsy();
  });

  it('should send a message and append to stream', () => {
    fixture.detectChanges();
    component.newMessageContent = 'New message content';

    const sentMessage: DirectMessage = {
      id: 'm-2',
      type: 'MESSAGE',
      senderId: component.currentUserId,
      recipientId: component.selectedThread.id,
      content: 'New message content',
      isRead: false,
      createdAt: '2026-10-01T12:00:00Z'
    };
    apiServiceMock.sendMessage.mockReturnValue(of(sentMessage));

    component.sendMessage();

    expect(component.messages.length).toBe(2);
    expect(component.newMessageContent).toBe('');
  });

  it('should mark a notification as read', () => {
    fixture.detectChanges();
    const notif = component.notifications[0];
    component.markNotificationRead(notif);

    expect(notif.isRead).toBeTruthy();
    expect(apiServiceMock.markNotificationRead).toHaveBeenCalledWith('n-1');
  });
});
