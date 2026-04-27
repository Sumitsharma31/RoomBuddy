import { useState, useEffect, useCallback } from 'react';
import { onAuthChange, getCurrentUser, logout } from '../lib/auth';
import { User } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logoutUser = useCallback(async () => {
    await logout();
  }, []);

  return { user, loading, logout: logoutUser };
}