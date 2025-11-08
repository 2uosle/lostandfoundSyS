"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { playNotificationSound, playMatchSound } from '@/lib/sounds';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  itemId: string | null;
  itemType: string | null;
  read: boolean;
  createdAt: Date;
};

export default function NotificationBell() {
  const router = useRouter();
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  
  // Prevent background scroll when the panel is open (helps on mobile)
  useEffect(() => {
    if (showDropdown) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [showDropdown]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        const newNotifications = data.data.notifications;
        const newUnreadCount = data.data.unreadCount;
        
        // Check if there are new unread notifications
        if (newUnreadCount > previousUnreadCount && previousUnreadCount > 0) {
          // Find the newest notification
          const newestNotification = newNotifications.find((n: Notification) => !n.read);
          
          // Play appropriate sound based on notification type
          if (newestNotification?.type === 'ITEM_MATCHED' || newestNotification?.type === 'MATCH_FOUND') {
            playMatchSound();
          } else {
            playNotificationSound();
          }
        }
        
        setNotifications(newNotifications);
        setUnreadCount(newUnreadCount);
        setPreviousUnreadCount(newUnreadCount);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 30 seconds (reduced from 10s)
    // Pause when dropdown is open or tab is hidden
    let interval: NodeJS.Timeout | null = null;
    
    const startPolling = () => {
      if (interval) return;
      interval = setInterval(() => {
        // Only poll if dropdown is closed and tab is visible
        if (!showDropdown && !document.hidden) {
          loadNotifications();
        }
      }, 30000); // 30 seconds instead of 10
    };
    
    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    
    // Start polling immediately
    startPolling();
    
    // Pause/resume polling based on tab visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
        // Reload notifications when tab becomes visible again
        if (!showDropdown) loadNotifications();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [showDropdown]);

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Close dropdown
    setShowDropdown(false);

    const isAdmin = session?.user?.role === 'ADMIN';

    // Admin-specific routing for disposition/storage notifications
    if (isAdmin && notification.type === 'ITEM_RESOLVED') {
      const title = (notification.title || '').toLowerCase();
      if (title.includes('donated')) {
        router.push('/admin/disposition?status=donated');
        return;
      }
      if (title.includes('disposed')) {
        router.push('/admin/disposition?status=disposed');
        return;
      }
      if (title.includes('storage')) {
        router.push('/admin/found-items');
        return;
      }
    }

    // Default navigation based on itemType for non-admins or other types
    if (notification.itemId && notification.itemType === 'LOST') {
      router.push(`/dashboard?openItem=${notification.itemId}`);
    } else if (notification.itemId && notification.itemType === 'FOUND') {
      router.push('/dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ITEM_MATCHED':
        return '🎯';
      case 'MATCH_FOUND':
        return '✨';
      case 'ITEM_CLAIMED':
        return '✅';
      case 'ITEM_RESOLVED':
        return '🎉';
      case 'ITEM_REPORTED':
        return '📝';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-700 dark:text-gray-300 
                   hover:bg-gray-100 dark:hover:bg-gray-800 
                   rounded-lg transition-colors
                   hover:scale-110 active:scale-95"
        aria-label="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center 
                         min-w-[20px] h-5 px-1 text-xs font-bold text-white 
                         bg-red-500 dark:bg-red-600 rounded-full
                         ring-2 ring-white dark:ring-gray-900
                         animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setShowDropdown(false)}
          />

          {/* Mobile: full-screen sheet */}
          <div className="fixed inset-0 z-50 sm:hidden flex flex-col bg-white dark:bg-gray-800 
                          pt-[max(env(safe-area-inset-top),0.5rem)]">
            {/* Header (sticky) */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 
                            bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur
                            sticky top-0 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 dark:text-blue-400 
                               hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    Mark all
                  </button>
                )}
                <button
                  onClick={() => setShowDropdown(false)}
                  aria-label="Close notifications"
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto overscroll-contain scroll-smooth">
              {loading ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <div className="w-8 h-8 border-4 border-blue-600 dark:border-blue-400 
                                border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <div className="text-4xl mb-2">🔔</div>
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 
                                  transition-colors cursor-pointer ${
                        !notification.read
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0 mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-semibold break-words ${
                              !notification.read
                                ? 'text-gray-900 dark:text-gray-100'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full flex-shrink-0 mt-1"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 break-words">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {format(new Date(notification.createdAt), 'MMM dd, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer (sticky) */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 
                              sticky bottom-0 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    window.location.href = '/dashboard';
                  }}
                  className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 
                             hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  View all in dashboard
                </button>
              </div>
            )}
          </div>

          {/* Desktop: dropdown */}
          <div className="hidden sm:flex absolute right-0 mt-2 w-96 
                          bg-white dark:bg-gray-800 rounded-lg shadow-xl 
                          border border-gray-200 dark:border-gray-700 
                          z-50 max-h-[32rem] overflow-hidden flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 
                            flex items-center justify-between bg-gray-50 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <div className="w-8 h-8 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <div className="text-4xl mb-2">🔔</div>
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : 'dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-semibold break-words ${
                              !notification.read ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full flex-shrink-0 mt-1"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 break-words">{notification.message}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{format(new Date(notification.createdAt), 'MMM dd, yyyy h:mm a')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center bg-gray-50 dark:bg-gray-900">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    window.location.href = '/dashboard';
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  View all in dashboard
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

