"use client";
import React from 'react';
import AuthForm from '@/components/AuthForm';
import { signIn } from 'next-auth/react';

export default function RegisterPage(){
  const handle = async (data:any)=>{
    const res = await fetch('/api/auth/register', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
      const body = await res.json();
      alert('Register failed: ' + (body?.error || res.statusText));
      return;
    }
    // auto sign-in
    await signIn('credentials', { redirect: false, email: data.email, password: data.password });
    window.location.href = '/';
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Register</h1>
      <AuthForm onSubmit={handle} isRegister />
    </div>
  );
}
