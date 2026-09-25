/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: '#fbfaf7',
        'paper-card': '#fffdf8',
        'paper-dark': '#f4f1ea',
        ink: '#1c1b19',
        pen: '#0969da',
        accent: '#ea580c',
        'accent-hover': '#c2410c',
        board: '#1e2922',
        'board-line': '#2d3f35',
        chalk: '#e8e4d8',
        'chalk-yellow': '#f7c948',
        'chalk-cyan': '#9fd3c7',
        'chalk-orange': '#f97316',
        'chalk-pink': '#f472b6',
        line: '#e7e3da',
        muted: '#78716c'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        handwriting: ['Caveat', 'Comic Sans MS', 'cursive'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        'paper': '0 1px 2px rgba(0, 0, 0, 0.05), 0 8px 16px -4px rgba(0, 0, 0, 0.08)',
        'chalkboard': '0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'float': '0 12px 32px -8px rgba(0, 0, 0, 0.15)'
      }
    },
  },
  plugins: [],
}
