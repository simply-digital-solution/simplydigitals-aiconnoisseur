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
      colors: {
        ink: {
          950: '#0A0A0F',
          900: '#111118',
          800: '#1A1A24',
          700: '#242433',
          600: '#2E2E42',
          500: '#3D3D55',
          400: '#6B6B8A',
          300: '#9494B0',
          200: '#C2C2D6',
          100: '#E8E8F0',
          50:  '#F4F4F8',
        },
        jade: {
          600: '#00A876',
          500: '#00C98A',
          400: '#1DDBA0',
          300: '#5EEABC',
          200: '#A0F2D8',
          100: '#D6FAF0',
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
        'pulse-jade': 'pulseJade 2s ease-in-out infinite',
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
        pulseJade: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0,201,138,0.3)' },
          '50%': { boxShadow: '0 0 0 8px rgba(0,201,138,0)' },
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
