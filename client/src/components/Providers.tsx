'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(15, 23, 42, 0.9)',
            color: '#e2e8f0',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            backdropFilter: 'blur(20px)',
          },
        }}
      />
      {children}
    </ThemeProvider>
  );
}
