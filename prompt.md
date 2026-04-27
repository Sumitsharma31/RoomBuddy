# RoomSplit — Complete Project Development Prompt

---

## Project Overview

Build a full-stack web and mobile application called **RoomSplit** using **Next.js 14 (App Router)**, **Firebase** (Auth, Firestore, Storage, Cloud Messaging), and **Capacitor** for Android APK generation.

RoomSplit is a shared expense management app designed for people living together in rented accommodations — such as bachelor students or working professionals sharing a flat. It allows roommates to track who paid for what, verify each other's expenses, and calculate a fair settlement at the end of each month.

---

## Core Constraints (Non-Negotiable Rules)

1. **One user = one room at a time.** A user cannot be in two rooms simultaneously. They must leave their current room before joining or creating another.
2. **Expenses are read-only for others.** Only the person who added an expense can own it. No one else can edit or delete it.
3. **Verification is required.** Every expense must be verified by at least one other roommate. A user cannot verify their own expense.
4. **Room deletion requires unanimous consent.** Even the Admin cannot delete the room alone. Every active member must approve the deletion request. If anyone rejects it, the request is cancelled. Requests expire after 24 hours if not fully approved.
5. **Admin transfer is required before leaving.** If the Admin wants to leave the room, they must first transfer the Admin role to another member.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend & Backend | Next.js 14 (App Router, API Routes) |
| Authentication | Firebase Auth (Email/Password + Google Sign-In) |
| Database | Firebase Firestore (real-time) |
| File Storage | Firebase Storage (profile photos) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Mobile APK | Capacitor (wraps Next.js static export) |
| Styling | Tailwind CSS |
| Language | TypeScript |
| Hosting | Vercel (web) |

---

## Project Folder Structure

```
roomsplit/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   ├── home/page.tsx
│   │   ├── room/
│   │   │   ├── page.tsx
│   │   │   ├── add/page.tsx
│   │   │   ├── verify/page.tsx
│   │   │   ├── settle/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── notifications/page.tsx
│   └── api/
│       ├── room/
│       │   ├── create/route.ts
│       │   ├── join/route.ts
│       │   ├── leave/route.ts
│       │   └── delete/route.ts
│       ├── expense/
│       │   ├── add/route.ts
│       │   └── verify/route.ts
│       ├── settle/route.ts
│       └── notify/route.ts
├── components/
│   ├── ExpenseCard.tsx
│   ├── MemberList.tsx
│   ├── VerifyModal.tsx
│   ├── SettlementBreakdown.tsx
│   ├── NotificationBell.tsx
│   ├── DeletionVoteModal.tsx
│   └── TransferAdminModal.tsx
├── lib/
│   ├── firebase.ts
│   ├── firestore.ts
│   ├── fcm.ts
│   └── auth.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useRoom.ts
│   ├── useExpenses.ts
│   └── useNotifications.ts
└── types/
    └── index.ts
```

---

## Firebase Firestore Data Model

### Collection: `users`
```
users/{userId}
  name: string
  email: string
  photoURL: string | null
  currentRoomId: string | null       ← null means user has no room
  fcmToken: string | null
  createdAt: Timestamp
```

### Collection: `rooms`
```
rooms/{roomId}
  name: string
  code: string                       ← 6-character unique invite code
  adminId: string                    ← userId of the current admin
  status: "active" | "settled"
  createdAt: Timestamp
  memberCount: number
```

### Subcollection: `rooms/{roomId}/members`
```
members/{userId}
  role: "admin" | "member"
  joinedAt: Timestamp
  displayName: string
  photoURL: string | null
```

### Subcollection: `rooms/{roomId}/expenses`
```
expenses/{expenseId}
  item: string                       ← name of the item/service paid for
  amount: number
  paidBy: string                     ← userId
  paidByName: string
  date: Timestamp
  status: "pending" | "verified" | "disputed"
  verifications: [
    {
      userId: string,
      action: "verified" | "disputed",
      at: Timestamp
    }
  ]
  createdAt: Timestamp
```

### Subcollection: `rooms/{roomId}/deletionRequest` (single document)
```
deletionRequest/current
  initiatedBy: string                ← adminId
  createdAt: Timestamp
  expiresAt: Timestamp               ← createdAt + 24 hours
  status: "pending" | "approved" | "rejected" | "expired" | "cancelled"
  votes: [
    {
      userId: string,
      action: "approved" | "rejected",
      at: Timestamp
    }
  ]
```

### Subcollection: `rooms/{roomId}/settlements`
```
settlements/{monthId}               ← format: "2025-01"
  month: string
  total: number
  fairShare: number
  breakdown: [
    {
      userId: string,
      name: string,
      totalPaid: number,
      fairShare: number,
      balance: number                ← positive = gets back, negative = owes
    }
  ]
  transfers: [
    {
      from: string,                  ← userId
      to: string,                    ← userId
      amount: number
    }
  ]
  settledAt: Timestamp
```

### Collection: `notifications`
```
notifications/{userId}/items/{notifId}
  type: "expense_added" | "expense_verified" | "expense_disputed" | "deletion_requested" | "deletion_approved" | "deletion_rejected" | "settlement_ready" | "admin_transferred"
  message: string
  roomId: string
  read: boolean
  createdAt: Timestamp
```

---

## Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: only self can read/write own document
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Rooms: only members can read
    match /rooms/{roomId} {
      allow read: if isRoomMember(roomId);
      allow create: if request.auth != null;
      allow update: if isRoomAdmin(roomId);

      // Members subcollection
      match /members/{memberId} {
        allow read: if isRoomMember(roomId);
        allow write: if request.auth.uid == memberId || isRoomAdmin(roomId);
      }

      // Expenses subcollection
      match /expenses/{expenseId} {
        allow read: if isRoomMember(roomId);
        allow create: if isRoomMember(roomId);
        allow update: if isRoomMember(roomId)
          && request.auth.uid != resource.data.paidBy; // cannot verify own expense
      }

      // Deletion request
      match /deletionRequest/current {
        allow read: if isRoomMember(roomId);
        allow create: if isRoomAdmin(roomId);
        allow update: if isRoomMember(roomId);
      }

      // Settlements
      match /settlements/{monthId} {
        allow read: if isRoomMember(roomId);
        allow write: if isRoomAdmin(roomId);
      }
    }

    // Notifications: only the owner can read
    match /notifications/{userId}/items/{notifId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Helper functions
    function isRoomMember(roomId) {
      return exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid));
    }

    function isRoomAdmin(roomId) {
      return get(/databases/$(database)/documents/rooms/$(roomId)).data.adminId == request.auth.uid;
    }
  }
}
```

---

## TypeScript Types (`types/index.ts`)

```typescript
export type UserRole = "admin" | "member";
export type ExpenseStatus = "pending" | "verified" | "disputed";
export type DeletionStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";
export type NotificationType =
  | "expense_added"
  | "expense_verified"
  | "expense_disputed"
  | "deletion_requested"
  | "deletion_approved"
  | "deletion_rejected"
  | "settlement_ready"
  | "admin_transferred";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  currentRoomId: string | null;
  fcmToken: string | null;
  createdAt: Date;
}

export interface Room {
  id: string;
  name: string;
  code: string;
  adminId: string;
  status: "active" | "settled";
  memberCount: number;
  createdAt: Date;
}

export interface RoomMember {
  userId: string;
  role: UserRole;
  displayName: string;
  photoURL: string | null;
  joinedAt: Date;
}

export interface Verification {
  userId: string;
  action: "verified" | "disputed";
  at: Date;
}

export interface Expense {
  id: string;
  item: string;
  amount: number;
  paidBy: string;
  paidByName: string;
  date: Date;
  status: ExpenseStatus;
  verifications: Verification[];
  createdAt: Date;
}

export interface DeletionVote {
  userId: string;
  action: "approved" | "rejected";
  at: Date;
}

export interface DeletionRequest {
  initiatedBy: string;
  createdAt: Date;
  expiresAt: Date;
  status: DeletionStatus;
  votes: DeletionVote[];
}

export interface SettlementBreakdown {
  userId: string;
  name: string;
  totalPaid: number;
  fairShare: number;
  balance: number;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export interface Settlement {
  id: string;
  month: string;
  total: number;
  fairShare: number;
  breakdown: SettlementBreakdown[];
  transfers: Transfer[];
  settledAt: Date;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  roomId: string;
  read: boolean;
  createdAt: Date;
}
```

---

## All Application Screens

### Screen 1: Auth — Login & Signup
- Email/password login
- Google Sign-In button
- Toggle between login and signup
- On successful auth, check `currentRoomId`:
  - If null → redirect to `/home`
  - If set → redirect to `/room`

### Screen 2: Home (No Room State)
- Show two large buttons: **Create Room** and **Join Room**
- Create Room: input for room name → generates unique 6-char code → sets `currentRoomId` on user
- Join Room: input for 6-char room code → validates code → adds user to room members → sets `currentRoomId`
- Enforce: if `currentRoomId` is already set, redirect directly to `/room`

### Screen 3: Room Dashboard (Expense Feed)
- Header: room name, member count, notification bell with badge
- List of all expenses from all members, sorted by newest first
- Each expense card shows:
  - Item name and amount
  - Paid by (avatar + name)
  - Date and time
  - Verification status badge: Pending / Verified / Disputed
  - For other people's expenses: Verify / Dispute button (only if not already voted)
  - For own expenses: "Awaiting verification" label
- Floating Action Button (+) to add new expense
- Bottom navigation: Feed | Verify | Notifications | Settle | Settings

### Screen 4: Add Expense
- Form with:
  - Item name (text input)
  - Amount (number input, decimal allowed)
  - Date (defaults to today, can be changed)
- On submit:
  - Save to Firestore
  - Call `/api/notify` to send FCM push to all other members
  - Redirect back to feed

### Screen 5: Verify (Pending Verifications)
- List of expenses waiting for current user's verification
- Excludes own expenses
- Each item shows: item name, amount, who paid, when
- Two action buttons: ✅ Verify | ❌ Dispute
- On action: update expense's verifications array in Firestore + notify the expense owner

### Screen 6: Notifications
- List of all notifications for current user
- Mark all as read on open
- Tap on notification → navigate to relevant screen
- Notification types and messages:
  - expense_added: "[Name] added ₹[amount] for [item] — tap to verify"
  - expense_verified: "Your expense [item] was verified by [Name]"
  - expense_disputed: "Your expense [item] was disputed by [Name]"
  - deletion_requested: "Admin wants to delete the room — tap to vote"
  - settlement_ready: "Month-end settlement is ready — tap to view"
  - admin_transferred: "You are now the Admin of this room"

### Screen 7: Settlement (Month-End)
- Only accessible by Admin (others see read-only view after settled)
- Admin sees:
  - Total amount spent by all members this month
  - Fair share per person
  - Each member's: total paid, fair share, balance (positive = gets back, negative = owes)
  - List of transfer instructions: "X pays Y ₹amount"
  - Button: "Finalize & Settle Month"
- On finalize:
  - Save settlement to Firestore
  - Send notification to all members
  - Archive current month's expenses
  - Room status resets to accept new expenses for next month

### Screen 8: Room Settings
- Room name and invite code (with copy button)
- Member list with roles
- Admin controls:
  - Transfer Admin role (opens modal to select a member)
  - Request Room Deletion
- Member controls:
  - Leave Room (Admin must transfer role first)
- Deletion request status (if active):
  - Show each member's vote status (Approved / Pending / Rejected)
  - Admin can cancel the request
- Non-admin members who haven't voted see: Approve / Reject buttons

---

## API Routes

### POST `/api/room/create`
- Validate user has no current room
- Generate unique 6-char room code
- Create room document in Firestore
- Add user as admin in members subcollection
- Update user's `currentRoomId`
- Return room data

### POST `/api/room/join`
- Validate user has no current room
- Find room by code
- Validate room exists and is active
- Add user to members subcollection
- Update user's `currentRoomId`
- Notify all existing members via FCM

### POST `/api/room/leave`
- If admin: require `newAdminId` in request body
- Transfer admin role if needed
- Remove user from members subcollection
- Clear user's `currentRoomId`
- Notify remaining members

### POST `/api/room/delete`
- Validate all members have voted "approved"
- Delete all subcollections (members, expenses, deletionRequest, settlements)
- Delete room document
- Clear `currentRoomId` for all members
- Send notification to all affected users

### POST `/api/expense/add`
- Validate user is a room member
- Save expense to Firestore
- Call FCM to notify all other members
- Return expense data

### POST `/api/expense/verify`
- Validate user is not the expense owner
- Validate user hasn't already voted on this expense
- Update verifications array
- Update expense status
- Notify expense owner

### POST `/api/settle`
- Validate caller is admin
- Fetch all expenses for current month
- Calculate total, fair share, balances, and transfers
- Save settlement document
- Notify all members

### POST `/api/notify`
- Accept: `{ userIds: string[], title: string, body: string, data: object }`
- Fetch FCM tokens for each userId
- Send FCM multicast message
- Save notification documents to Firestore for each user

---

## Room Deletion Flow (Detailed)

1. Admin opens Room Settings and taps "Request Room Deletion"
2. API creates a `deletionRequest/current` document with status `pending`, `expiresAt = now + 24hrs`, and an empty votes array
3. FCM push is sent to all members (excluding admin, who is auto-approved)
4. Each member sees a banner in the app and a push notification
5. Members tap Approve or Reject
6. Each vote is recorded in the `votes` array
7. After each vote, check:
   - If all members approved → trigger room deletion
   - If any member rejected → update status to `rejected`, notify admin, cancel request
   - If 24hrs pass without full approval → a scheduled Cloud Function or cron job updates status to `expired`
8. Admin can cancel at any time (status → `cancelled`)
9. After rejection/expiry/cancellation, Admin can submit a new request

---

## FCM Push Notification Setup

1. Initialize FCM in the Next.js app using Firebase SDK
2. Request notification permission on app load (after auth)
3. Get FCM token and save it to the user's Firestore document
4. On each relevant action (expense added, verified, disputed, deletion request, settlement), call `/api/notify`
5. The API route uses the Firebase Admin SDK to send FCM messages server-side
6. For in-app notifications, also write to the `notifications/{userId}/items` collection and display in the Notifications screen

For Capacitor (Android), add `@capacitor/push-notifications` plugin to handle FCM token retrieval and display native push notifications.

---

## Settlement Calculation Logic

```typescript
function calculateSettlement(expenses: Expense[], members: RoomMember[]): Settlement {
  const memberCount = members.length;

  // Sum total paid per member
  const paid: Record<string, number> = {};
  members.forEach(m => paid[m.userId] = 0);
  expenses.forEach(e => {
    paid[e.paidBy] = (paid[e.paidBy] || 0) + e.amount;
  });

  const total = Object.values(paid).reduce((a, b) => a + b, 0);
  const fairShare = total / memberCount;

  // Calculate balance per member
  const breakdown = members.map(m => ({
    userId: m.userId,
    name: m.displayName,
    totalPaid: paid[m.userId] || 0,
    fairShare,
    balance: (paid[m.userId] || 0) - fairShare,
    // positive balance = gets money back
    // negative balance = owes money
  }));

  // Calculate minimum transfers to settle
  const creditors = breakdown.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
  const debtors = breakdown.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);

  const transfers: Transfer[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(Math.abs(debtors[i].balance), creditors[j].balance);
    transfers.push({ from: debtors[i].userId, to: creditors[j].userId, amount });
    debtors[i].balance += amount;
    creditors[j].balance -= amount;
    if (Math.abs(debtors[i].balance) < 0.01) i++;
    if (creditors[j].balance < 0.01) j++;
  }

  return { total, fairShare, breakdown, transfers };
}
```

---

## Capacitor Android Setup

```bash
# Step 1: Configure Next.js for static export
# In next.config.js:
# output: 'export'
# images: { unoptimized: true }

# Step 2: Build
npm run build

# Step 3: Init Capacitor
npx cap init RoomSplit com.yourname.roomsplit --web-dir=out

# Step 4: Add Android
npx cap add android

# Step 5: Install required plugins
npm install @capacitor/push-notifications
npm install @capacitor/splash-screen
npm install @capacitor/status-bar
npm install @capacitor/network

# Step 6: Sync
npx cap sync

# Step 7: Open in Android Studio
npx cap open android

# Step 8: In Android Studio → Build → Generate Signed APK / AAB
```

Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />
```

---

## Environment Variables (`.env.local`)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

---

## Development Phases

### Phase 1 — Auth & Room Management
- Firebase Auth setup (Email + Google)
- Create room, join room, leave room
- Transfer admin, enforce one-room-per-user rule
- Room settings screen

### Phase 2 — Expenses
- Add expense form
- Expense feed (all members' expenses)
- Verify and dispute system
- Cannot verify own expense rule

### Phase 3 — Notifications
- FCM token management
- In-app notification center
- Push notifications for: expense added, verified, disputed

### Phase 4 — Deletion Voting System
- Admin initiates deletion request
- Members vote approve/reject
- Auto-expiry logic
- Room deletion on unanimous approval

### Phase 5 — Settlement
- Month-end calculation
- Settlement breakdown screen
- Transfer instructions
- Archive and reset for next month

### Phase 6 — Capacitor APK
- Configure static export
- Capacitor setup and sync
- Android Studio build
- Test APK on device

---

## Key Business Logic Rules Summary

| Action | Rule |
|---|---|
| Create Room | User's `currentRoomId` must be null |
| Join Room | User's `currentRoomId` must be null |
| Add Expense | User must be a room member |
| Verify Expense | Cannot verify own expense; cannot vote twice |
| Leave Room | Admin must transfer role before leaving |
| Delete Room | Admin requests; ALL members must approve; any rejection cancels; expires in 24hrs |
| Settle Month | Only Admin can trigger |
| View Expenses | All members can view all expenses (read-only for others) |
| Edit/Delete Expense | Not allowed (immutable once submitted) |

---

*Built with Next.js 14 · Firebase · Capacitor · TypeScript · Tailwind CSS*
