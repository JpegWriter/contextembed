import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { SupabaseProvider } from '@/lib/supabase-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ContextEmbed',
  description: 'Context-driven metadata embedding for your images',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SupabaseProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#0a0e14',
                color: '#e1e4e8',
                border: '1px solid #21262d',
                borderRadius: '0',
              },
            }}
          />
        </SupabaseProvider>
      </body>
    </html>
  );
}
