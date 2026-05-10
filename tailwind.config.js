/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'selector',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#0d1b4b',
          500: '#0d1b4b', // Navy blue accent
          600: '#0d1b4b', // Navy blue for header
          700: '#0d1b4b',
          800: '#0D1B4B', // Deep navy blue for sidebar
          900: '#0a1628'  // Darker navy for accents
        },
        navy: {
          900: '#0D1B4B', // Deep navy blue
          800: '#1a2a5e', // Slightly lighter navy
          700: '#2a3f7f'
        },
        sky: {
          500: '#0d1b4b', // Sky blue
          600: '#0d1b4b'  // Navy blue
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}

