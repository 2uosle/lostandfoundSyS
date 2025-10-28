"use client";

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeTestPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [localStorageValue, setLocalStorageValue] = useState<string | null>(null);
  const [htmlClasses, setHtmlClasses] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Update debug info
    const updateDebugInfo = () => {
      setLocalStorageValue(localStorage.getItem('theme'));
      setHtmlClasses(document.documentElement.className);
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 500);

    return () => clearInterval(interval);
  }, [mounted, theme]);

  const clearTheme = () => {
    localStorage.removeItem('theme');
    window.location.reload();
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading theme...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          🎨 Theme Debug Page
        </h1>

        {/* Current State */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Current State
          </h2>
          
          <div className="space-y-3 font-mono text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-600 dark:text-gray-400 w-48">React State (theme):</span>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded-full font-bold">
                {theme}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-gray-600 dark:text-gray-400 w-48">localStorage['theme']:</span>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 rounded-full font-bold">
                {localStorageValue || 'null'}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-gray-600 dark:text-gray-400 w-48">HTML classList:</span>
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100 rounded-full font-bold">
                {htmlClasses || '(empty)'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-600 dark:text-gray-400 w-48">Resolved Theme:</span>
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100 rounded-full font-bold">
                {resolvedTheme || 'undefined'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-600 dark:text-gray-400 w-48">Detected Mode:</span>
              <span className={`px-3 py-1 rounded-full font-bold ${
                resolvedTheme === 'dark'
                  ? 'bg-gray-800 text-yellow-400'
                  : 'bg-yellow-100 text-gray-800'
              }`}>
                {resolvedTheme === 'dark' ? '🌙 DARK' : '☀️ LIGHT'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Controls
          </h2>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              Toggle Theme (Current: {theme})
            </button>

            <button
              onClick={() => setTheme('light')}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              ☀️ Force Light
            </button>

            <button
              onClick={() => setTheme('dark')}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              🌙 Force Dark
            </button>

            <button
              onClick={clearTheme}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              🗑️ Clear & Reload
            </button>
          </div>
        </div>

        {/* Visual Test */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Visual Test
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">Card 1</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                This text should be dark gray in light mode and light gray in dark mode.
              </p>
            </div>

            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">Card 2</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Background should be light in light mode and dark in dark mode.
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <p className="text-gray-900 dark:text-gray-100">
              Border should be light gray in light mode and darker in dark mode.
            </p>
          </div>
        </div>

        {/* Console Logs */}
        <div className="mt-6 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
            💡 Check the browser console (F12) for detailed logs with 🎨 and ⚡ prefixes
          </p>
        </div>
      </div>
    </div>
  );
}
