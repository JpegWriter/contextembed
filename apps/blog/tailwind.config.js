/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,mdx}', './content/**/*.mdx'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        bg: {
          DEFAULT: 'hsl(var(--bg))',
          secondary: 'hsl(var(--bg-secondary))',
        },
        fg: {
          DEFAULT: 'hsl(var(--fg))',
          muted: 'hsl(var(--fg-muted))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          fg: 'hsl(var(--accent-fg))',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': 'hsl(var(--fg))',
            '--tw-prose-headings': 'hsl(var(--fg))',
            '--tw-prose-links': 'hsl(var(--accent))',
            '--tw-prose-bold': 'hsl(var(--fg))',
            '--tw-prose-code': 'hsl(var(--fg))',
            '--tw-prose-pre-bg': 'hsl(var(--bg-secondary))',
            '--tw-prose-pre-code': 'hsl(var(--fg))',
            '--tw-prose-th-borders': 'hsl(var(--border))',
            '--tw-prose-td-borders': 'hsl(var(--border))',
            maxWidth: '72ch',
            a: {
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              '&:hover': { color: 'hsl(var(--accent))' },
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            code: {
              backgroundColor: 'hsl(var(--bg-secondary))',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.875em',
              fontWeight: '400',
            },
            table: {
              width: '100%',
              borderCollapse: 'collapse',
            },
            th: {
              textAlign: 'left',
              fontWeight: '600',
              borderBottom: '2px solid hsl(var(--border))',
              padding: '8px 12px',
            },
            td: {
              borderBottom: '1px solid hsl(var(--border))',
              padding: '8px 12px',
            },
            img: {
              borderRadius: '8px',
            },
            blockquote: {
              borderLeftColor: 'hsl(var(--accent))',
              fontStyle: 'normal',
            },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
