"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  service?: string;
  coins?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  refreshAuth: () => Promise<boolean | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "rojlo_auth_token";
const USER_STORAGE_KEY = "rojlo_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const inFlightPromiseRef = useRef<Promise<boolean | null> | null>(null);

  const refreshAuthFromServer = useCallback(async (tokenToUse?: string | null) => {
    if (inFlightPromiseRef.current) {
      return inFlightPromiseRef.current;
    }

    const promise = (async () => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (tokenToUse) {
          headers["Authorization"] = `Bearer ${tokenToUse}`;
        }

        const response = await fetch("/api/auth/me", {
          method: "GET",
          headers,
          credentials: "include",
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUserState(data.user);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
            return true;
          }
        } else if (response.status === 401) {
          // Clear auth only when the server confirms the session is invalid.
          setUserState(null);
          setTokenState(null);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
          return false;
        }
        return null;
      } catch (error) {
        console.error("Failed to refresh auth:", error);
        return null;
      } finally {
        setIsLoading(false);
        inFlightPromiseRef.current = null;
      }
    })();

    inFlightPromiseRef.current = promise;
    return promise;
  }, []);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEY);
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    const hasSessionCookie =
      typeof document !== "undefined" && document.cookie.includes("rojlo_auth");

    if (!storedToken && !hasSessionCookie) {
      queueMicrotask(() => {
        setIsLoading(false);
      });
      return;
    }

    queueMicrotask(() => {
      if (storedToken) {
        setTokenState(storedToken);
      }
      if (storedUser) {
        try {
          setUserState(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }
    });

    const timer = setTimeout(() => {
      void refreshAuthFromServer(storedToken);
    }, 100);

    return () => clearTimeout(timer);
  }, [refreshAuthFromServer]);

  const setUser = (newUser: AuthUser | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem(STORAGE_KEY, newToken);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const logout = () => {
    setUserState(null);
    setTokenState(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const refreshAuth = useCallback(
    () => refreshAuthFromServer(token),
    [refreshAuthFromServer, token]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        setUser,
        setToken,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
