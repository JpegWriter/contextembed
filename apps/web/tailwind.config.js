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
        // Pro tool palette - dark steel
        steel: {
          50: '#f6f7f8',
          100: '#e1e4e8',
          200: '#c3c9d0',
          300: '#9ca4af',
          400: '#6b7280',
          500: '#4b5563',
          600: '#374151',
          700: '#2d3748',
          800: '#1f2937',
          850: '#1a1f2e',
          900: '#111827',
          925: '#0d1117',
          950: '#080b12',
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Status colors - high contrast
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
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '4px',
        'lg': '6px',
      },
      boxShadow: {
        'inset-strong': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.25)',
        'tool': '0 1px 2px 0 rgb(0 0 0 / 0.3)',
      },
    },
  },
  plugins: [],
};
