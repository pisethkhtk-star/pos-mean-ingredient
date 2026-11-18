import { create } from "zustand";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "CASHIER";
  permissions?: string[];
}

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || "Login failed", loading: false });
        return false;
      }

      set({ user: data.user, loading: false });
      return true;
    } catch (err) {
      set({ error: "Network error or server unreachable", loading: false });
      return false;
    }
  },
  logout: async () => {
    set({ loading: true });
    try {
      await fetch("/api/auth/logout", { 
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      if (typeof document !== "undefined") {
        document.cookie = "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      }
      set({ user: null, loading: false });
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  },
  checkSession: async () => {
    set({ loading: true });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, loading: false });
      } else {
        if (typeof document !== "undefined") {
          document.cookie = "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        }
        set({ user: null, loading: false });
      }
    } catch (err) {
      if (typeof document !== "undefined") {
        document.cookie = "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      }
      set({ user: null, loading: false });
    }
  },
}));
