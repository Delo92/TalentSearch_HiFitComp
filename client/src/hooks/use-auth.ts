import { useState, useEffect, useCallback } from "react";
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

export function getAuthToken(): string | null {
  return globalToken;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const syncUserWithBackend = useCallback(async (token: string): Promise<AuthUser | null> => {
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    let tokenRefreshInterval: ReturnType<typeof setInterval> | null = null;

    async function init() {
      await initFirebase();

      const unsub = onFirebaseIdTokenChanged(async (firebaseUser) => {
        if (cancelled) return;

        if (firebaseUser) {
          try {
            const token = await firebaseUser.getIdToken();
            globalToken = token;

            if (!user) {
              const userData = await syncUserWithBackend(token);
              if (!cancelled) {
                setUser(userData);
                setIsLoading(false);
              }
            } else {
              if (!cancelled) setIsLoading(false);
            }
          } catch {
            if (!cancelled) {
              setUser(null);
              globalToken = null;
              setIsLoading(false);
            }
          }
        } else {
          if (!cancelled) {
            setUser(null);
            globalToken = null;
            setIsLoading(false);
          }
        }
      });

      tokenRefreshInterval = setInterval(async () => {
        const auth = getFirebaseAuth();
        if (auth?.currentUser) {
          try {
            const freshToken = await auth.currentUser.getIdToken(true);
            globalToken = freshToken;
          } catch {
          }
        }
      }, 45 * 60 * 1000);

      return unsub;
    }

    const cleanup = init();
    return () => {
      cancelled = true;
      if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);
      cleanup.then(unsub => unsub?.());
    };
  }, [syncUserWithBackend]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await firebaseLogin(email, password);
    } catch (err: any) {
      const msg = err.code === "auth/user-not-found" ? "No account found with this email"
        : err.code === "auth/wrong-password" ? "Incorrect password"
        : err.code === "auth/invalid-credential" ? "Invalid email or password"
        : err.code === "auth/too-many-requests" ? "Too many attempts. Try again later."
        : "Login failed";
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string, inviteToken?: string, level?: number) => {
    setError(null);
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
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    await firebaseLogout();
    globalToken = null;
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await firebaseResetPassword(email);
    } catch (err: any) {
      const msg = err.code === "auth/user-not-found" ? "No account found with this email"
        : "Password reset failed";
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    register,
    logout,
    resetPassword,
  };
}
