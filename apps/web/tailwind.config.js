/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Pro tool palette — pure black + steel
        steel: {
          50: '#f6f7f8',
          100: '#e1e4e8',
          200: '#c3c9d0',
          300: '#9ca4af',
          400: '#6b7280',
          500: '#4b5563',
          600: '#30363d',
          700: '#21262d',
          800: '#161b22',
          850: '#0d1117',
          900: '#0a0e14',
          925: '#060a10',
          950: '#030507',
        },
        // Brand green — sharp tech accent
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        // Accent green for glows and highlights
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Status colors — high contrast
        status: {
          pending: '#6b7280',
          processing: '#3b82f6',
          completed: '#10b981',
          approved: '#059669',
          failed: '#ef4444',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'none': '0',
        'sm': '0px',
        'DEFAULT': '0px',
        'md': '0px',
        'lg': '0px',
        'xl': '0px',
        '2xl': '0px',
        '3xl': '0px',
        'full': '9999px',
      },
      boxShadow: {
        'inset-strong': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.25)',
        'tool': '0 1px 2px 0 rgb(0 0 0 / 0.3)',
        'glow-green': '0 0 12px rgba(16, 185, 129, 0.15)',
        'glow-green-lg': '0 0 24px rgba(16, 185, 129, 0.2)',
      },
    },
  },
  plugins: [],
};
