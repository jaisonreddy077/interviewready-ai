/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#0b1020',
        panel: '#11192b',
        muted: '#8f9bb3',
        accent: '#a8e26e',
      },
    },
  },
  plugins: [],
};
