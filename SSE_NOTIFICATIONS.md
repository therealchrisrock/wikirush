# SSE Game Invite Notification System

A real-time notification system built using Server-Sent Events (SSE) for game invites between friends.

## Features

- ✅ Real-time notifications using SSE
- ✅ Game invite sending and receiving
- ✅ Accept/reject invite functionality
- ✅ Toast notifications using Sonner
- ✅ Connection status indicator
- ✅ Persistent storage with Prisma

## Architecture

### Database Schema

The system adds a `GameInvite` model to track game invitations:

```prisma
model GameInvite {
  id String @id @default(cuid())

  from User @relation("SentInvites", fields: [fromId], references: [id])
  fromId String

  to User @relation("ReceivedInvites", fields: [toId], references: [id])
  toId String

  status String @default("pending") // pending, accepted, rejected, cancelled
  message String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Backend Components

#### 1. SSE Manager (`server/utils/sse-manager.ts`)
Manages SSE connections and broadcasts notifications to connected clients.

**Key Features:**
- Tracks active client connections per user
- Sends events to specific users
- Handles client disconnection cleanup

#### 2. Express Endpoints (`server/index.ts`)

**`GET /api/notifications/stream`**
- SSE endpoint for real-time notifications
- Requires `x-user-id` header for authentication
- Sends connection confirmation on connect

**`POST /api/notifications/send`**
- Internal endpoint to broadcast notifications
- Used by React Router actions to send events

### Frontend Components

#### 1. React Hook (`app/utils/notifications.tsx`)

**`useNotifications(userId)`**
- Manages SSE connection
- Parses incoming events
- Provides connection status
- Returns notifications array and management functions

#### 2. Notification Components (`app/components/notifications.tsx`)

**`NotificationListener`**
- Displays toast notifications for new events
- Integrates with Sonner for UI

**`NotificationToast`**
- Individual notification toast component
- Handles different event types (invite, accepted, rejected)

#### 3. Game Invites Resource Route (`app/routes/resources+/game-invites.tsx`)

**Actions:**
- `send` - Send a game invite to another user
- `respond` - Accept or reject an invite

#### 4. Game Invites UI (`app/routes/game-invites.tsx`)
- Full UI for managing game invites
- Send invites to users
- View received invites
- Accept/reject invites
- View sent invites
- Real-time connection status indicator

## Usage

### 1. Viewing Game Invites

Navigate to `/game-invites` to access the game invite interface.

### 2. Sending an Invite

```tsx
<Form method="post" action="/resources/game-invites">
  <input type="hidden" name="intent" value="send" />
  <input type="hidden" name="toUserId" value={userId} />
  <input type="hidden" name="message" value="Want to play?" />
  <Button type="submit">Send Invite</Button>
</Form>
```

### 3. Responding to an Invite

```tsx
// Accept
<Form method="post" action="/resources/game-invites">
  <input type="hidden" name="intent" value="respond" />
  <input type="hidden" name="inviteId" value={inviteId} />
  <input type="hidden" name="action" value="accept" />
  <Button type="submit">Accept</Button>
</Form>

// Reject
<Form method="post" action="/resources/game-invites">
  <input type="hidden" name="intent" value="respond" />
  <input type="hidden" name="inviteId" value={inviteId} />
  <input type="hidden" name="action" value="reject" />
  <Button type="submit">Reject</Button>
</Form>
```

### 4. Using Notifications in Your Components

```tsx
import { useNotifications } from '#app/utils/notifications.tsx'
import { NotificationListener } from '#app/components/notifications.tsx'

export default function MyComponent() {
  const userId = 'current-user-id'
  const { notifications, isConnected, removeNotification } = useNotifications(userId)

  return (
    <div>
      <div>Connection: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>

      <NotificationListener
        notifications={notifications}
        onDismiss={removeNotification}
      />

      {/* Your component content */}
    </div>
  )
}
```

## Event Types

### 1. `game-invite`
Sent when a user receives a new game invite.

```json
{
  "type": "game-invite",
  "data": {
    "id": "invite-id",
    "fromId": "sender-user-id",
    "fromUsername": "sender-username",
    "toId": "recipient-user-id",
    "message": "Optional message",
    "createdAt": "2025-12-12T03:00:00.000Z"
  }
}
```

### 2. `game-invite-accepted`
Sent when someone accepts your game invite.

```json
{
  "type": "game-invite-accepted",
  "data": {
    "id": "invite-id",
    "fromId": "accepter-user-id",
    "fromUsername": "accepter-username",
    "toId": "original-sender-id",
    "createdAt": "2025-12-12T03:00:00.000Z"
  }
}
```

### 3. `game-invite-rejected`
Sent when someone rejects your game invite.

```json
{
  "type": "game-invite-rejected",
  "data": {
    "id": "invite-id",
    "fromId": "rejecter-user-id",
    "fromUsername": "rejecter-username",
    "toId": "original-sender-id",
    "createdAt": "2025-12-12T03:00:00.000Z"
  }
}
```

## Setup

### 1. Run Database Migration

```bash
npm run setup
```

This will apply the `GameInvite` migration to your database.

### 2. Start the Development Server

```bash
npm run dev
```

### 3. Test the System

1. Open two browser windows/tabs
2. Log in with different users in each
3. Navigate to `/game-invites` in both
4. Send an invite from one user to the other
5. See the real-time notification appear
6. Accept or reject the invite
7. See the notification on the original sender

## Extending the System

### Adding New Event Types

1. Update `NotificationEvent` type in `server/utils/sse-manager.ts`:
```typescript
export type NotificationEvent = {
  type: 'game-invite' | 'game-invite-accepted' | 'game-invite-rejected' | 'new-event-type'
  data: { /* event data structure */ }
}
```

2. Add event listener in `app/utils/notifications.tsx`:
```typescript
eventSource.addEventListener('new-event-type', (event) => {
  const data = JSON.parse(event.data)
  // Handle event
})
```

3. Update notification toast handler in `app/components/notifications.tsx`:
```typescript
if (type === 'new-event-type') {
  toast.info('Your message', { /* options */ })
}
```

## Troubleshooting

### Connection Status Shows Disconnected

- Check browser console for errors
- Verify user is authenticated
- Check server logs for SSE connection issues

### Notifications Not Appearing

- Verify SSE connection is established
- Check that the notification is being sent from the server
- Verify event type matches in both client and server

### Multiple Notifications for Same Event

- Check that notification IDs are unique
- Verify the `shownNotifications` Set is working correctly

## Security Considerations

- SSE endpoint requires authentication via session
- User IDs are validated on the server
- Users can only respond to invites sent to them
- All invite operations are protected by authentication
