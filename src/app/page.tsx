import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-24 bg-gray-50">
      <h1 className="text-4xl font-bold mb-8">Lost and Found System</h1>
      <div className="space-y-4">
        <Link 
          href="/lost"
          className="block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Report Lost Item
        </Link>
        <Link 
          href="/found"
          className="block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Report Found Item
        </Link>
        <Link 
          href="/admin/items"
          className="block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Admin Dashboard
        </Link>
      </div>
    </main>
  );
}
