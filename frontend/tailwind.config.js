/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          400: '#3b82f6',
          500: '#1e3a5f',
          600: '#162d4a',
          700: '#0f1f33',
        },
      },
    },
  },
  plugins: [],
}
