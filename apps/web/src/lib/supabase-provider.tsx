'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';

type SupabaseContext = {
  supabase: SupabaseClient | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    // Dynamically import to avoid errors when not configured
    import('@supabase/auth-helpers-nextjs').then(({ createClientComponentClient }) => {
      const client = createClientComponentClient();
      setSupabase(client);

      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    });
  }, [configured]);

  return (
    <Context.Provider value={{ supabase, user, loading, configured }}>
      {children}
    </Context.Provider>
  );
}

export function useSupabase() {
  const context = useContext(Context);
  if (!context) {
    throw new Error('useSupabase must be used inside SupabaseProvider');
  }
  return context;
}
