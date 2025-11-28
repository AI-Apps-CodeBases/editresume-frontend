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
          50: '#f5f8ff',
          100: '#e9efff',
          200: '#dde6ff',
          300: '#cbd7ff',
          400: '#aebfff',
          500: '#7f9cff',
          600: '#4f78ff',
          700: '#2d5ff5',
          800: '#1d49d1',
          900: '#1538a6',
          DEFAULT: '#1538a6',
        },
        surface: {
          50: '#f8fbff',
          100: '#f1f5ff',
          200: '#e5edff',
          300: '#d7e3ff',
          400: '#c8d8ff',
          500: '#ffffff',
          600: '#f4f6ff',
          700: '#eef2ff',
          800: '#e1e7ff',
          900: '#d5ddff',
        },
        primary: {
          50: '#f2f8ff',
          100: '#d9e8ff',
          200: '#b7d5ff',
          300: '#8cc0ff',
          400: '#5ba4ff',
          500: '#2f8dff',
          600: '#1075ff',
          700: '#0f62fe',
          800: '#0b4fd1',
          900: '#0a47b5',
          DEFAULT: '#0f62fe',
          dark: '#0b4fd1',
        },
        accent: {
          gradientEnd: '#23a6ff',
          gradientStart: '#0f62fe',
          teal: '#0f9d58',
          pink: '#f97316',
          warning: '#f59e0b',
          amber: '#f59e0b',
        },
        text: {
          primary: '#0f172a',
          secondary: '#1f2937',
          muted: '#4b5563',
          subtle: '#6b7280',
        },
        border: {
          subtle: 'rgba(15,23,42,0.08)',
          strong: 'rgba(15,23,42,0.16)',
        },
      },
      backgroundImage: {
        'body-gradient': 'linear-gradient(180deg, #f3f6ff 0%, #ffffff 40%, #eef3ff 100%)',
        'accent-gradient': 'linear-gradient(135deg, #0f62fe 0%, #1b7fff 50%, #23a6ff 100%)',
        'navy-glow': 'radial-gradient(circle at top, rgba(15,98,254,0.18), transparent 55%)',
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
