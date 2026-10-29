# Member 3 Engagement & Insights Page Contract

Status: Week 1 documentation contract. The current Angular implementation is
local/mock-backed; real API integration is a later task.

## Data-contract decisions

### Assigned table-group mapping

The assigned logical groups keep the existing database tables. No existing
migration is renamed or edited.

| Assigned group | Existing tables | Contract use |
|---|---|---|
| Bookings | `tenancy_requests`, `tenancies` | Inquiry/request lifecycle and confirmed tenancy records. |
| MessagesNotifications | `conversations`, `conversation_participants`, `messages`, `notifications` | Conversation membership, direct messages, notification records, and read state. |
| Reviews | `reviews` | Listing reviews and ratings. |
| AnalyticsSummaries | `analytics_summaries` | New aggregate summary table planned for migration `V3_2`; UUID defaults use PostgreSQL `gen_random_uuid()`. |

The existing `V3__engagement_tables.sql` uses `random_uuid()`. This is not
the standard PostgreSQL/Supabase function and must be addressed in a future
migration/schema correction; this contract does not edit `V3` or `V3_1`.

### Identity boundary

Local development uses an `X-Mock-User-Id` request header plus a mock role.
The eventual Member 2 JWT adapter replaces this mechanism without changing the
engagement service contract.

Request bodies must not provide or override `tenantId`, `authorId`, or
`ownerId`. The server-side authenticated/mock identity supplies those values.

### Event bus boundary

Engagement code depends on an `EngagementEventBus` interface. An in-memory
implementation is the default for local development and tests. RabbitMQ is an
optional adapter and is disabled by default.

## Shared contract conventions

### Local users and identifiers

The current frontend uses these local IDs:

| Fixture role | ID |
|---|---|
| Mock tenant/current user | `u1111111-0000-0000-0000-000000000001` |
| Mock owner | `u1111111-0000-0000-0000-000000000002` |
| Mock listing | `b1111111-0000-0000-0000-000000000101` |

The current service also contains a conversation-like thread ID
`c1111111-0000-0000-0000-000000000001` and a second thread ID
`c2222222-0000-0000-0000-000000000002`. These are local UI fixtures until the
conversation API is implemented.

All pages must support loading, empty, error, and success states. The
conflict state is specific to booking/inquiry submission. State text and
actions below describe the current behavior plus the approved backend contract
boundary; features not present in the audited code are marked as future work.

## Page 1: Booking / Inquiry

### Route and access

| Item | Contract |
|---|---|
| Route | `/booking` |
| Current route source | Standalone route in `frontend/src/app/app.routes.ts`. |
| Anonymous | Denied by the future authenticated guard; redirect target is `[TODO: confirm shared login redirect]`. |
| Tenant | Allowed to view and submit an inquiry for the selected listing. |
| Owner | Allowed to view requests belonging to the owner in the backend contract; the current UI uses the mock tenant user. |
| Admin | No engagement-specific admin action is defined in this contract. |

### Displays

- Page title: `My Bookings & Inquiries`.
- New tenancy inquiry card.
- Read-only listing ID.
- Move-in date field.
- Optional notes/inquiry details field.
- Active request list with listing ID, status, move-in date, message, and
  created timestamp.

### Actions

| Action | Contract |
|---|---|
| Load bookings | Calls `GET /api/engagement/tenancies?userId=...` in the current backend shape; the server must derive identity from `X-Mock-User-Id`/JWT rather than trust a body or query identity `[TODO: finalize authenticated endpoint shape]`. |
| Submit inquiry | Calls `POST /api/engagement/tenancies` in the current backend shape. |
| Validate move-in date | Rejects an empty date locally. |
| Handle conflict | Displays a conflict/error state when the server reports an existing overlapping booking. |
| Retry | Repeats the failed load or submit using the same client idempotency key `[TODO: define idempotency header name]`. |

### UI states

- Loading: `Loading bookings...`.
- Empty: `No active tenancy requests found.`
- Error: `Failed to load bookings.` or `Failed to submit booking request.`
- Success: newly created request is added to the top of the local list and the
  form date/notes are cleared.
- Conflict: booking overlap is reported without creating a second tenancy.
- Validation: `Please select a valid move-in date.`
- Submit progress: submit button shows `Submitting...` and is disabled.

### API/data fields

Current frontend fields:

- `id`, `listingId`, `tenantId`, `ownerId`, `moveInDate`, `status`,
  `message`, `createdAt`, and optional `updatedAt`.
- Create payload: `listingId`, `moveInDate`, optional `notes`.

Database mapping:

- Inquiry fields map to `tenancy_requests`.
- Confirmed tenancy fields map to `tenancies`.
- `tenantId` and `ownerId` are server-derived and are not client authority.

### Fixture IDs

- Tenant: `u1111111-0000-0000-0000-000000000001`
- Listing: `b1111111-0000-0000-0000-000000000101`
- Existing local booking: `a1b2c3d4-0000-0000-0000-000000000002`

### Acceptance criteria

- A tenant can load only requests associated with the authenticated/mock user.
- Empty results show the empty state rather than a blank page.
- Missing move-in date prevents submission.
- A successful inquiry shows the created request and clears the editable fields.
- An overlap/conflict does not create a duplicate tenancy.
- Retrying the same request does not create a duplicate record `[TODO:
  define and test idempotency key]`.
- Client input cannot set another tenant's, owner's, or listing's ownership.

## Page 2: Messaging / Notifications

### Route and access

| Item | Contract |
|---|---|
| Route | `/messages` |
| Anonymous | Denied by the future authenticated guard; redirect target is `[TODO: confirm shared login redirect]`. |
| Tenant | Allowed to view own conversations/notifications and send messages to an authorized participant. |
| Owner | Allowed to view own conversations/notifications and send messages to an authorized participant. |
| Admin | No engagement-specific admin action is defined in this contract. |

### Displays

- Page title: `Messages & Notifications Center`.
- Messages and Notifications tabs.
- Conversation thread list with name, role, last message, last message
  time, and unread count.
- Selected conversation with message bubbles and timestamps.
- Message input and send button.
- Notification cards with title, body, time, type, and read/unread styling.

### Actions

| Action | Contract |
|---|---|
| Load messages | Current mock implementation calls `getMessages(currentUserId)`; backend shape is `GET /api/engagement/messages?conversationId=...` `[TODO: finalize participant-scoped endpoint]`. |
| Select conversation | Selects a thread, locally clears its unread count, and reloads messages. |
| Send message | Calls the engagement message service; backend shape is `POST /api/engagement/messages`. |
| Mark notification read | Current UI marks the local notification read. Persisted API action is `[TODO: define mark-read endpoint]`. |
| Read unread count | Current UI displays local thread counts. Persisted unread-count API is `[TODO: define endpoint]`. |

### UI states

- Loading: message list loading state `[TODO: add explicit current UI loading
  indicator]`.
- Empty: empty conversation/message/notification state `[TODO: add explicit
  current UI copy]`.
- Error: message load/send/notification error state `[TODO: add explicit
  current UI error handling]`.
- Success: sent message appears in the selected conversation and updates the
  thread preview to `Just now`.
- Unread: unread pill is displayed for a thread with `unreadCount > 0`.
- Read: selecting a thread or marking a notification read changes local state.
- Send validation: blank or whitespace-only messages are not sent.

### API/data fields

Current message fields:

- `id`, `type`, `senderId`, `recipientId`, `content`, `isRead`, `createdAt`.

Current local thread fields:

- `id`, `name`, `role`, `lastMessage`, `lastMessageTime`, `unreadCount`.

Database mapping:

- Threads map to `conversations` and `conversation_participants`.
- Messages map to `messages`.
- Notifications and read state map to `notifications`.

The sender identity is server-derived. A request body must not assign the
sender or impersonate another participant.

### Fixture IDs

- Current mock user: `u1111111-0000-0000-0000-000000000001`
- Owner thread: `c1111111-0000-0000-0000-000000000001`
- Tenant thread: `c2222222-0000-0000-0000-000000000002`
- Current mock message: `m1111111-0000-0000-0000-000000000001`
- Local notification IDs: `notif-1`, `notif-2`

### Acceptance criteria

- A user sees only conversations and notifications they are authorized to see.
- Selecting a thread displays its messages and clears its displayed unread
  count.
- Blank messages cannot be sent.
- A successful send updates the message list and thread preview.
- Notification read state is visually distinguishable.
- Unread counts are not lost on a failed persistence operation `[TODO: define
  mark-read API and retry contract]`.
- RabbitMQ is not required for local development; the in-memory
  `EngagementEventBus` is the default.

## Page 3: Reviews & Ratings

### Route and access

| Item | Contract |
|---|---|
| Route | `/reviews` |
| Anonymous | Allowed to view published listing reviews only; write actions require an authenticated user. |
| Tenant | Allowed to view published reviews and create/update/delete only reviews authorized by a completed tenancy. |
| Owner | Allowed to view published reviews for own listings; owner response behavior is `[TODO: define endpoint and permission]`. |
| Admin | No engagement-specific admin action is defined in this contract. |

### Displays

- Page title: `Boarding Reviews & Ratings`.
- Review cards.
- Rating from 1 through 5.
- Comment/body.
- Optional owner response when present.
- Review creation/edit controls `[TODO: current UI has no form; add in the
  implementation task]`.

### Actions

| Action | Contract |
|---|---|
| Load reviews | Current mock implementation calls `getReviews(listingId)`; backend shape is `GET /api/engagement/reviews?listingId=...`. |
| Create review | Backend shape is `POST /api/engagement/reviews`; author identity and tenancy permission are server-derived/validated. |
| Update review | `[TODO: define endpoint]`; only the author may update within the agreed policy. |
| Delete review | `[TODO: define endpoint]`; only the author or an explicitly authorized moderator may delete. |
| Display owner response | Shows `ownerResponse` when present in the current local model; persistence endpoint is `[TODO: define endpoint]`. |

### UI states

- Loading: `[TODO: add explicit current UI loading state]`.
- Empty: `[TODO: add explicit no published reviews state]`.
- Error: `[TODO: add explicit review load/write error state]`.
- Success: newly created/updated review appears in the list.
- Authorization error: user without a qualifying tenancy cannot create or
  modify the review.
- Validation: rating must be an integer from 1 through 5; body is required by
  the database contract.

### API/data fields

- `id`, `listingId`, `authorId`, `tenancyId`, `rating`, `title`, `body`,
  `status`, `createdAt`.
- Current local display also supports optional `ownerResponse`.

Database mapping:

- All persisted reviews map to `reviews`.
- `authorId` is server-derived and must not be trusted from a request body.
- `tenancyId` must be checked against the authenticated author before writing.

### Fixture IDs

- Listing: `listing-101` (current component fixture ID)
- Student author: `u1111111-0000-0000-0000-000000000001`
- Review: `r1111111-0000-0000-0000-000000000001`

### Acceptance criteria

- Published reviews can be displayed without exposing draft/unpublished
  reviews.
- A rating outside 1–5 is rejected.
- A user cannot submit a review for another user's tenancy.
- A user cannot set `authorId` by changing request JSON.
- Review update/delete operations enforce the documented permission.
- Empty, loading, success, and error states are visible and testable.

## Page 4: Analytics Dashboard

### Route and access

| Item | Contract |
|---|---|
| Route | `/analytics` |
| Anonymous | Denied; redirect target is `[TODO: confirm shared login redirect]`. |
| Tenant | May see only analytics permitted for the authenticated tenant scope `[TODO: finalize tenant dashboard scope]`. |
| Owner | May see summaries for listings owned by the authenticated owner. |
| Admin | No engagement-specific admin action is defined in this contract. |

### Displays

The current component displays these KPI labels:

- Total Inquiries
- Total Bookings
- Occupancy Rate
- Estimated Revenue
- Average Rating

The values must come from the analytics API in the completed implementation,
not constants in the component.

### Actions

| Action | Contract |
|---|---|
| Load summary | Backend shape is `GET /api/engagement/analytics/summary?listingId=...`. |
| Filter dashboard | `[TODO: define supported date/listing filters]`. |
| Retry failed load | Repeats the summary request without changing the selected scope. |

### UI states

- Loading: `[TODO: add explicit current UI loading state]`.
- Empty: no matching analytics data shows an empty state rather than fabricated
  KPI values.
- Error: summary request failure shows an error and retry action.
- Success: KPI cards display returned aggregate values.
- Authorization error: a user cannot request another owner's private summary.
- Filtered state: selected filter values remain visible while data reloads
  `[TODO: finalize filter controls]`.

### API/data fields

Current component fields:

- `totalInquiries`
- `totalBookings`
- `occupancyRate`
- `estimatedRevenue`
- `averageRating`

Database mapping:

- The new `analytics_summaries` table is the `AnalyticsSummaries` group.
- Its UUID default must use `gen_random_uuid()`.
- Source aggregation reads engagement-owned data through repositories/services;
  it must not directly read Member 1 or Member 2 tables.

### Fixture IDs

- Listing scope: `b1111111-0000-0000-0000-000000000101`
- Current mock KPI values in the audited component: `24`, `18`, `85.5`,
  `45000`, and `4.7`. These are temporary UI placeholders, not approved
  production data.

### Acceptance criteria

- KPI values are loaded from the analytics contract rather than hardcoded.
- A user cannot view another user's private analytics.
- No-data results show an explicit empty state.
- Failed requests show an error and can be retried.
- Filters, when implemented, reload the selected scope and preserve the
  displayed filter.
- Analytics summaries are backed by `analytics_summaries` and use
  PostgreSQL-compatible UUID generation in `V3_2`.

## Cross-page acceptance criteria

- Each page uses the local API/mock boundary; no page imports another member's
  source code or reads another member's tables directly.
- Request identity is derived from `X-Mock-User-Id` plus role locally and from
  Member 2's JWT adapter later.
- Client-provided `tenantId`, `authorId`, and `ownerId` never override the
  server-side identity.
- The default event implementation is in-memory; RabbitMQ is optional.
- Local fixture IDs are deterministic and are not live Supabase credentials.
- Any unresolved API shape or UI behavior is explicitly marked `[TODO]` rather
  than invented.