import { auth } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  User,
  AuthErrorCodes,
} from 'firebase/auth';

export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    if (error.code === AuthErrorCodes.INVALID_EMAIL) {
      throw new Error('Invalid email address');
    } else {
      throw new Error(error.message || 'Password reset failed');
    }
  }
}

export async function login(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    if (error.code === AuthErrorCodes.INVALID_EMAIL) {
      throw new Error('Invalid email address');
    } else if (error.code === AuthErrorCodes.INVALID_LOGIN_CREDENTIALS) {
      throw new Error('Invalid email or password');
    } else {
      throw new Error(error.message || 'Login failed');
    }
  }
}

export async function signup(name: string, email: string, password: string): Promise<User> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Update profile with name
    await updateProfile(userCredential.user, {
      displayName: name,
    });
    return userCredential.user;
  } catch (error: any) {
    if (error.code === AuthErrorCodes.EMAIL_EXISTS) {
      throw new Error('This email is already registered');
    } else if (error.code === AuthErrorCodes.INVALID_EMAIL) {
      throw new Error('Invalid email address');
    } else if (error.code === AuthErrorCodes.WEAK_PASSWORD) {
      throw new Error('Password should be at least 6 characters');
    } else {
      throw new Error(error.message || 'Signup failed');
    }
  }
}

export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  try {
    // Switching to popup to avoid third-party cookie/partitioning issues in modern browsers
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    throw new Error(error.message || 'Google login failed');
  }
}

export async function getGoogleRedirectResult(): Promise<User | null> {
  return null; // Deprecated: no longer using redirect
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export function onAuthChange(callback: (user: User | null) => void) {
  return auth.onAuthStateChanged(callback);
}