import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Tajawal', 'Cairo', 'sans-serif'],
        sans: ['Cairo', 'Tajawal', 'sans-serif'],
      },
      colors: {
        azraq: {
          50: '#edf7ff',
          100: '#d7efff',
          200: '#b8e2ff',
          300: '#88d1ff',
          400: '#51b6ff',
          500: '#2697f2',
          600: '#0f78d2',
          700: '#0c61aa',
          800: '#0f528c',
          900: '#124573',
          950: '#0b2b49',
        },
        ink: '#102033',
        pearl: '#f7fbff',
      },
      boxShadow: {
        soft: '0 18px 45px -24px rgba(15, 82, 140, 0.38)',
        glow: '0 22px 65px -32px rgba(38, 151, 242, 0.75)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(18px) scale(.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        rise: 'rise .55s ease both',
        shimmer: 'shimmer 2.8s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
