import { useState, useEffect, useCallback } from 'react';
import {
  roomsCollection,
  roomDoc,
  membersCollection,
  userDoc,
  updateDoc,
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { parseRoom, generateRoomCode, memberDoc } from '../lib/firestore';
import { User } from 'firebase/auth';
import { onAuthChange, logout } from '../lib/auth';

interface Room {
  id: string;
  name: string;
  code: string;
  adminId: string;
  status: 'active' | 'settled';
  memberCount: number;
  createdAt: Date;
}

interface RoomMember {
  userId: string;
  role: 'admin' | 'member';
  displayName: string;
  photoURL: string | null;
  joinedAt: Date;
}

export function useRoom() {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current room for a user
  const fetchRoom = useCallback(async (roomId: string): Promise<Room | null> => {
    setLoading(true);
    try {
      const roomSnap = await getDoc(roomDoc(roomId));
      if (roomSnap.exists()) {
        const roomData = parseRoom(roomSnap.data(), roomSnap.id);
        setCurrentRoom(roomData);
        return roomData;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch room');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new room
  const createRoom = useCallback(async (
    userId: string,
    userName: string,
    roomName: string,
    userPhotoURL?: string | null
  ): Promise<Room | null> => {
    setLoading(true);
    setError(null);
    try {
      const roomCode = generateRoomCode();

      // Check if code already exists (retry if needed)
      const existingQuery = query(roomsCollection(), where('code', '==', roomCode));
      const existingSnap = await getDocs(existingQuery);
      let attempts = 0;
      while (!existingSnap.empty && attempts < 5) {
        attempts++;
        const roomCode = generateRoomCode();
      }

      const roomData = {
        name: roomName,
        code: roomCode,
        adminId: userId,
        status: 'active',
        memberCount: 1,
        createdAt: new Date(),
      };

      const roomRef = await addDoc(roomsCollection(), roomData);

      // Add user as admin member
      await addDoc(membersCollection(roomRef.id), {
        userId,
        role: 'admin',
        displayName: userName,
        photoURL: userPhotoURL || null,
        joinedAt: new Date(),
      });

      // Update user's currentRoomId
      await updateDoc(userDoc(userId), {
        currentRoomId: roomRef.id,
      });

      const newRoom: Room = {
        id: roomRef.id,
        ...roomData,
        createdAt: new Date(),
      };
      setCurrentRoom(newRoom);
      return newRoom;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Join a room
  const joinRoom = useCallback(async (
    userId: string,
    userName: string,
    roomCode: string,
    userPhotoURL?: string | null
  ): Promise<Room | null> => {
    setLoading(true);
    setError(null);
    try {
      const roomsRef = roomsCollection();
      const q = query(roomsRef, where('code', '==', roomCode.toUpperCase()));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        throw new Error('Room not found');
      }

      const roomDocRef = querySnap.docs[0];
      const roomId = roomDocRef.id;
      const roomData = parseRoom(roomDocRef.data(), roomId);

      // Check if user is already in this room
      const memberQ = query(membersCollection(roomId), where('userId', '==', userId));
      const memberSnap = await getDocs(memberQ);
      if (!memberSnap.empty) {
        throw new Error('You are already a member of this room');
      }

      // Add user as member
      await addDoc(membersCollection(roomId), {
        userId,
        role: 'member',
        displayName: userName,
        photoURL: userPhotoURL || null,
        joinedAt: new Date(),
      });

      // Update member count
      await updateDoc(roomDoc(roomId), {
        memberCount: roomData.memberCount + 1,
      });

      // Update user's currentRoomId
      await updateDoc(userDoc(userId), {
        currentRoomId: roomId,
      });

      const updatedRoom: Room = {
        ...roomData,
        id: roomId,
        memberCount: roomData.memberCount + 1,
        createdAt: new Date(),
      };
      setCurrentRoom(updatedRoom);
      return updatedRoom;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Leave a room
  const leaveRoom = useCallback(async (
    userId: string,
    roomId: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const memberDocRef = memberDoc(roomId, userId);
      const memberSnap = await getDoc(memberDocRef);

      if (!memberSnap.exists()) {
        throw new Error('You are not a member of this room');
      }

      const memberData = memberSnap.data();
      const isAdmin = memberData.role === 'admin';

      if (isAdmin) {
        throw new Error('Admin must transfer role before leaving');
      }

      // Remove user from members
      await deleteDoc(memberDocRef);

      // Update member count
      const roomDocRef = roomDoc(roomId);
      await updateDoc(roomDocRef, {
        memberCount: (await getDoc(roomDocRef)).data()?.memberCount - 1,
      });

      // Clear user's currentRoomId
      await updateDoc(userDoc(userId), {
        currentRoomId: null,
      });

      setCurrentRoom(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave room');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Transfer admin role
  const transferAdmin = useCallback(async (
    roomId: string,
    currentAdminId: string,
    newAdminId: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // Verify current user is admin
      const currentAdminSnap = await getDoc(memberDoc(roomId, currentAdminId));
      if (!currentAdminSnap.exists() || currentAdminSnap.data()?.role !== 'admin') {
        throw new Error('You must be the admin to transfer role');
      }

      // Update old admin to member
      await updateDoc(memberDoc(roomId, currentAdminId), {
        role: 'member',
      });

      // Update new admin
      await updateDoc(memberDoc(roomId, newAdminId), {
        role: 'admin',
      });

      // Update room adminId
      await updateDoc(roomDoc(roomId), {
        adminId: newAdminId,
      });

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer admin role');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get room members
  const getMembers = useCallback(async (roomId: string): Promise<RoomMember[]> => {
    setLoading(true);
    try {
      const membersSnap = await getDocs(membersCollection(roomId));
      return membersSnap.docs.map(doc => ({
        userId: doc.id,
        ...doc.data(),
        joinedAt: doc.data().joinedAt?.toDate?.() || new Date(),
      })) as RoomMember[];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    currentRoom,
    loading,
    error,
    fetchRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    transferAdmin,
    getMembers,
  };
}