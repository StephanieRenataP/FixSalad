import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { OrderProvider } from '@/context/OrderContext';
import '@/styles/globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Fix Salad — Salad yang pas buat kamu',
  description: 'Salad dan wrap yang diracik otomatis sesuai target gizi, pantangan, dan budget-mu.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#14432A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="font-sans antialiased">
        <OrderProvider>
          <div className="mx-auto min-h-screen w-full max-w-app bg-cream-50 shadow-[0_0_24px_rgba(20,67,42,0.08)]">
            {children}
          </div>
        </OrderProvider>
      </body>
    </html>
  );
}
