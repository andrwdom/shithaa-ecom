/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        heading: [
          'Space Grotesk',
          'Sora',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        primary: '#E11D48', // Shithaa pink
        accent: '#F472B6',  // Shithaa accent
        background: '#FDF2F8', // Shithaa bg
        brand: '#473C66',
        'brand-dark': '#3B3158',
        theme: {
          light: '#B3AAD1', // Lighter shade
          DEFAULT: '#8B7FBD', // Main theme color
          dark: '#635789', // Darker shade
          50: '#F5F3F9',
          100: '#E9E6F2',
          200: '#D3CDEA',
          300: '#B3AAD1',
          400: '#8B7FBD', // Main theme color
          500: '#635789',
          600: '#4E456D',
          700: '#3A3351',
          800: '#252135',
          900: '#110F19',
        }
      }
    },
  },
  plugins: [],
}