import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export default async function AdminDashboard(){
  const session = await getServerSession(authOptions as any);
  if (!session || (session as any).user?.role !== 'ADMIN') {
    // redirect to login
    return (
      <div className="p-8">
        <h1 className="text-xl">Access denied</h1>
        <p>You must be an admin to view this page. <Link href="/login">Sign in</Link></p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl mb-4">Admin Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <Link href="/admin/items" className="p-4 border">Manage Items</Link>
        <Link href="/admin/matches" className="p-4 border">Matches</Link>
        <Link href="/admin/history" className="p-4 border">History</Link>
      </div>
    </div>
  );
}
