import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Institution, Profile } from './types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  institution: Institution | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    inviteCode: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (err) {
        if (err.code === 'PGRST116') {
          return null;
        }
        throw err;
      }
      return data as Profile;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Profil yüklenemedi.';
      setError(msg);
      return null;
    }
  }, []);

  const loadInstitution = useCallback(
    async (institutionId: string): Promise<Institution | null> => {
      try {
        const { data, error: err } = await supabase
          .from('institutions')
          .select('*')
          .eq('id', institutionId)
          .single();

        if (err) {
          if (err.code === 'PGRST116') {
            return null;
          }
          throw err;
        }
        return data as Institution;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Kurum bilgisi yüklenemedi.';
        setError(msg);
        return null;
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(existingSession);

        if (existingSession?.user) {
          const prof = await loadProfile(existingSession.user.id);
          if (!mounted) return;
          setProfile(prof);

          if (prof?.institution_id) {
            const inst = await loadInstitution(prof.institution_id);
            if (!mounted) return;
            setInstitution(inst);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Oturum başlatılamadı.';
        if (mounted) setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);
        setError(null);

        if (newSession?.user) {
          setLoading(true);
          const prof = await loadProfile(newSession.user.id);
          if (!mounted) return;
          setProfile(prof);

          if (prof?.institution_id) {
            const inst = await loadInstitution(prof.institution_id);
            if (!mounted) return;
            setInstitution(inst);
          } else {
            setInstitution(null);
          }
          setLoading(false);
        } else {
          setProfile(null);
          setInstitution(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadProfile, loadInstitution]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      try {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (err) {
          return { error: translateAuthError(err.message) };
        }
        return { error: null };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Giriş yapılamadı.';
        return { error: msg };
      }
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      inviteCode: string
    ): Promise<{ error: string | null }> => {
      try {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              name: name.trim(),
              invite_code: inviteCode.trim().toUpperCase(),
            },
          },
        });
        if (err) {
          return { error: translateAuthError(err.message) };
        }
        if (!data.user) {
          return { error: 'Kayıt tamamlanamadı. Lütfen tekrar deneyin.' };
        }
        return { error: null };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Kayıt yapılamadı.';
        return { error: msg };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Çıkış yapılamadı.';
      setError(msg);
    }
    setProfile(null);
    setInstitution(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const prof = await loadProfile(session.user.id);
    setProfile(prof);
    if (prof?.institution_id) {
      const inst = await loadInstitution(prof.institution_id);
      setInstitution(inst);
    }
  }, [session, loadProfile, loadInstitution]);

  const value: AuthContextValue = {
    session,
    profile,
    institution,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.');
  }
  return ctx;
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return 'E-posta veya şifre hatalı.';
  }
  if (m.includes('user already registered')) {
    return 'Bu e-posta adresi zaten kayıtlı.';
  }
  if (m.includes('password should be at least')) {
    return 'Şifre en az 6 karakter olmalıdır.';
  }
  if (m.includes('unable to validate email address')) {
    return 'Geçersiz e-posta adresi.';
  }
  if (m.includes('invite') || m.includes('davet')) {
    return 'Davet kodu geçersiz veya süresi dolmuş.';
  }
  if (m.includes('rate limit')) {
    return 'Çok fazla deneme. Lütfen birkaç dakika bekleyin.';
  }
  return message;
}
