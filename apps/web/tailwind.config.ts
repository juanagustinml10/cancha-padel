import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Superficies */
        bg: '#070B14',
        surface: {
          DEFAULT: '#0D1526',
          2: '#14203A',
        },
        night: '#05080F',

        /* Texto */
        content: '#F6F9FF',
        ink: '#C9D4E6',
        muted: '#8A97AE',

        /* Marca */
        brand: {
          DEFAULT: '#2E6BFF',
          hover: '#1B52E6',
          bright: '#4D9BFF',
          soft: 'rgba(46, 107, 255, 0.14)',
        },

        /* Bordes */
        line: {
          DEFAULT: '#1E2B44',
          strong: '#2E405F',
        },

        /* Alias heredados (mismos valores que la marca) */
        white: '#F6F9FF',
        navy: '#F6F9FF',
        primary: {
          DEFAULT: '#2E6BFF',
          hover: '#1B52E6',
          soft: 'rgba(46, 107, 255, 0.14)',
        },
        accent: {
          DEFAULT: '#4D9BFF',
          hover: '#2E6BFF',
        },
        blue: {
          50: 'rgba(46, 107, 255, 0.10)',
        },
        border: {
          DEFAULT: '#1E2B44',
          strong: '#2E405F',
        },

        /* Semánticos */
        success: {
          DEFAULT: '#34D399',
          soft: 'rgba(52, 211, 153, 0.14)',
        },
        warning: {
          DEFAULT: '#FBBF24',
          soft: 'rgba(251, 191, 36, 0.15)',
        },
        danger: {
          DEFAULT: '#F87171',
          soft: 'rgba(248, 113, 113, 0.14)',
        },
        info: {
          DEFAULT: '#4D9BFF',
          soft: 'rgba(77, 155, 255, 0.14)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.02), 0 10px 30px -22px rgba(0,0,0,0.9)',
        elevated: '0 24px 60px -28px rgba(0,0,0,0.95)',
        focus: '0 0 0 3px rgba(46, 107, 255, 0.35)',
        glow: '0 18px 50px -20px rgba(46, 107, 255, 0.55)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      maxWidth: {
        content: '1240px',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.35s ease-out both',
        'fade-in': 'fade-in 0.25s ease-out both',
        'scale-in': 'scale-in 0.18s ease-out both',
        'slide-up': 'slide-up 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};

export default config;
