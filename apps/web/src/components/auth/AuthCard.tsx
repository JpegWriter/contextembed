'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';

interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  helperText: string;
}

export function AuthCard({ children, title, subtitle, helperText }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      <div className="relative max-w-md w-full">
        {/* Card */}
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-black/20 overflow-hidden border border-gray-800/50">
          {/* Header Zone */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-800/50">
            <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
              <Logo variant="full" size="lg" dark />
            </Link>
            
            <h1 className="text-2xl font-bold text-white">
              {title}
            </h1>
            <p className="mt-2 text-gray-400 text-sm">
              {subtitle}
            </p>
            <p className="mt-1.5 text-xs text-gray-500">
              {helperText}
            </p>
          </div>

          {/* Form Zone */}
          <div className="px-8 py-6">
            {children}
          </div>
        </div>

        {/* Trust note */}
        <p className="mt-4 text-center text-[11px] text-gray-500">
          We don't publish anything without your action.
        </p>
      </div>
    </div>
  );
}

interface AuthInputProps {
  id: string;
  type: 'email' | 'password' | 'text';
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  helperText?: string;
  icon?: React.ReactNode;
}

export function AuthInput({ 
  id, 
  type, 
  label, 
  placeholder, 
  value, 
  onChange, 
  required = false,
  minLength,
  helperText,
  icon 
}: AuthInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          className={`
            w-full py-3 px-4 ${icon ? 'pl-10' : ''}
            bg-gray-800 
            border border-gray-700 
            rounded-lg 
            text-white
            placeholder-gray-500
            focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 
            transition-colors
          `}
          placeholder={placeholder}
        />
      </div>
      {helperText && (
        <p className="mt-1.5 text-xs text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
}

interface AuthButtonProps {
  type?: 'submit' | 'button';
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function AuthButton({ 
  type = 'button', 
  onClick, 
  loading, 
  disabled,
  children,
  variant = 'primary' 
}: AuthButtonProps) {
  const baseStyles = 'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20',
    secondary: 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700',
    ghost: 'bg-transparent hover:bg-gray-800 text-gray-400',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`${baseStyles} ${variants[variant]}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Please wait...
        </span>
      ) : children}
    </button>
  );
}

interface AuthLinkProps {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function AuthLink({ href, onClick, children, className = '' }: AuthLinkProps) {
  const styles = `text-cyan-400 hover:text-cyan-300 font-medium transition-colors ${className}`;
  
  if (href) {
    return <Link href={href} className={styles}>{children}</Link>;
  }
  
  return (
    <button type="button" onClick={onClick} className={styles}>
      {children}
    </button>
  );
}

interface AuthDividerProps {
  text: string;
}

export function AuthDivider({ text }: AuthDividerProps) {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-700" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="px-3 bg-gray-900 text-gray-500">
          {text}
        </span>
      </div>
    </div>
  );
}
