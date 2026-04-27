import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  Timestamp,
  DocumentReference,
} from 'firebase/firestore';

// Users collection
export const usersCollection = () => collection(db, 'users');
export const userDoc = (userId: string) => doc(db, 'users', userId);

// Rooms collection
export const roomsCollection = () => collection(db, 'rooms');
export const roomDoc = (roomId: string) => doc(db, 'rooms', roomId);

// Members subcollection
export const membersCollection = (roomId: string) => collection(db, 'rooms', roomId, 'members');
export const memberDoc = (roomId: string, userId: string) => doc(db, 'rooms', roomId, 'members', userId);

// Expenses subcollection
export const expensesCollection = (roomId: string) => collection(db, 'rooms', roomId, 'expenses');
export const expenseDoc = (roomId: string, expenseId: string) => doc(db, 'rooms', roomId, 'expenses', expenseId);

// Deletion request
export const deletionRequestDoc = (roomId: string) => doc(db, 'rooms', roomId, 'deletionRequest', 'current');

// Settlements subcollection
export const settlementsCollection = (roomId: string) => collection(db, 'rooms', roomId, 'settlements');
export const settlementDoc = (roomId: string, monthId: string) => doc(db, 'rooms', roomId, 'settlements', monthId);

// Notifications subcollection
export const notificationsCollection = (userId: string) => collection(db, 'notifications', userId, 'items');
export const notificationDoc = (userId: string, notifId: string) => doc(db, 'notifications', userId, 'items', notifId);

// Helper to convert Firestore data to TypeScript types
export function parseUser(data: any, userId: string): any {
  return {
    uid: userId,
    ...data,
    createdAt: data.createdAt?.toDate?.() || new Date(),
  };
}

export function parseRoom(data: any, roomId: string): any {
  return {
    id: roomId,
    ...data,
    createdAt: data.createdAt?.toDate?.() || new Date(),
  };
}

export function parseMember(data: any, userId: string): any {
  return {
    userId,
    ...data,
    joinedAt: data.joinedAt?.toDate?.() || new Date(),
  };
}

export function parseExpense(data: any, expenseId: string): any {
  return {
    id: expenseId,
    ...data,
    date: data.date?.toDate?.() || new Date(),
    createdAt: data.createdAt?.toDate?.() || new Date(),
    verifications: data.verifications?.map((v: any) => ({
      ...v,
      at: v.at?.toDate?.() || new Date(),
    })) || [],
  };
}

export function parseDeletionRequest(data: any, roomId: string): any {
  return {
    roomId,
    ...data,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    expiresAt: data.expiresAt?.toDate?.() || new Date(),
    votes: data.votes?.map((v: any) => ({
      ...v,
      at: v.at?.toDate?.() || new Date(),
    })) || [],
  };
}

export function parseSettlement(data: any, settlementId: string): any {
  return {
    id: settlementId,
    ...data,
    settledAt: data.settledAt?.toDate?.() || new Date(),
  };
}

export function parseNotification(data: any, notifId: string): any {
  return {
    id: notifId,
    ...data,
    createdAt: data.createdAt?.toDate?.() || new Date(),
  };
}

// Get current month ID (format: "2025-01")
export function getCurrentMonthId(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Generate a unique 6-character room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}