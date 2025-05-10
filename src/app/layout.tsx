import type {Metadata} from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from '@/components/providers';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'LogLens - Cybersecurity Log Management',
  description: 'Ingest, display, filter, and analyze cybersecurity logs with AI-powered anomaly detection.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          GeistSans.variable, 
          GeistMono.variable
        )}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
