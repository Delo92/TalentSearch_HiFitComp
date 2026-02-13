import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";

let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;

export async function initFirebase() {
  if (app) return { app, analytics };

  const res = await fetch("/api/firebase-config");
  const config = await res.json();
  app = initializeApp(config);
  analytics = getAnalytics(app);

  return { app, analytics };
}

export function getFirebaseApp() {
  return app;
}

export function getFirebaseAnalytics() {
  return analytics;
}
