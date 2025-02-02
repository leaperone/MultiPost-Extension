/** @type {import('tailwindcss').Config} */
import { heroui } from "@heroui/react";

module.exports = {
  content: ['./src/**/*.{tsx,html}', "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  // prefix: "plasmo-",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {},
  },
  plugins: [heroui({ addCommonColors: true, defaultTheme: 'light' })],
};
