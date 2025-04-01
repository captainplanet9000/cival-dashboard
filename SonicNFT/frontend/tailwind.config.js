/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'sonic-background': 'var(--sonic-background)',
        'sonic-card': 'var(--sonic-card)',
        'sonic-card-hover': 'var(--sonic-card-hover)',
        'sonic-primary': 'var(--sonic-primary)',
        'sonic-secondary': 'var(--sonic-secondary)',
        'sonic-tertiary': 'var(--sonic-tertiary)',
        'sonic-text': 'var(--sonic-text)',
        'sonic-muted': 'var(--sonic-muted)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      boxShadow: {
        card: '0 4px 20px -4px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 30px -4px rgba(0, 0, 0, 0.4)',
        'input-focus': '0 0 0 3px rgba(99, 102, 241, 0.2)',
      },
      transitionDuration: {
        '2000': '2000ms',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
} 