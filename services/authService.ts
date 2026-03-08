import { auth } from './firebase';
import {
  browserSessionPersistence,
  inMemoryPersistence,
  User,
  setPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

export const subscribeToAuth = (cb: (user: User | null) => void) =>
  onAuthStateChanged(auth, cb);

export const loginWithEmailPassword = async (email: string, password: string) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
};

export const registerWithEmailPassword = async (email: string, password: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
};

export const loginWithCustomSessionToken = async (token: string) => {
  try {
    await setPersistence(auth, browserSessionPersistence);
  } catch {
    await setPersistence(auth, inMemoryPersistence);
  }
  const cred = await signInWithCustomToken(auth, token);
  return cred.user;
};

export const logout = async () => {
  await signOut(auth);
};
