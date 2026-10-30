import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getMessaging, isSupported as isMessagingSupported, Messaging } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase singleton safely
let app;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (err) {
  console.warn('[AI Studio] Firebase init warning:', err);
  app = !getApps().length ? initializeApp({ apiKey: 'mock' }) : getApp();
}

export { app };

// Connect with configured firestoreDatabaseId safely
let db;
try {
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
} catch (err) {
  console.warn('[AI Studio] Firestore init warning:', err);
  db = getFirestore(app);
}
export { db };

// Auth instance
let auth;
try {
  auth = getAuth(app);
} catch (err) {
  console.warn('[AI Studio] Firebase Auth warning:', err);
  auth = {} as any;
}
export { auth };

// Messaging instance getter (browser support check)
let messagingInstance: Messaging | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  
  if (messagingInstance) return messagingInstance;
  
  try {
    const supported = await isMessagingSupported();
    if (supported) {
      messagingInstance = getMessaging(app);
      return messagingInstance;
    }
  } catch (err) {
    console.warn('Firebase Cloud Messaging not supported in this environment:', err);
  }
  return null;
}

// Connection check as required by Firebase skill
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    return true;
  } catch {
    return false;
  }
}

export { firebaseConfig };

