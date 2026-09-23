import { Component, OnInit } from '@angular/core';
import { EngagementApiService } from '../services/engagement-api.service';
import { DirectMessage } from '../../../core/models/message.model';

@Component({
  selector: 'app-messaging',
  templateUrl: './messaging.component.html',
  styleUrls: ['./messaging.component.css']
})
export class MessagingComponent implements OnInit {
  messages: DirectMessage[] = [];
  newMessageContent = '';
  currentUserId = 'student-01';
  recipientId = 'owner-01';

  constructor(private apiService: EngagementApiService) {}

  ngOnInit(): void {
    this.loadMessages();
  }

  loadMessages(): void {
    this.apiService.getMessages(this.currentUserId).subscribe(data => {
      this.messages = data;
    });
  }

  sendMessage(): void {
    if (!this.newMessageContent.trim()) return;

    this.apiService.sendMessage(
      { recipientId: this.recipientId, content: this.newMessageContent },
      this.currentUserId
    ).subscribe(msg => {
      this.messages.push(msg);
      this.newMessageContent = '';
    });
  }
}
