/**
 * Firebase Authentication — Google only.
 * Desktop uses signInWithPopup, mobile uses signInWithRedirect (Safari/Chrome
 * block popups on phones). The ID token is never written to localStorage by us;
 * Firebase keeps it in IndexedDB and we always ask for a fresh one when needed.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
};

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let persistenceReady: Promise<void> | null = null;

export function getFirebaseAuth(): Auth | null {
  if (!firebaseConfigured) return null;
  if (!app) app = initializeApp(config);
  if (!authInstance) {
    authInstance = getAuth(app);
    persistenceReady = setPersistence(authInstance, browserLocalPersistence).catch(() => undefined);
  }
  return authInstance;
}

export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|Opera Mini/i.test(navigator.userAgent);
}

function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

export async function signInWithGoogle(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('firebase_not_configured');
  await persistenceReady;
  if (isMobileBrowser()) {
    await signInWithRedirect(auth, googleProvider());
    return null; // page navigates away
  }
  const credential = await signInWithPopup(auth, googleProvider());
  return credential.user;
}

/** Completes a redirect sign-in on mobile. Safe to call on every boot. */
export async function completeRedirectSignIn(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch {
    return null;
  }
}

export async function firebaseSignOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
}

export function watchAuth(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, callback);
}

/** Force-refreshed Firebase ID token for our API (Authorization: Bearer …). */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

export function currentUser(): User | null {
  return getFirebaseAuth()?.currentUser ?? null;
}
