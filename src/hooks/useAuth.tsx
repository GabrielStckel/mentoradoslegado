import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'mentor' | 'operacao';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  mentorId: string | null;
  profile: { nome: string; email: string } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ nome: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const [rolesRes, profileRes, mentorRes] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('profiles').select('nome, email').eq('user_id', userId).single(),
      supabase.from('mentores').select('id').eq('user_id', userId).maybeSingle(),
    ]);

    if (rolesRes.data && rolesRes.data.length > 0) {
      setRole(rolesRes.data[0].role as AppRole);
    }
    if (profileRes.data) {
      setProfile(profileRes.data);
    }
    if (mentorRes.data) {
      setMentorId(mentorRes.data.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setRole(null);
          setProfile(null);
          setMentorId(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setProfile(null);
    setMentorId(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, mentorId, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
