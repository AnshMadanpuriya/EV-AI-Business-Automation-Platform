/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ev: {
          dark: '#080C14',
          darker: '#050810',
          card: '#0D1422',
          border: '#1A2540',
          blue: '#0066FF',
          cyan: '#00D4FF',
          green: '#00FF88',
          accent: '#FF6B00',
        }
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(0,102,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,102,255,0.05) 1px, transparent 1px)",
        'hero-glow': "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,102,255,0.25) 0%, transparent 70%)",
        'card-glow': "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,212,255,0.08) 0%, transparent 70%)",
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
        'typing': 'typing 1.5s steps(3) infinite',
      },
      keyframes: {
        float: { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        glow: { 'from': { boxShadow: '0 0 20px rgba(0,102,255,0.3)' }, 'to': { boxShadow: '0 0 40px rgba(0,212,255,0.5)' } },
        slideUp: { 'from': { opacity: '0', transform: 'translateY(20px)' }, 'to': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn: { 'from': { opacity: '0' }, 'to': { opacity: '1' } },
        typing: { '0%, 100%': { content: '.' }, '33%': { content: '..' }, '66%': { content: '...' } },
      },
      boxShadow: {
        'blue-glow': '0 0 30px rgba(0,102,255,0.3)',
        'cyan-glow': '0 0 30px rgba(0,212,255,0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      }
    },
  },
  plugins: [],
};
