import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session,    setSession]    = useState(null);
  const [user,       setUser]       = useState(null);
  const [profile,    setProfile]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  // Separate from `loading`: the session (read from local storage) is instant,
  // the profile row is a network round-trip. Only role checks wait for it.
  const [profileReady, setProfileReady] = useState(false);
  const lastUserId = useRef(null);
  const [signingOut, setSigningOut] = useState(false);

  // Profile fetches are de-duplicated per user: getSession() and the first
  // onAuthStateChange event both ask for the same row on load.
  const profileReq = useRef({ id: null, promise: null });

  function fetchProfile(userId) {
    if (profileReq.current.id === userId && profileReq.current.promise) return profileReq.current.promise;
    const promise = supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      .then(({ data }) => { setProfile(data ?? null); })
      .catch(() => {})
      .finally(() => { if (profileReq.current.promise === promise) profileReq.current = { id: null, promise: null }; });
    profileReq.current = { id: userId, promise };
    return promise;
  }

  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setLoading(false); } };

    // Never let a stalled auth/profile request pin the app on the preloader.
    // Past this point the app renders; the profile fills in whenever it lands.
    const safety = setTimeout(finish, 6000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      lastUserId.current = session?.user?.id ?? null;
      if (session?.user) fetchProfile(session.user.id).finally(() => setProfileReady(true));
      else setProfileReady(true);
      finish();
    }).catch(finish);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Deferred: calling back into supabase synchronously inside this callback
      // can deadlock against the auth lock the client is holding.
      if (session?.user) setTimeout(() => fetchProfile(session.user.id), 0);
      else { setProfile(null); setProfileReady(true); }
      // A different account signed in: its role isn't known until its profile loads.
      const id = session?.user?.id ?? null;
      if (id && id !== lastUserId.current) {
        setProfileReady(false);
        setTimeout(() => fetchProfile(id).finally(() => setProfileReady(true)), 0);
      }
      lastUserId.current = id;
    });

    return () => { clearTimeout(safety); subscription.unsubscribe(); };
  }, []);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, profileReady, loading, signingOut, signIn, signInWithGoogle, resetPassword, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
