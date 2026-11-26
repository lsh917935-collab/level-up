/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sky: {
          50: '#f3f8ff',
          100: '#e6f1ff',
          200: '#cfe3ff',
          300: '#a9cdfd',
          400: '#78affa',
          500: '#4a8ff0',
          600: '#2f72d6',
          700: '#2559ab',
        },
        leaf: {
          50: '#effaf3',
          100: '#d6f3e0',
          500: '#22b05a',
          600: '#1a9549',
          700: '#167a3d',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'Noto Sans KR', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(47, 114, 214, 0.08)',
      },
    },
  },
  plugins: [],
}
