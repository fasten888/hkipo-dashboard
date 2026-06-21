/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b1220',
        },
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8ecbff',
          400: '#59adff',
          500: '#338cf8',
          600: '#1c6fe8',
          700: '#1959bc',
          800: '#1c4c94',
          900: '#1d4175',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 30px rgba(15, 23, 42, 0.05)',
        modal: '0 24px 80px rgba(15, 23, 42, 0.24)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '"SF Pro Display"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
