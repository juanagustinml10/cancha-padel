import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Superficies */
        bg: '#080D18',
        surface: {
          DEFAULT: '#101A2B',
          2: '#17243A',
        },
        night: '#0A1020',

        /* Texto */
        content: '#F8FAFC',
        ink: '#CBD5E1',
        muted: '#A7B4C8',

        /* Marca */
        brand: {
          DEFAULT: '#2878FF',
          hover: '#1F66DB',
          bright: '#53A1FF',
          soft: 'rgba(40, 120, 255, 0.12)',
        },

        /* Bordes */
        line: {
          DEFAULT: '#27364C',
          strong: '#33455E',
        },

        /* Alias heredados (re-tematizados a la paleta oscura) */
        white: '#F8FAFC',
        navy: '#F8FAFC',
        primary: {
          DEFAULT: '#2878FF',
          hover: '#1F66DB',
          soft: 'rgba(40, 120, 255, 0.12)',
        },
        accent: {
          DEFAULT: '#53A1FF',
          hover: '#2E7FF0',
        },
        blue: {
          50: 'rgba(40, 120, 255, 0.10)',
        },
        border: {
          DEFAULT: '#27364C',
          strong: '#33455E',
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
          DEFAULT: '#53A1FF',
          soft: 'rgba(83, 161, 255, 0.14)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.45), 0 10px 30px -18px rgba(0, 0, 0, 0.7)',
        elevated: '0 24px 60px -24px rgba(0, 0, 0, 0.8)',
        focus: '0 0 0 3px rgba(83, 161, 255, 0.35)',
        glow: '0 0 0 1px rgba(40, 120, 255, 0.35), 0 16px 46px -16px rgba(40, 120, 255, 0.5)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      maxWidth: {
        content: '1200px',
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
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.35s ease-out both',
        'fade-in': 'fade-in 0.25s ease-out both',
        'scale-in': 'scale-in 0.18s ease-out both',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};

export default config;
