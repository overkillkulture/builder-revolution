import './globals.css';
import 'swiper/css';
import 'swiper/css/zoom';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'react-datepicker/dist/react-datepicker.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/cn';
import { Providers } from '@/components/Providers';
import { auth } from '@/auth';
import React from 'react';

const inter = Inter({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
});

export const metadata = {
  title: 'Main Chat',
  description: 'The chat home of the Builder Revolution — Build Guild, Case Builder, and every builder room in one place.',
  openGraph: {
    title: 'Main Chat',
    description: 'The chat home of the Builder Revolution — Build Guild, Case Builder, and every builder room in one place.',
    siteName: 'Main Chat',
    type: 'website',
    images: [
      {
        url: 'https://conciousnessrevolution.io/images/og-case-builder-hq.png',
        width: 1200,
        height: 630,
        alt: 'Main Chat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Main Chat',
    description: 'Secure workspace for case builders. AI crunch engine, pattern library, private rooms.',
    images: ['https://conciousnessrevolution.io/images/og-case-builder-hq.png'],
  },
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en" className="dark overflow-y-scroll">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className={cn('bg-background text-foreground', inter.className)}>
        <Providers session={session}>{children}</Providers>
        <script src="/bug-button.js" defer />
      </body>
    </html>
  );
}
