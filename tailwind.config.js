/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Telegram theme variables — позволяют адаптироваться к теме TG
        'tg-bg': 'var(--tg-theme-bg-color, #f5f5f4)',
        'tg-text': 'var(--tg-theme-text-color, #1c1917)',
        'tg-hint': 'var(--tg-theme-hint-color, #78716c)',
        'tg-link': 'var(--tg-theme-link-color, #4f46e5)',
        'tg-button': 'var(--tg-theme-button-color, #1c1917)',
        'tg-button-text': 'var(--tg-theme-button-text-color, #ffffff)',
        'tg-secondary-bg': 'var(--tg-theme-secondary-bg-color, #ffffff)',
      }
    },
  },
  plugins: [],
};
