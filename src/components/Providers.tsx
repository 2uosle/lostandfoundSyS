"use client";

import { SessionProvider } from 'next-auth/react';
import { ToastContainer } from './Toast';
import Navigation from './Navigation';
import { ThemeProvider } from 'next-themes';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <Navigation />
        {children}
        <ToastContainer />
      </ThemeProvider>
    </SessionProvider>
  );
}

