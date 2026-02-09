'use client';

import { useSupabase } from '@/lib/supabase-provider';

export default function SettingsPage() {
  const { user } = useSupabase();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account settings
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {user?.email || 'Not logged in'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              User ID
            </label>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-mono">
              {user?.id || '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Preferences</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Coming soon...
        </p>
      </div>
    </div>
  );
}
