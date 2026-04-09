/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'mobile': {'max': '767px'},
      },
      colors: {
        rehearsal: '#3b82f6',
        performance: '#ef4444',
        recording: '#22c55e',
        other: '#6b7280',
      }
    },
  },
  plugins: [],
}
