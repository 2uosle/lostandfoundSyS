"use client";

import { useState } from 'react';
import { showToast } from '@/components/Toast';
import Link from 'next/link';

export default function TestEmailPage() {
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [result, setResult] = useState<any>(null);

  async function sendTestEmail() {
    if (!testEmail && !confirm('Send test email to your own account?')) {
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: testEmail || undefined }),
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        showToast('✅ Test email sent! Check your inbox (and spam folder)', 'success');
      } else {
        showToast(`❌ ${data.error || 'Failed to send test email'}`, 'error');
      }
    } catch (error) {
      showToast('Failed to send test email', 'error');
      setResult({ success: false, error: 'Network error' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Link 
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">📧</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Test Email Configuration
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Verify that your SMTP settings are working correctly
            </p>
          </div>

          <div className="space-y-6">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Test Email Address (Optional)
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Leave empty to use your account email"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                If left empty, the test email will be sent to your logged-in account email
              </p>
            </div>

            {/* Send Button */}
            <button
              onClick={sendTestEmail}
              disabled={sending}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending Test Email...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Test Email
                </>
              )}
            </button>

            {/* Result Display */}
            {result && (
              <div className={`p-4 rounded-lg border ${
                result.success 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {result.success ? '✅' : '❌'}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-1 ${
                      result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                    }`}>
                      {result.success ? 'Email Sent Successfully!' : 'Email Failed'}
                    </h3>
                    <p className={`text-sm ${
                      result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                    }`}>
                      {result.message || result.error}
                    </p>
                    {result.reason && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                        <strong>Reason:</strong> {result.reason}
                      </p>
                    )}
                    {result.details && (
                      <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                What This Tests
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>✓ SMTP server connection</li>
                <li>✓ Authentication credentials</li>
                <li>✓ Email delivery capability</li>
                <li>✓ HTML email rendering</li>
              </ul>
            </div>

            {/* Troubleshooting */}
            <details className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <summary className="cursor-pointer font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Troubleshooting Tips
              </summary>
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p><strong>Email not received?</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Check your spam/junk folder</li>
                  <li>Wait a few minutes - some servers are slow</li>
                  <li>Verify SMTP credentials in environment variables</li>
                  <li>Check server logs for error messages</li>
                </ul>
                <p className="mt-3"><strong>Common Issues:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Gmail:</strong> Must use App Password, not regular password</li>
                  <li><strong>Port 587:</strong> TLS connection (recommended)</li>
                  <li><strong>Port 465:</strong> SSL connection</li>
                  <li><strong>Firewall:</strong> Ensure outbound SMTP is allowed</li>
                </ul>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
