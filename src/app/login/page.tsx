"use client";
import React from 'react';
import { signIn } from 'next-auth/react';
import AuthForm from '@/components/AuthForm';

export default function LoginPage(){
  const handle = async (data:any)=>{
    const res = await signIn('credentials', { redirect: false, email: data.email, password: data.password });
    if ((res as any)?.error) alert('Login failed');
    else window.location.href = '/';
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Login</h1>
      <AuthForm onSubmit={handle} />
    </div>
  );
}
