/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        // Scaled up per WCAG 2.1 / international eye care guidelines (min 16px body text)
        'xs':   ['0.875rem', { lineHeight: '1.6' }],   // 14px  (was 12px)
        'sm':   ['1rem',     { lineHeight: '1.65' }],  // 16px  (was 14px)
        'base': ['1.125rem', { lineHeight: '1.7' }],   // 18px  (was 16px)
        'lg':   ['1.25rem',  { lineHeight: '1.6' }],   // 20px  (was 18px)
        'xl':   ['1.375rem', { lineHeight: '1.5' }],   // 22px  (was 20px)
        '2xl':  ['1.625rem', { lineHeight: '1.4' }],   // 26px  (was 24px)
        '3xl':  ['2rem',     { lineHeight: '1.35' }],  // 32px  (was 30px)
        '4xl':  ['2.5rem',   { lineHeight: '1.2' }],   // 40px  (was 36px)
      },
      colors: {
        ink: {
          950: '#0A0A0F',
          900: '#111118',
          800: '#1A1A24',
          700: '#383850',
          600: '#4A4A68',
          500: '#5E5E7E',
          400: '#9090B0',
          300: '#B4B4CC',
          200: '#D2D2E4',
          100: '#F0F0F8',
          50:  '#FAFAFF',
        },
        purple: {
          600: '#7E22CE',
          500: '#9333EA',
          400: '#C084FC',
          300: '#D8B4FE',
          200: '#E9D5FF',
          100: '#F3E8FF',
        },
        amber: {
          600: '#D97706',
          500: '#F59E0B',
          400: '#FBBF24',
          300: '#FCD34D',
        },
        rose: {
          600: '#E11D48',
          500: '#F43F5E',
          400: '#FB7185',
        },
        violet: {
          600: '#7C3AED',
          500: '#8B5CF6',
          400: '#A78BFA',
          300: '#C4B5FD',
        },
      },
      backgroundImage: {
        'grid-ink': 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '32px 32px',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease forwards',
        'fade-in': 'fadeIn 0.3s ease forwards',
        'pulse-purple': 'pulsePurple 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        pulsePurple: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(147,51,234,0.3)' },
          '50%': { boxShadow: '0 0 0 8px rgba(147,51,234,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
