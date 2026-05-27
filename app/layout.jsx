import './globals.css';

export const metadata = {
  title: 'Qamqor',
  description: 'AI-ассистенты для граждан Казахстана',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        {/* Telegram Web App SDK - грузим как глобальный скрипт */}
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
