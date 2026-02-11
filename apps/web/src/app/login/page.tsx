'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, AlertTriangle, ExternalLink } from 'lucide-react';
import { useSupabase } from '@/lib/supabase-provider';
import { AuthCard, AuthInput, AuthButton, AuthDivider } from '@/components/auth';
import { Logo } from '@/components/Logo';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { supabase, configured } = useSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoLogin = async () => {
    if (!supabase) return;
    
    setDemoLoading(true);
    const demoEmail = 'demo@contextembed.com';
    const demoPassword = 'demo123456';

    try {
      // Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });

      if (signInError) {
        console.log('Sign in error:', signInError.message);
        
        // If sign in fails, try to create the demo account
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPassword,
          options: {
            data: { name: 'Demo User' },
          },
        });

        if (signUpError) {
          console.log('Sign up error:', signUpError.message);
          
          if (signUpError.message.includes('already registered')) {
            toast.error('Demo account exists but password may be different. Try signing up with your own email.');
          } else if (signUpError.message.includes('Email not confirmed')) {
            toast.error('Please disable email confirmation in Supabase dashboard: Authentication > Providers > Email');
          } else {
            toast.error(`Auth error: ${signUpError.message}`);
          }
          return;
        }

        if (signUpData.user && !signUpData.session) {
          toast.error('Email confirmation required. Please disable it in Supabase: Authentication > Providers > Email > Disable "Confirm email"');
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: demoEmail,
          password: demoPassword,
        });

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            toast.error('Please disable email confirmation in Supabase dashboard');
          } else {
            throw error;
          }
          return;
        }
      }

      toast.success('Welcome to the demo!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Demo login error:', error);
      toast.error(error instanceof Error ? error.message : 'Demo login failed');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      router.push('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Show configuration warning if Supabase is not set up
  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-black">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <Logo variant="full" size="lg" dark />
            </Link>
          </div>

          <div className="bg-amber-900/20 border border-amber-800/50 rounded-none p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-amber-200 mb-2">
                  Supabase Not Configured
                </h2>
                <p className="text-amber-300/80 text-sm mb-4">
                  To enable authentication, add these environment variables to your <code className="bg-amber-800/50 px-1 rounded">.env.local</code> file:
                </p>
                <pre className="bg-amber-800/30 p-3 rounded text-xs overflow-x-auto text-amber-200">
{`NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key`}
                </pre>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 mt-4 text-amber-300 hover:text-amber-200"
                >
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to embed trustworthy context into your images."
      helperText="Your metadata stays with the file. No lock-in."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          id="email"
          type="email"
          label="Email"
          placeholder="Email address"
          value={email}
          onChange={setEmail}
          required
          icon={<Mail className="h-5 w-5" />}
        />

        <AuthInput
          id="password"
          type="password"
          label="Password"
          placeholder="Password"
          value={password}
          onChange={setPassword}
          required
          minLength={6}
          icon={<Lock className="h-5 w-5" />}
        />

        <AuthButton type="submit" loading={loading} variant="primary">
          Sign in
          <ArrowRight className="h-4 w-4" />
        </AuthButton>
      </form>

      {/* Secondary actions */}
      <div className="mt-6 space-y-3">
        <p className="text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link 
            href="/auth/signup" 
            className="text-brand-400 hover:text-brand-300 font-medium"
          >
            Create one
          </Link>
        </p>

        <AuthDivider text="or" />

        {/* Demo link - subtle, secondary */}
        <button
          onClick={handleDemoLogin}
          disabled={demoLoading}
          className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          {demoLoading ? (
            'Signing in...'
          ) : (
            <>
              Try the demo
              <span className="text-xs text-gray-500">(no sign-up)</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </AuthCard>
  );
}
