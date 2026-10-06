/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        sql: {
          blue: "#38bdf8",
          purple: "#c084fc",
          yellow: "#fde047",
        },
        editor: {
          bg: "#1e1e1e",
          sidebar: "#252526",
          active: "#37373d",
          border: "#3e3e42",
        },
      },
    },
  },
  plugins: [],
}
