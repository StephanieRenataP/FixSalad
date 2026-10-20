import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        green: {
          900: 'var(--green-900)',
          700: 'var(--green-700)',
          100: 'var(--green-100)',
        },
        lime: { 300: 'var(--lime-300)' },
        rust: { 600: 'var(--rust-600)', 100: 'var(--rust-100)' },
        cream: { 50: 'var(--cream-50)' },
        gray: { 600: 'var(--gray-600)', 200: 'var(--gray-200)' },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        headline: ['32px', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        section: ['22px', { lineHeight: '1.25', fontWeight: '700' }],
        body: ['15px', { lineHeight: '1.5' }],
        label: ['13px', { lineHeight: '1.4', fontWeight: '500' }],
        big: ['28px', { lineHeight: '1.15', fontWeight: '700' }],
      },
      borderRadius: {
        card: '20px',
        btn: '14px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(20,67,42,0.06)',
        cta: '0 6px 16px rgba(181,58,16,0.25)',
      },
      maxWidth: { app: '480px' },
    },
  },
  plugins: [],
};

export default config;
