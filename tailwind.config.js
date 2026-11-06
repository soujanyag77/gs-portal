/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kid: {
          blue: '#38bdf8',
          'blue-deep': '#0284c7',
          yellow: '#facc15',
          'yellow-light': '#fef08a',
          orange: '#fb923c',
          pink: '#f472b6',
          'pink-deep': '#ec4899',
          purple: '#c084fc',
          'purple-deep': '#9333ea',
          green: '#4ade80',
          'green-deep': '#16a34a',
          coral: '#fb7185',
          cream: '#fffbeb',
          sky: '#e0f2fe',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'Comic Neue', 'ui-rounded', 'system-ui', 'sans-serif'],
        display: ['Fredoka', 'Nunito', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      boxShadow: {
        'bouncy': '0 8px 0 0 rgba(0, 0, 0, 0.08), 0 12px 24px -4px rgba(0, 0, 0, 0.1)',
        'pop': '0 6px 0 0 rgba(0, 0, 0, 0.12)',
        'pop-hover': '0 2px 0 0 rgba(0, 0, 0, 0.12)',
        'pop-yellow': '0 6px 0 0 #d97706',
        'pop-blue': '0 6px 0 0 #0369a1',
        'pop-green': '0 6px 0 0 #15803d',
        'pop-purple': '0 6px 0 0 #7e22ce',
        'pop-pink': '0 6px 0 0 #be185d',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.95)' },
          '70%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        wiggle: 'wiggle 1s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        pop: 'pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
    },
  },
  plugins: [],
};
