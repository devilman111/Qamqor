import './globals.css';
import { Onest } from 'next/font/google';

const onest = Onest({
  subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-onest'
});

export const metadata = {
  title: 'Qamqor — AI-помощники',
  description: 'Три AI-ассистента: здоровье, право, финансы для граждан Казахстана',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1c1917'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={onest.variable}>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
      </head>
      <body className={onest.className}>{children}</body>
    </html>
  );
}
