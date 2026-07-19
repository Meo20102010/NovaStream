import type { Metadata } from 'next';
import '@/styles/globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'NovaStream - Professional Media Server',
  description: 'Modern, ultra-fast, secure and scalable web-based media server',
  keywords: ['media server', 'video streaming', 'video management', 'video player'],
  openGraph: {
    title: 'NovaStream - Professional Media Server',
    description: 'Modern, ultra-fast, secure and scalable web-based media server',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NovaStream - Professional Media Server',
    description: 'Modern, ultra-fast, secure and scalable web-based media server',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="bg-dark-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
