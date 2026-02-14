import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  initFirebase,
  firebaseLogin,
  firebaseRegister,
  firebaseLogout,
  firebaseResetPassword,
  onFirebaseIdTokenChanged,
  getIdToken,
  getFirebaseAuth,
} from "@/lib/firebase";

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  stageName: string | null;
  level: number;
  profileImageUrl: string | null;
  socialLinks: Record<string, string> | null;
  billingAddress: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  hasProfile: boolean;
  profileRole: string | null;
}

let globalToken: string | null = null;
let globalUser: AuthUser | null = null;
let globalLoading = true;
let listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot() {
  return { user: globalUser, isLoading: globalLoading };
}

export function getAuthToken(): string | null {
  return globalToken;
}

let initialized = false;

async function syncUserWithBackend(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const syncRes = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!syncRes.ok) return null;
      return syncRes.json();
    }
    return res.json();
  } catch {
    return null;
  }
}

function initAuthListener() {
  if (initialized) return;
  initialized = true;

  (async () => {
    await initFirebase();

    onFirebaseIdTokenChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          globalToken = token;
          const userData = await syncUserWithBackend(token);
          globalUser = userData;
          globalLoading = false;
          notifyListeners();
        } catch {
          globalUser = null;
          globalToken = null;
          globalLoading = false;
          notifyListeners();
        }
      } else {
        globalUser = null;
        globalToken = null;
        globalLoading = false;
        notifyListeners();
      }
    });

    setInterval(async () => {
      const auth = getFirebaseAuth();
      if (auth?.currentUser) {
        try {
          const freshToken = await auth.currentUser.getIdToken(true);
          globalToken = freshToken;
        } catch {}
      }
    }, 45 * 60 * 1000);
  })();
}

export function useAuth() {
  const queryClient = useQueryClient();

  useEffect(() => {
    initAuthListener();
  }, []);

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsub = subscribe(() => forceUpdate((n) => n + 1));
    return unsub;
  }, []);

  const snapshot = getSnapshot();

  const login = useCallback(async (email: string, password: string) => {
    try {
      await firebaseLogin(email, password);
    } catch (err: any) {
      const msg = err.code === "auth/user-not-found" ? "No account found with this email"
        : err.code === "auth/wrong-password" ? "Incorrect password"
        : err.code === "auth/invalid-credential" ? "Invalid email or password"
        : err.code === "auth/too-many-requests" ? "Too many attempts. Try again later."
        : "Login failed";
      throw new Error(msg);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string, inviteToken?: string, level?: number) => {
    try {
      await firebaseRegister(email, password);
      const token = await getIdToken();
      if (token) {
        await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email, password, displayName, inviteToken, level }),
        });
      }
    } catch (err: any) {
      const msg = err.code === "auth/email-already-in-use" ? "Email already in use"
        : err.code === "auth/weak-password" ? "Password must be at least 6 characters"
        : err.code === "auth/invalid-email" ? "Invalid email address"
        : "Registration failed";
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    await firebaseLogout();
    globalToken = null;
    globalUser = null;
    notifyListeners();
    queryClient.clear();
  }, [queryClient]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await firebaseResetPassword(email);
    } catch (err: any) {
      const msg = err.code === "auth/user-not-found" ? "No account found with this email"
        : "Password reset failed";
      throw new Error(msg);
    }
  }, []);

  return {
    user: snapshot.user,
    isLoading: snapshot.isLoading,
    isAuthenticated: !!snapshot.user,
    error: null as string | null,
    login,
    register,
    logout,
    resetPassword,
  };
}
