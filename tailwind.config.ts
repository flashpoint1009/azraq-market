import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Tajawal', 'Cairo', 'system-ui', 'sans-serif'],
        sans: ['Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],   // 11px — minimum readable
      },
      colors: {
        azraq: {
          50: 'var(--azraq-50, #eef7fb)',
          100: 'var(--azraq-100, #d9edf5)',
          200: 'var(--azraq-200, #b8dceb)',
          300: 'var(--azraq-300, #88c2d8)',
          400: 'var(--azraq-400, #5aa2bf)',
          500: 'var(--azraq-500, #3f86a6)',
          600: 'var(--azraq-600, #316f8d)',
          700: 'var(--azraq-700, #2b5b74)',
          800: 'var(--azraq-800, #284d61)',
          900: 'var(--azraq-900, #253f50)',
          950: 'var(--azraq-950, #172a36)',
        },
        ink: 'var(--ink, #102033)',
        pearl: 'var(--pearl, #f7fbff)',
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
