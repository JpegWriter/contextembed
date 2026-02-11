'use client';

import { useSupabase } from '@/lib/supabase-provider';

export default function SettingsPage() {
  const { user } = useSupabase();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-sm font-bold text-white uppercase tracking-wider">Settings</h1>
        <p className="text-xs text-steel-500 mt-0.5 font-mono">
          Manage your account settings
        </p>
      </div>

      <div className="bg-black border border-steel-700/50 p-6">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Account</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-steel-500 uppercase tracking-wider">
              Email
            </label>
            <p className="mt-1 text-sm text-steel-200">
              {user?.email || 'Not logged in'}
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-steel-500 uppercase tracking-wider">
              User ID
            </label>
            <p className="mt-1 text-xs text-steel-400 font-mono">
              {user?.id || '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-black border border-steel-700/50 p-6">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Preferences</h2>
        <p className="text-xs text-steel-500 font-mono">
          Coming soon...
        </p>
      </div>
    </div>
  );
}
