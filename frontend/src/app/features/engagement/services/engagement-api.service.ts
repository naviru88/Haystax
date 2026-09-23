import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TenancyRequest, CreateTenancyPayload } from '../../../core/models/tenancy.model';
import { DirectMessage, SendMessagePayload } from '../../../core/models/message.model';

@Injectable({
  providedIn: 'root'
})
export class EngagementApiService {
  private bookings: TenancyRequest[] = [
    {
      id: "a1b2c3d4-0000-0000-0000-000000000002",
      listingId: "b1111111-0000-0000-0000-000000000101",
      tenantId: "u1111111-0000-0000-0000-000000000001",
      ownerId: "u1111111-0000-0000-0000-000000000002",
      moveInDate: "2026-10-01",
      status: "active",
      message: "Looking forward to moving in!",
      createdAt: "2026-09-14T10:00:00Z"
    }
  ];

  private messages: DirectMessage[] = [
    {
      id: "m1111111-0000-0000-0000-000000000001",
      type: "MESSAGE",
      senderId: "u1111111-0000-0000-0000-000000000001",
      recipientId: "u1111111-0000-0000-0000-000000000002",
      content: "Hi, is room 101 available?",
      isRead: true,
      createdAt: "2026-09-13T09:00:00Z"
    }
  ];

  public getBookings(userId: string): Observable<TenancyRequest[]> {
    return of(this.bookings.filter(b => b.tenantId === userId || b.ownerId === userId));
  }

  public createBooking(payload: CreateTenancyPayload): Observable<TenancyRequest> {
    const newBooking: TenancyRequest = {
      id: `a1b2c3d4-0000-0000-0000-${Date.now().toString().slice(-12)}`,
      listingId: payload.listingId,
      tenantId: payload.tenantId,
      ownerId: 'u1111111-0000-0000-0000-000000000002',
      moveInDate: payload.moveInDate,
      status: 'submitted',
      message: payload.notes,
      createdAt: new Date().toISOString()
    };
    this.bookings.push(newBooking);
    return of(newBooking);
  }

  public getMessages(userId: string): Observable<DirectMessage[]> {
    return of(this.messages.filter(m => m.senderId === userId || m.recipientId === userId));
  }

  public sendMessage(payload: SendMessagePayload, senderId: string): Observable<DirectMessage> {
    const newMsg: DirectMessage = {
      id: `m1111111-0000-0000-0000-${Date.now().toString().slice(-12)}`,
      type: 'MESSAGE',
      senderId,
      recipientId: payload.recipientId,
      content: payload.content,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    this.messages.push(newMsg);
    return of(newMsg);
  }

  public getReviews(listingId: string): Observable<any[]> {
    return of([
      {
        id: "r1111111-0000-0000-0000-000000000001",
        listingId: listingId,
        studentId: "u1111111-0000-0000-0000-000000000001",
        rating: 5,
        comment: "Awesome place! Very clean environment and close to university campus.",
        ownerResponse: "Thanks for the review!",
        createdAt: "2026-09-09T16:00:00Z"
      }
    ]);
  }
}
