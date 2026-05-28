/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // support class-based dark mode
  theme: {
    extend: {
      colors: {
        zyra: {
          // Custom Orange Brand Colors
          primary: {
            DEFAULT: '#f97316', // Orange 500
            light: '#ffedd5',   // Orange 100
            dark: '#c2410c',    // Orange 700
            hover: '#ea580c',   // Orange 600
          },
          // Soft neutrals for layout backgrounds
          gray: {
            bg: '#f4f5f7',
            hover: '#ebecf0',
            border: '#dfe1e6',
            text: '#172b4d',
            darkBg: '#0f172a',  // Dark slate for dark mode layout
            darkCard: '#1e293b',
            darkBorder: '#334155',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
