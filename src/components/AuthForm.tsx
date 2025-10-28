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
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Name
          </label>
          <input
            type="text"
            className={`w-full px-4 py-3 bg-white dark:bg-gray-950
                      border rounded-xl
                      text-gray-900 dark:text-gray-100
                      placeholder:text-gray-500 dark:placeholder:text-gray-400
                      focus:ring-2 transition-all duration-200
                      ${errors?.name?.length ? 'border-red-500/60 focus:ring-red-500/40 focus:border-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500/50 focus:border-blue-500 hover:border-gray-400 dark:hover:border-gray-600'}`}
            placeholder="Enter your name"
            value={name}
            onChange={(e)=>setName(e.target.value)}
          />
          {errors?.name?.map((msg, i) => (
            <p key={`name-error-${i}`} className="mt-1 text-sm text-red-600">{msg}</p>
          ))}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email
        </label>
        <input
          type="email"
          className={`w-full px-4 py-3 bg-white dark:bg-gray-950
                    border rounded-xl
                    text-gray-900 dark:text-gray-100
                    placeholder:text-gray-500 dark:placeholder:text-gray-400
                    focus:ring-2 transition-all duration-200
                    ${errors?.email?.length ? 'border-red-500/60 focus:ring-red-500/40 focus:border-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500/50 focus:border-blue-500 hover:border-gray-400 dark:hover:border-gray-600'}`}
          placeholder="Enter your email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />
        {errors?.email?.map((msg, i) => (
          <p key={`email-error-${i}`} className="mt-1 text-sm text-red-600">{msg}</p>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Password
        </label>
        <input
          type="password"
          className={`w-full px-4 py-3 bg-white dark:bg-gray-950
                    border rounded-xl
                    text-gray-900 dark:text-gray-100
                    placeholder:text-gray-500 dark:placeholder:text-gray-400
                    focus:ring-2 transition-all duration-200
                    ${errors?.password?.length ? 'border-red-500/60 focus:ring-red-500/40 focus:border-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500/50 focus:border-blue-500 hover:border-gray-400 dark:hover:border-gray-600'}`}
          placeholder="Enter your password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />
        {errors?.password?.map((msg, i) => (
          <p key={`password-error-${i}`} className="mt-1 text-sm text-red-600">{msg}</p>
        ))}
        {isRegister && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Must be at least 8 characters, include one uppercase and one lowercase letter.
          </p>
        )}
      </div>
      <button 
        type="submit"
        className="w-full px-6 py-3 text-white rounded-xl
                  bg-gradient-to-r from-blue-600 to-blue-700 
                  hover:from-blue-700 hover:to-blue-800
                  transition-all duration-200 font-semibold
                  shadow-lg hover:shadow-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500/30
                  active:scale-[0.98]"
      >
        {isRegister ? 'Create Account' : 'Sign In'}
      </button>
    </form>
  );
}
