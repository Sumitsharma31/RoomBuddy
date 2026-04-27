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