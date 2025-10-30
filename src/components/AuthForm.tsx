"use client";
import React from 'react';

type FieldErrors = Partial<{ name: string[]; email: string[]; password: string[] }>;

export default function AuthForm({ onSubmit, isRegister=false, errors }: { onSubmit: (data:any)=>void, isRegister?:boolean, errors?: FieldErrors }){
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');

  return (
    <form 
      onSubmit={(e)=>{ e.preventDefault(); onSubmit({ email, password, name }); }} 
      className="max-w-md mx-auto space-y-6"
    >
      {isRegister && (
        <div className="group">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
            Name
          </label>
          <input
            type="text"
            className={`w-full px-4 py-3 bg-white dark:bg-gray-950
                      border-2 rounded-xl
                      text-gray-900 dark:text-gray-100
                      placeholder:text-gray-500 dark:placeholder:text-gray-400
                      focus:ring-2 transition-all duration-300
                      focus:scale-[1.01]
                      ${errors?.name?.length ? 'border-red-500/60 focus:ring-red-500/40 focus:border-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md hover:shadow-blue-500/10'}`}
            placeholder="Enter your name"
            value={name}
            onChange={(e)=>setName(e.target.value)}
          />
          {errors?.name?.map((msg, i) => (
            <p key={`name-error-${i}`} className="mt-2 text-sm text-red-600 dark:text-red-400 animate-in slide-in-from-left-2 fade-in duration-300">{msg}</p>
          ))}
        </div>
      )}
      <div className="group">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
          Email
        </label>
        <input
          type="email"
          className={`w-full px-4 py-3 bg-white dark:bg-gray-950
                    border-2 rounded-xl
                    text-gray-900 dark:text-gray-100
                    placeholder:text-gray-500 dark:placeholder:text-gray-400
                    focus:ring-2 transition-all duration-300
                    focus:scale-[1.01]
                    ${errors?.email?.length ? 'border-red-500/60 focus:ring-red-500/40 focus:border-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md hover:shadow-blue-500/10'}`}
          placeholder="Enter your email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />
        {errors?.email?.map((msg, i) => (
          <p key={`email-error-${i}`} className="mt-2 text-sm text-red-600 dark:text-red-400 animate-in slide-in-from-left-2 fade-in duration-300">{msg}</p>
        ))}
      </div>
      <div className="group">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
          Password
        </label>
        <input
          type="password"
          className={`w-full px-4 py-3 bg-white dark:bg-gray-950
                    border-2 rounded-xl
                    text-gray-900 dark:text-gray-100
                    placeholder:text-gray-500 dark:placeholder:text-gray-400
                    focus:ring-2 transition-all duration-300
                    focus:scale-[1.01]
                    ${errors?.password?.length ? 'border-red-500/60 focus:ring-red-500/40 focus:border-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md hover:shadow-blue-500/10'}`}
          placeholder="Enter your password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />
        {errors?.password?.map((msg, i) => (
          <p key={`password-error-${i}`} className="mt-2 text-sm text-red-600 dark:text-red-400 animate-in slide-in-from-left-2 fade-in duration-300">{msg}</p>
        ))}
        {isRegister && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Must be at least 8 characters, include one uppercase and one lowercase letter.
          </p>
        )}
      </div>
      <button 
        type="submit"
        className="w-full px-6 py-3.5 text-white rounded-xl
                  bg-gradient-to-r from-blue-600 to-blue-700 
                  hover:from-blue-700 hover:to-blue-800
                  transition-all duration-300 font-semibold
                  shadow-lg hover:shadow-xl hover:shadow-blue-500/30
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2
                  active:scale-[0.98] hover:scale-[1.02]
                  group relative overflow-hidden"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isRegister ? 'Create Account' : 'Sign In'}
          <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </button>
    </form>
  );
}
