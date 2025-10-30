"use client";

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';

export default function Navigation() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;
  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <nav className="bg-white/80 border-b border-gray-200 
                    dark:bg-gray-900/80 dark:border-gray-800
                    sticky top-0 z-40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-2 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">🔍</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                           bg-clip-text text-transparent">
              ClaimNEU
            </span>
          </Link>

          {/* Main Navigation (centered on desktop) */}
          <div className="hidden md:flex items-center space-x-2 absolute left-1/2 -translate-x-1/2">
            <Link
              href="/lost"
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                isActive('/lost')
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Report Lost
            </Link>

            {session?.user && (
              <Link
                href="/dashboard"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  isActive('/dashboard')
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                My Items
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  pathname.startsWith('/admin')
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                Admin
              </Link>
            )}
          </div>

          {/* Auth Section (right aligned) */}
          <div className="ml-auto flex items-center gap-2">
            {/* Notification Bell - Only show for logged-in users */}
            {session?.user && (
              <div className="flex-shrink-0">
                <NotificationBell />
              </div>
            )}
            
            {/* Theme toggle */}
            <div className="flex-shrink-0">
              <ThemeToggle />
            </div>
            
            {status === 'loading' ? (
              <div className="w-20 h-9 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg flex-shrink-0"></div>
            ) : session?.user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-200 
                               hidden lg:inline font-medium truncate max-w-[200px]">
                  {session.user.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200
                           hover:text-gray-900 dark:hover:text-white
                           border border-gray-300 dark:border-gray-700 rounded-lg 
                           hover:bg-gray-50 dark:hover:bg-gray-800 transition-all
                           whitespace-nowrap flex-shrink-0"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200
                           hover:text-gray-900 dark:hover:text-white transition-colors
                           whitespace-nowrap"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium text-white 
                           bg-gradient-to-r from-blue-600 to-blue-700
                           hover:from-blue-700 hover:to-blue-800
                           rounded-lg transition-all shadow-sm hover:shadow-md
                           whitespace-nowrap flex-shrink-0"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200 dark:border-gray-800 px-4 py-3 
                      bg-gray-50/50 dark:bg-gray-900/50">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/lost"
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              isActive('/lost')
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            Report Lost
          </Link>
          
          {session?.user && (
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                isActive('/dashboard')
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              My Items
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/dashboard"
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                pathname.startsWith('/admin')
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Admin
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

