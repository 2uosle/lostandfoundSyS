"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/Toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

interface AnalyticsData {
  summary: {
    totalLostItems: number;
    totalFoundItems: number;
    matchedItems: number;
    resolvedItems: number;
    activeUsers: number;
    matchSuccessRate: number;
  };
  categories: { name: string; count: number }[];
  locations: { name: string; count: number }[];
  recentActivity: {
    id: string;
    action: string;
    itemType: string;
    itemTitle: string;
    createdAt: Date;
    performedBy: { name: string | null; email: string | null };
  }[];
  timeSeriesData: { date: string; lost: number; found: number }[];
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0'];

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState(30);

    const exportToCSV = () => {
      if (!data) return;

      // Create CSV content
      let csv = 'Analytics Report\n';
      csv += `Generated: ${new Date().toLocaleString()}\n`;
      csv += `Date Range: Last ${dateRange} days\n\n`;

      // Summary section
      csv += 'SUMMARY\n';
      csv += 'Metric,Value\n';
      csv += `Total Lost Items,${data.summary.totalLostItems}\n`;
      csv += `Total Found Items,${data.summary.totalFoundItems}\n`;
      csv += `Matched Items,${data.summary.matchedItems}\n`;
      csv += `Resolved Items,${data.summary.resolvedItems}\n`;
      csv += `Active Users,${data.summary.activeUsers}\n`;
      csv += `Match Success Rate,${data.summary.matchSuccessRate}%\n\n`;

      // Categories section
      csv += 'CATEGORIES\n';
      csv += 'Category,Count\n';
      data.categories.forEach(cat => {
        csv += `${cat.name},${cat.count}\n`;
      });
      csv += '\n';

      // Locations section
      csv += 'TOP LOCATIONS\n';
      csv += 'Location,Count\n';
      data.locations.forEach(loc => {
        csv += `${loc.name},${loc.count}\n`;
      });
      csv += '\n';

      // Time series section
      csv += 'DAILY STATISTICS\n';
      csv += 'Date,Lost Items,Found Items\n';
      data.timeSeriesData.forEach(day => {
        csv += `${day.date},${day.lost},${day.found}\n`;
      });

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics-report-${dateRange}days-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('CSV exported successfully', 'success');
    };

    const exportToJSON = () => {
      if (!data) return;

      const exportData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          dateRange: `${dateRange} days`,
          reportType: 'Analytics Dashboard Export'
        },
        ...data
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics-data-${dateRange}days-${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('JSON exported successfully', 'success');
    };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || session.user.role !== 'ADMIN') {
      router.push('/login?error=unauthorized');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user && session.user.role === 'ADMIN') {
      loadAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, dateRange]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${dateRange}`);
      const result = await res.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        showToast(result.error || 'Failed to load analytics', 'error');
      }
    } catch {
      showToast('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  📊 Analytics Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  System overview and statistics
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  title="Export as CSV"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
                <button
                  onClick={exportToJSON}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  title="Export as JSON"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  Export JSON
                </button>
              </div>
            </div>
          
          {/* Date Range Selector */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setDateRange(7)}
              className={`px-4 py-2 rounded-lg ${
                dateRange === 7
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}
            >
              Last 7 days
            </button>
            <button
              onClick={() => setDateRange(30)}
              className={`px-4 py-2 rounded-lg ${
                dateRange === 30
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}
            >
              Last 30 days
            </button>
            <button
              onClick={() => setDateRange(90)}
              className={`px-4 py-2 rounded-lg ${
                dateRange === 90
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}
            >
              Last 90 days
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Lost Items</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {data.summary.totalLostItems}
                </p>
              </div>
              <div className="text-4xl">📢</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Found Items</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {data.summary.totalFoundItems}
                </p>
              </div>
              <div className="text-4xl">✨</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Match Success Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {data.summary.matchSuccessRate}%
                </p>
              </div>
              <div className="text-4xl">🎯</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Matched Items</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {data.summary.matchedItems}
                </p>
              </div>
              <div className="text-4xl">🤝</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Resolved Items</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {data.summary.resolvedItems}
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Users</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {data.summary.activeUsers}
                </p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Time Series Chart */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Items Over Time
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                  stroke="#9ca3af"
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f3f4f6'
                  }}
                  labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                />
                <Legend />
                <Line type="monotone" dataKey="lost" stroke="#ef4444" name="Lost Items" strokeWidth={2} />
                <Line type="monotone" dataKey="found" stroke="#10b981" name="Found Items" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Category Distribution */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Items by Category
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.categories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => {
                    const percent = Number(entry.percent) || 0;
                    return `${entry.name || ''} (${(percent * 100).toFixed(0)}%)`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.categories.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f3f4f6'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Location Chart and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Locations */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Top Locations
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.locations} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="name" type="category" width={120} stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f3f4f6'
                  }}
                />
                <Bar dataKey="count" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Recent Activity
            </h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.recentActivity.map((activity) => (
                <div 
                  key={activity.id} 
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {activity.action}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(activity.createdAt), 'MMM dd, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {activity.itemTitle} ({activity.itemType})
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    By: {activity.performedBy.name || activity.performedBy.email || 'Unknown'}
                  </p>
                </div>
              ))}
              {data.recentActivity.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No recent activity
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
