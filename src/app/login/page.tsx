"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import Link from 'next/link';
import { showToast } from '@/components/Toast';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [toastShown, setToastShown] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';


  useEffect(() => {
    // Show message if user was redirected here (only once)
    if (callbackUrl !== '/' && !toastShown) {
      showToast('Please sign in to continue', 'info');
      setToastShown(true);
    }
  }, [callbackUrl, toastShown]);

  const handle = async (data:any)=>{
    setIsLoading(true);
    const res = await signIn('credentials', { 
      redirect: false, 
      email: data.email, 
      password: data.password 
    });
    if ((res as any)?.error) {
      showToast('Invalid email or password', 'error');
      setIsLoading(false);
    } else {
      showToast('Welcome back!', 'success');
      window.location.href = callbackUrl;
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl });
    } catch (error) {
      showToast('Failed to sign in with Google', 'error');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👋</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">
            Sign in to your account
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5
                     bg-white border-2 border-gray-300 rounded-xl
                     text-gray-700 font-semibold
                     hover:bg-gray-50 hover:border-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500/30
                     transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed
                     shadow-sm hover:shadow-md
                     active:scale-[0.98] disabled:active:scale-100"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isLoading ? 'Signing in...' : 'Sign in with Institutional Email'}
          </button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">Or continue with email</span>
            </div>
          </div>

          <AuthForm onSubmit={handle} />
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link 
                href="/register" 
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              🎓 Institutional email (@neu.edu.ph) required for Google Sign-In
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
