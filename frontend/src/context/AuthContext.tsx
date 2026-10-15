"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { UserProfile } from "@/types";
import { mockUser } from "@/lib/mockData";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; requiresEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  loginAsDemo: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_STORAGE_KEY = "medimate_demo_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isConfigured = useMemo(() => isSupabaseConfigured(), []);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const demoSaved = localStorage.getItem(DEMO_STORAGE_KEY);
      return demoSaved === "true" || !isSupabaseConfigured();
    }
    return !isSupabaseConfigured();
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (!isSupabaseConfigured()) return mockUser;
    if (typeof window !== "undefined" && localStorage.getItem(DEMO_STORAGE_KEY) === "true") {
      return mockUser;
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (!isSupabaseConfigured()) return false;
    return true;
  });

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Fetch real profile from Supabase profiles table
  const fetchProfile = React.useCallback(async (userId: string, userMeta?: Record<string, unknown>) => {
    try {
      if (!isConfigured) {
        setProfile(mockUser);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, blood_group, emergency_contact, preferred_language, role, avatar_url")
        .eq("id", userId)
        .single();

      if (error || !data) {
        const fullName = (userMeta?.full_name as string) || (userMeta?.name as string) || "Patient";
        setProfile({
          name: fullName,
          email: "patient@medimate.ai",
          role: "patient",
          phone: "+1 (555) 234-5678",
          bloodGroup: "B+",
          emergencyContact: "+1 (555) 987-6543",
        });
      } else {
        setProfile({
          name: data.full_name || "Patient",
          email: "patient@medimate.ai",
          role: data.role || "patient",
          avatarUrl: data.avatar_url || undefined,
          phone: data.phone || undefined,
          bloodGroup: data.blood_group || undefined,
          emergencyContact: data.emergency_contact || undefined,
        });
      }
    } catch {
      setProfile(mockUser);
    }
  }, [isConfigured, supabase]);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    // Initialize session from Supabase
    supabase.auth.getSession().then((res: { data: { session: Session | null } }) => {
      const initialSession = res.data.session;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        fetchProfile(initialSession.user.id, initialSession.user.user_metadata);
      }
      setLoading(false);
    });

    // Listen to Supabase auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, newSession: Session | null) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setIsDemoMode(false);
        if (typeof window !== "undefined") {
          localStorage.removeItem(DEMO_STORAGE_KEY);
        }
        await fetchProfile(newSession.user.id, newSession.user.user_metadata);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured, supabase, fetchProfile]);

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      // If Supabase credentials are not set, explain clearly
      return { error: "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment, or click 'Use Demo Patient Account'." };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      setSession(data.session);
      setUser(data.user);
      setIsDemoMode(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem(DEMO_STORAGE_KEY);
      }
      await fetchProfile(data.user.id, data.user.user_metadata);
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in. Please try again.";
      return { error: message };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isConfigured) {
      return { error: "Supabase is not configured. Please configure your Supabase URL and Anon Key in .env.local to enable live registration." };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        await fetchProfile(data.user!.id, { full_name: fullName });
        return { error: null, requiresEmailConfirmation: false };
      }

      // If Supabase has email confirmation enabled, user is created but session is null
      return { error: null, requiresEmailConfirmation: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed. Please try again.";
      return { error: message };
    }
  };

  const signOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    }
    setIsDemoMode(false);
    setUser(null);
    setSession(null);
    setProfile(null);

    if (isConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Safe ignore
      }
    }
  };

  const resetPassword = async (email: string) => {
    if (!isConfigured) {
      return { error: "Supabase is not configured. Reset emails require a configured Supabase project." };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : "Failed to send reset email." };
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!isConfigured) {
      return { error: "Supabase is not configured." };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : "Failed to update password." };
    }
  };

  const loginAsDemo = () => {
    setIsDemoMode(true);
    setProfile(mockUser);
    if (typeof window !== "undefined") {
      localStorage.setItem(DEMO_STORAGE_KEY, "true");
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.user_metadata);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isConfigured,
        isDemoMode,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        loginAsDemo,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
