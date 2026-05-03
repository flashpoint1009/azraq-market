import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { signInWithPhonePassword, signUpCustomer, type SignUpCustomerInput } from '../lib/auth';
import { supabase } from '../lib/supabase';
import type { Profile, Role } from '../types/database';

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  profileResolved: boolean;
  signIn: (phone: string, password: string) => Promise<void>;
  signUp: (input: SignUpCustomerInput) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const BOOT_SPLASH_TIMEOUT_MS = 2000;
const AUTH_QUERY_TIMEOUT_MS = 8000;
const roles: Role[] = ['customer', 'admin', 'warehouse', 'delivery'];

function timeoutError(label: string) {
  return new Error(`${label} timed out`);
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(timeoutError(label)), ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function metadataRoleForSession(session: Session): Role | null {
  const metadata = session.user.user_metadata;
  const metadataRole = metadata?.role;
  return roles.includes(metadataRole) ? metadataRole as Role : null;
}

function profileFromSession(session: Session, role: Role): Profile {
  const metadata = session.user.user_metadata;
  return {
    id: session.user.id,
    phone: metadata?.phone ?? null,
    full_name: metadata?.full_name ?? 'مستخدم',
    role,
    address: metadata?.address ?? null,
    latitude: null,
    longitude: null,
    app_permissions: null,
    created_at: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileResolved, setProfileResolved] = useState(false);

  const loadProfile = useCallback(async (nextSession: Session) => {
    const userId = nextSession.user.id;
    const result = await withTimeout(
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      AUTH_QUERY_TIMEOUT_MS,
      'AUTH_PROFILE_LOADED',
    );
    const { data, error } = result;
    if (error) throw error;
    if (data) {
      setProfile(data);
      return data;
    }

    const fallbackRole = metadataRoleForSession(nextSession) ?? 'customer';
    const missingProfile = profileFromSession(nextSession, fallbackRole);

    const insertResult = await withTimeout(
      supabase.from('profiles').insert(missingProfile).select('*').single(),
      AUTH_QUERY_TIMEOUT_MS,
      'AUTH_PROFILE_CREATE',
    );

    if (insertResult.error) {
      if (insertResult.error.code === '23505') {
        const retry = await withTimeout(
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          AUTH_QUERY_TIMEOUT_MS,
          'AUTH_PROFILE_RETRY',
        );
        if (retry.error) throw retry.error;
        if (retry.data) {
          setProfile(retry.data);
          return retry.data;
        }
      }
      throw insertResult.error;
    }

    setProfile(insertResult.data);
    return insertResult.data;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) return;
    setProfileResolved(false);
    try {
      await loadProfile(session);
    } finally {
      setProfileResolved(true);
    }
  }, [loadProfile, session]);

  useEffect(() => {
    let alive = true;
    let bootEnded = false;

    const endBoot = () => {
      if (!alive || bootEnded) return;
      bootEnded = true;
      setLoading(false);
    };

    const splashTimer = setTimeout(() => {
      endBoot();
    }, BOOT_SPLASH_TIMEOUT_MS);

    withTimeout(supabase.auth.getSession(), AUTH_QUERY_TIMEOUT_MS, 'AUTH_SESSION_LOADED')
      .then(async ({ data }) => {
        if (!alive) return;
        setSession(data.session);
        try {
          if (data.session) {
            setProfileResolved(false);
            await loadProfile(data.session);
            setProfileResolved(true);
          } else {
            setProfile(null);
            setProfileResolved(true);
          }
        } catch (error) {
          toast.error('معرفناش نحمل بيانات الحساب');
          console.error('AUTH_PROFILE_ERROR', error);
          setProfile(null);
          setProfileResolved(true);
        } finally {
          clearTimeout(splashTimer);
          endBoot();
        }
      })
      .catch((error) => {
        console.error('AUTH_SESSION_LOADED', error);
        setSession(null);
        setProfile(null);
        setProfileResolved(true);
        clearTimeout(splashTimer);
        endBoot();
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) {
        setProfileResolved(false);
        loadProfile(nextSession)
          .catch((error) => {
            toast.error('معرفناش نحدث بيانات الحساب');
            console.error('AUTH_PROFILE_ERROR', error);
            setProfile(null);
          })
          .finally(() => setProfileResolved(true));
      } else {
        setProfile(null);
        setProfileResolved(true);
      }
      if (event !== 'INITIAL_SESSION') endBoot();
    });

    return () => {
      alive = false;
      clearTimeout(splashTimer);
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      role: profile?.role ?? null,
      loading,
      profileResolved,
      signIn: async (phone, password) => {
        const { error } = await signInWithPhonePassword(phone, password);
        if (error) throw error;
      },
      signUp: async (input) => {
        const data = await signUpCustomer(input);
        return Boolean(data.session);
      },
      refreshProfile,
      signOut: async () => {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setProfileResolved(true);
        setLoading(false);
      },
    }),
    [session, profile, loading, profileResolved, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
