"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

type Item = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  lostDate?: Date;
  foundDate?: Date;
  status: string;
  imageUrl: string | null;
  contactInfo: string;
  createdAt: Date;
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lostItems, setLostItems] = useState<Item[]>([]);
  const [foundItems, setFoundItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lost' | 'found'>('lost');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      loadItems();
    }
  }, [session]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const [lostRes, foundRes] = await Promise.all([
        fetch('/api/items/lost'),
        fetch('/api/items/found'),
      ]);

      if (lostRes.ok) {
        const lostData = await lostRes.json();
        setLostItems(lostData.data?.items || []);
      }

      if (foundRes.ok) {
        const foundData = await foundRes.json();
        setFoundItems(foundData.data?.items || []);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your items...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const items = activeTab === 'lost' ? lostItems : foundItems;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600 mt-2">View and manage your reported items</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex mb-6">
          <button
            onClick={() => setActiveTab('lost')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'lost'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Lost Items ({lostItems.length})
          </button>
          <button
            onClick={() => setActiveTab('found')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'found'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Found Items ({foundItems.length})
          </button>
        </div>

        {/* Items Grid */}
        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No {activeTab} items yet
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'lost'
                ? "Haven't lost anything? Lucky you!"
                : "Found something? Help return it to its owner!"}
            </p>
            <Link
              href={`/${activeTab}`}
              className={`inline-block px-6 py-3 ${
                activeTab === 'lost' 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' 
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
              } text-white rounded-lg font-medium transition-all shadow-lg`}
            >
              Report {activeTab === 'lost' ? 'Lost' : 'Found'} Item
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {item.title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : item.status === 'MATCHED'
                          ? 'bg-blue-100 text-blue-800'
                          : item.status === 'CLAIMED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Category:</span>
                      <span className="capitalize">{item.category}</span>
                    </div>
                    {item.location && (
                      <div className="flex items-center">
                        <span className="font-medium mr-2">Location:</span>
                        <span>{item.location}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Date:</span>
                      <span>
                        {format(
                          new Date(item.lostDate || item.foundDate || item.createdAt),
                          'MMM dd, yyyy'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

