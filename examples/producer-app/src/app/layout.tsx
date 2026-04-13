import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Sidebar } from '@/components/sidebar';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Triggrr — Producer Demo',
  description: 'Event automation engine demo — send events, manage rules, inspect logs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-background text-foreground antialiased`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 p-8 overflow-auto">{children}</main>
        </div>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
