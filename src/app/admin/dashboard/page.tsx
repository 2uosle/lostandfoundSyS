import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login?error=unauthorized');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/admin/disposition"
            className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-800 border-l-4 border-l-teal-600"
          >
            <div className="text-4xl mb-3">♻️</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Disposition</h2>
            <p className="text-gray-600 dark:text-gray-400">View donated and disposed items</p>
          </Link>
          <Link
            href="/found"
            className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-800 border-l-4 border-l-green-600"
          >
            <div className="text-4xl mb-3">🧾</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Report Found Item</h2>
            <p className="text-gray-600 dark:text-gray-400">Create a new found item report</p>
          </Link>
          <Link
            href="/admin/items"
            className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-800 border-l-4 border-l-blue-600"
          >
            <div className="text-4xl mb-3">📦</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Manage Items</h2>
            <p className="text-gray-600 dark:text-gray-400">View and manage all lost and found items</p>
          </Link>

          <Link
            href="/admin/history"
            className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-800 border-l-4 border-l-purple-600"
          >
            <div className="text-4xl mb-3">📊</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Activity History</h2>
            <p className="text-gray-600 dark:text-gray-400">View all admin actions and item changes</p>
          </Link>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 border-l-4 border-l-gray-300 opacity-60">
            <div className="text-4xl mb-3">📈</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Statistics</h2>
            <p className="text-gray-600 dark:text-gray-400">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
