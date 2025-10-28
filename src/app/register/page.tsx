"use client";
import React, { useState } from 'react';
import AuthForm from '@/components/AuthForm';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { showToast } from '@/components/Toast';

export default function RegisterPage(){
  const [errors, setErrors] = useState<{ [k: string]: string[] } | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const handle = async (data:any)=>{
    setErrors(undefined);
    setIsLoading(true);
    const res = await fetch('/api/auth/register', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
      let errorMsg = res.statusText;
      try {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const body = await res.json();
          // Capture field errors for inline display
          if (Array.isArray(body?.errors)) {
            const fieldErrors: { [k: string]: string[] } = {};
            for (const e of body.errors) {
              if (!fieldErrors[e.field]) fieldErrors[e.field] = [];
              fieldErrors[e.field].push(e.message);
            }
            setErrors(fieldErrors);
          }
          errorMsg = body?.error || body?.message || body?.errors?.[0]?.message || errorMsg;
        } else {
          const text = await res.text();
          errorMsg = text || errorMsg;
        }
      } catch (_) {
        // ignore parse errors and fall back to status text
      }
      showToast('Registration failed: ' + errorMsg, 'error');
      setIsLoading(false);
      return;
    }
    // auto sign-in
    await signIn('credentials', { redirect: false, email: data.email, password: data.password });
    showToast('Account created successfully!', 'success');
    window.location.href = '/';
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch (error) {
      showToast('Failed to sign in with Google', 'error');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Create Account
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Join our Lost & Found community
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8">
          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5
                     bg-white dark:bg-gray-950 border-2 border-gray-300 dark:border-gray-700 rounded-xl
                     text-gray-700 dark:text-gray-200 font-semibold
                     hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600
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
            {isLoading ? 'Signing up...' : 'Sign up with Institutional Email'}
          </button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium">Or create account with email</span>
            </div>
          </div>

          <AuthForm onSubmit={handle} isRegister errors={errors as any} />
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              🎓 Use your institutional email (@neu.edu.ph) for instant access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
