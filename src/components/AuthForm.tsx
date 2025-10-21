"use client";
import React from 'react';

export default function AuthForm({ onSubmit, isRegister=false }:{ onSubmit: (data:any)=>void, isRegister?:boolean }){
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');

  return (
    <form onSubmit={(e)=>{ e.preventDefault(); onSubmit({ email, password, name }); }} className="max-w-md mx-auto p-4">
      {isRegister && (
        <div className="mb-2">
          <label className="block text-sm">Name</label>
          <input className="w-full border p-2" value={name} onChange={(e)=>setName(e.target.value)} />
        </div>
      )}
      <div className="mb-2">
        <label className="block text-sm">Email</label>
        <input className="w-full border p-2" value={email} onChange={(e)=>setEmail(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="block text-sm">Password</label>
        <input type="password" className="w-full border p-2" value={password} onChange={(e)=>setPassword(e.target.value)} />
      </div>
      <button className="bg-blue-600 text-white px-4 py-2 rounded">{isRegister ? 'Register' : 'Sign in'}</button>
    </form>
  );
}
