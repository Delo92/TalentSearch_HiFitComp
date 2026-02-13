import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onIdTokenChanged,
  type Auth,
  type User,
} from "firebase/auth";

let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let auth: Auth | null = null;
let initialized = false;

export async function initFirebase() {
  if (initialized) return { app, analytics, auth };
  initialized = true;

  try {
    const res = await fetch("/api/firebase-config");
    if (!res.ok) {
      console.warn("Failed to load Firebase config");
      return { app: null, analytics: null, auth: null };
    }
    const config = await res.json();
    if (!config.apiKey) {
      console.warn("Firebase API key not configured");
      return { app: null, analytics: null, auth: null };
    }

    app = initializeApp(config);
    auth = getAuth(app);
    try {
      analytics = getAnalytics(app);
    } catch {
    }
  } catch (err) {
    console.warn("Firebase initialization failed:", err);
  }

  return { app, analytics, auth };
}

export function getFirebaseApp() {
  return app;
}

export function getFirebaseAnalytics() {
  return analytics;
}

export function getFirebaseAuth() {
  return auth;
}

export async function firebaseLogin(email: string, password: string) {
  const a = getFirebaseAuth();
  if (!a) throw new Error("Firebase not initialized");
  const credential = await signInWithEmailAndPassword(a, email, password);
  return credential.user;
}

export async function firebaseRegister(email: string, password: string) {
  const a = getFirebaseAuth();
  if (!a) throw new Error("Firebase not initialized");
  const credential = await createUserWithEmailAndPassword(a, email, password);
  return credential.user;
}

export async function firebaseLogout() {
  const a = getFirebaseAuth();
  if (!a) return;
  await signOut(a);
}

export async function firebaseResetPassword(email: string) {
  const a = getFirebaseAuth();
  if (!a) throw new Error("Firebase not initialized");
  await sendPasswordResetEmail(a, email);
}

export function onFirebaseIdTokenChanged(callback: (user: User | null) => void) {
  const a = getFirebaseAuth();
  if (!a) return () => {};
  return onIdTokenChanged(a, callback);
}

export async function getIdToken(): Promise<string | null> {
  const a = getFirebaseAuth();
  if (!a || !a.currentUser) return null;
  return a.currentUser.getIdToken();
}
