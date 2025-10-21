"use client";

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;
  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <nav className="bg-white/80 border-b border-gray-200 
                    sticky top-0 z-40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-2 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">🔍</span>
            <span className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 
                           bg-clip-text text-transparent">
              Lost & Found
            </span>
          </Link>

          {/* Main Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <Link
              href="/lost"
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                isActive('/lost')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Report Lost
            </Link>
            <Link
              href="/found"
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                isActive('/found')
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Report Found
            </Link>

            {session?.user && (
              <Link
                href="/dashboard"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  isActive('/dashboard')
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-700 hover:bg-gray-100'
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
                    ? 'bg-red-100 text-red-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Admin
              </Link>
            )}
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-3">
            
            {status === 'loading' ? (
              <div className="w-20 h-9 bg-gray-200 animate-pulse rounded-lg"></div>
            ) : session?.user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700 hidden sm:inline font-medium">
                  {session.user.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="px-4 py-2 text-sm font-medium text-gray-700
                           hover:text-gray-900
                           border border-gray-300 rounded-lg 
                           hover:bg-gray-50 transition-all"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700
                           hover:text-gray-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium text-white 
                           bg-gradient-to-r from-blue-600 to-blue-700
                           hover:from-blue-700 hover:to-blue-800
                           rounded-lg transition-all shadow-sm hover:shadow-md"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200 px-4 py-3 
                      bg-gray-50/50">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/lost"
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              isActive('/lost')
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Report Lost
          </Link>
          <Link
            href="/found"
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              isActive('/found')
                ? 'bg-green-100 text-green-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Report Found
          </Link>
          {session?.user && (
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                isActive('/dashboard')
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-700 hover:bg-gray-100'
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
                  ? 'bg-red-100 text-red-700'
                  : 'text-gray-700 hover:bg-gray-100'
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

