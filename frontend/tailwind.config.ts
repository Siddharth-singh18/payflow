import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        payflow: {
          ink: '#0b1120',
          page: '#eef5ff',
          text: '#0f172a',
          teal: '#0f766e',
          'teal-dark': '#064e3b',
          mint: '#ccfbf1',
          lime: '#84cc16',
          coral: '#f97316',
          'dark-card': '#111827',
          'dark-bg': '#020617',
          'dark-border': '#1e293b',
          'dark-elevated': '#0f172a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'premium-gradient': 'linear-gradient(135deg, #004a50 0%, #087b70 45%, #009f86 100%)',
        'auth-panel': 'linear-gradient(160deg, #065f56 0%, #0f766e 40%, #0d9488 100%)',
        'sidebar-glow':
          'radial-gradient(circle at 20% 0%, rgba(20,184,166,0.15) 0%, transparent 50%)'
      },
      boxShadow: {
        card: '0 8px 30px rgba(15, 23, 42, 0.04)',
        'card-dark': '0 8px 30px rgba(0, 0, 0, 0.28)',
        glow: '0 20px 50px rgba(4, 120, 104, 0.28)'
      }
    }
  },
  plugins: []
};

export default config;
