/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0E1F3A',
          dark: '#081326',
          light: '#1E3A5F',
        },
        gold: {
          DEFAULT: '#D97706',
          light: '#F59E0B',
          amber: '#B45309',
          bg: '#FFFBEB',
          border: '#FDE68A'
        },
        steel: {
          bg: '#F8FAFC',
          line: '#E2E8F0',
          muted: '#64748B'
        }
      }
    },
  },
  plugins: [],
}
