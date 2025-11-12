import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        night: {
          50: '#1f2456',
          100: '#1b204d',
          200: '#171c45',
          300: '#14183d',
          400: '#111535',
          500: '#0f122f',
          600: '#0d102b',
          700: '#0b0d26',
          800: '#090b20',
          900: '#07081b',
          DEFAULT: '#0d1024',
        },
        surface: {
          50: '#262b5c',
          100: '#222756',
          200: '#1f2450',
          300: '#1b204a',
          400: '#181d44',
          500: '#161a3a',
          600: '#131634',
          700: '#11132d',
          800: '#0e1027',
          900: '#0c0d21',
        },
        primary: {
          50: '#f2f1ff',
          100: '#e4e1ff',
          200: '#cbc4ff',
          300: '#afa2ff',
          400: '#9783ff',
          500: '#7d65ff',
          600: '#6347ff',
          700: '#5237f9',
          800: '#4325ff',
          900: '#3417dd',
          DEFAULT: '#6f58ff',
          dark: '#4325ff',
        },
        accent: {
          gradientEnd: '#e254ff',
          gradientStart: '#4325ff',
          teal: '#36dba4',
          pink: '#bf40ff',
          warning: '#ffb347',
          amber: '#ffb347',
        },
        text: {
          primary: '#f5f7ff',
          secondary: '#c5c9ff',
          muted: '#8e94d8',
          subtle: '#7a7fb8',
        },
        border: {
          subtle: 'rgba(255,255,255,0.08)',
          strong: 'rgba(255,255,255,0.16)',
        },
      },
      backgroundImage: {
        'body-gradient': 'linear-gradient(160deg, #0d1024 0%, #12163a 35%, #0d1024 75%, #12163a 100%)',
        'accent-gradient': 'linear-gradient(135deg, #4325ff 0%, #bf40ff 45%, #e254ff 100%)',
        'navy-glow': 'radial-gradient(circle at top, rgba(191,64,255,0.25), transparent 55%)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
        display: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
        pill: '999px',
      },
      boxShadow: {
        card: '0 25px 60px rgba(6, 12, 31, 0.55)',
        'card-soft': '0 18px 45px rgba(11, 16, 40, 0.38)',
        glow: '0 0 30px rgba(111, 88, 255, 0.45)',
        'glow-accent': '0 0 40px rgba(191, 64, 255, 0.5)',
        'frosted': '0 12px 45px rgba(5, 10, 35, 0.55)',
      },
      dropShadow: {
        brand: '0px 25px 45px rgba(58, 70, 235, 0.45)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'float-slow': 'float 8s ease-in-out infinite',
        'glow-pulse': 'glowPulse 4s ease-in-out infinite',
        'background-pan': 'backgroundPan 15s linear infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { opacity: '0.65', transform: 'scale(0.98)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        backgroundPan: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
