import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

export type UserRole = 'owner' | 'admin' | 'cashier';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  mobile_number: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  mobileNumber: string | null;
  role: UserRole;
  isActive: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isCashier: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, fullName: string, mobileNumber?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActiveRef = useRef<number>(Date.now());
  const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
  const LOGOUT_BROADCAST_KEY = 'force_logout';
  const LAST_ACTIVE_KEY = 'last_active_ts';
  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<AuthUser>("/api/auth/me");
      setUser(data);
    } catch (err) {
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout", {});
    } catch (_err) {
      // ignore logout errors
    }
    localStorage.removeItem("auth_token");
    setUser(null);
    localStorage.setItem(LOGOUT_BROADCAST_KEY, Date.now().toString());
  }, []);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current as any);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  const triggerLogoutIfIdle = useCallback(() => {
    clearInactivityTimer();
    logout();
  }, [clearInactivityTimer, logout]);

  const scheduleInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    inactivityTimeoutRef.current = setTimeout(() => {
      triggerLogoutIfIdle();
    }, INACTIVITY_LIMIT_MS);
  }, [clearInactivityTimer, triggerLogoutIfIdle]);

  const markActivity = useCallback(() => {
    lastActiveRef.current = Date.now();
    localStorage.setItem(LAST_ACTIVE_KEY, lastActiveRef.current.toString());
    scheduleInactivityTimer();
  }, [scheduleInactivityTimer]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLoading(false);
      return;
    }

    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  // Inactivity + tab-visibility tracking
  useEffect(() => {
    if (!user) {
      clearInactivityTimer();
      return;
    }

    markActivity();

    const handleVisibility = () => {
      if (!document.hidden) {
        markActivity();
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, markActivity));
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, markActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInactivityTimer();
    };
  }, [user, markActivity, clearInactivityTimer]);

  // Cross-tab logout broadcast listener
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOGOUT_BROADCAST_KEY) {
        logout();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [logout]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post<{ token: string; user: any }>("/api/auth/login", { email, password });
      localStorage.setItem("auth_token", response.token);
      const authUser: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        fullName: response.user.name,
        mobileNumber: null,
        role: (response.user.role as UserRole) || "cashier",
        isActive: true,
      };
      setUser(authUser);
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Login failed" };
    }
  }, []);

  const signup = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    mobileNumber?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post<{ token: string; user: any }>("/api/auth/register", {
        email,
        password,
        name: fullName,
        role: "staff",
      });
      localStorage.setItem("auth_token", response.token);
      const authUser: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        fullName: response.user.name,
        mobileNumber: null,
        role: (response.user.role as UserRole) || "cashier",
        isActive: true,
      };
      setUser(authUser);
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Signup failed" };
    }
  }, []);

  const isAuthenticated = !!user;
  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isCashier = user?.role === 'cashier';

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isOwner,
      isAdmin, 
      isCashier,
      loading,
      login, 
      signup,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
