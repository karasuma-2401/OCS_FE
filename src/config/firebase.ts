import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

export const firebaseWebConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const firebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export const isFirebaseClientConfigured = Boolean(
  firebaseWebConfig.apiKey &&
    firebaseWebConfig.projectId &&
    firebaseWebConfig.messagingSenderId &&
    firebaseWebConfig.appId &&
    firebaseVapidKey,
);

let cachedApp: FirebaseApp | null = null;

export function getFirebaseAppInstance(): FirebaseApp | null {
  if (!isFirebaseClientConfigured) {
    return null;
  }

  if (cachedApp) {
    return cachedApp;
  }

  cachedApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseWebConfig);
  return cachedApp;
}

export async function getFirebaseMessagingInstance(): Promise<Messaging | null> {
  if (!isFirebaseClientConfigured || typeof window === 'undefined') {
    return null;
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return null;
  }

  const app = getFirebaseAppInstance();
  return app ? getMessaging(app) : null;
}

