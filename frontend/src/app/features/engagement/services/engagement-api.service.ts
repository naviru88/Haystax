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
      id: "tn-001",
      listingId: "listing-101",
      studentId: "student-01",
      ownerId: "owner-01",
      moveInDate: "2026-10-01",
      status: "APPROVED",
      notes: "Looking forward to moving in!",
      createdAt: "2026-09-14T10:00:00Z",
      updatedAt: "2026-09-15T12:00:00Z"
    }
  ];

  private messages: DirectMessage[] = [
    {
      id: "msg-001",
      type: "MESSAGE",
      senderId: "student-01",
      recipientId: "owner-01",
      content: "Hi, is room 204 still available for October?",
      isRead: true,
      createdAt: "2026-09-13T09:00:00Z"
    }
  ];

  public getBookings(userId: string): Observable<TenancyRequest[]> {
    return of(this.bookings.filter(b => b.studentId === userId || b.ownerId === userId));
  }

  public createBooking(payload: CreateTenancyPayload): Observable<TenancyRequest> {
    const newBooking: TenancyRequest = {
      id: `tn-${Date.now()}`,
      listingId: payload.listingId,
      studentId: payload.studentId,
      ownerId: 'owner-01',
      moveInDate: payload.moveInDate,
      status: 'PENDING',
      notes: payload.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.bookings.push(newBooking);
    return of(newBooking);
  }

  public getMessages(userId: string): Observable<DirectMessage[]> {
    return of(this.messages.filter(m => m.senderId === userId || m.recipientId === userId));
  }

  public sendMessage(payload: SendMessagePayload, senderId: string): Observable<DirectMessage> {
    const newMsg: DirectMessage = {
      id: `msg-${Date.now()}`,
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
        id: "rev-001",
        listingId: listingId,
        studentId: "student-04",
        rating: 5,
        comment: "Great location near campus, clean rooms and reliable Wi-Fi.",
        ownerResponse: "Thanks for the review!",
        createdAt: "2026-09-09T16:00:00Z"
      }
    ]);
  }
}
