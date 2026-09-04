/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ev: {
          dark:   '#080C14',
          darker: '#050810',
          card:   '#0D1422',
          border: '#1A2540',
          blue:   '#0066FF',
          cyan:   '#00D4FF',
          green:  '#00FF88',
          accent: '#FF6B00',
        }
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};