import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";

let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let initialized = false;

export async function initFirebase() {
  if (initialized) return { app, analytics };
  initialized = true;

  try {
    const res = await fetch("/api/firebase-config");
    if (!res.ok) {
      console.warn("Failed to load Firebase config");
      return { app: null, analytics: null };
    }
    const config = await res.json();
    if (!config.apiKey) {
      console.warn("Firebase API key not configured");
      return { app: null, analytics: null };
    }

    app = initializeApp(config);
    analytics = getAnalytics(app);
  } catch (err) {
    console.warn("Firebase initialization failed:", err);
  }

  return { app, analytics };
}

export function getFirebaseApp() {
  return app;
}

export function getFirebaseAnalytics() {
  return analytics;
}
