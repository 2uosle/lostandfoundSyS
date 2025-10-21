"use client";

import { SessionProvider } from 'next-auth/react';
import { ToastContainer } from './Toast';
import Navigation from './Navigation';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Navigation />
      {children}
      <ToastContainer />
    </SessionProvider>
  );
}

