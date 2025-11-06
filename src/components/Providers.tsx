"use client";

import { SessionProvider } from 'next-auth/react';
import { ToastContainer } from './Toast';
import Navigation from './Navigation';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient with optimized settings
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Navigation />
          {children}
          <ToastContainer />
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}