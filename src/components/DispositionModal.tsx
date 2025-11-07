import React, { useState } from 'react';

export type DispositionModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: {
    method: 'donated' | 'disposed';
    location: string;
    recipient: string;
    details: string;
  }) => void;
  method: 'donated' | 'disposed';
  itemTitle?: string;
};

export default function DispositionModal({ open, onClose, onSubmit, method, itemTitle }: DispositionModalProps) {
  const [location, setLocation] = useState('');
  const [recipient, setRecipient] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const title = method === 'donated' ? 'Record Donation Details' : 'Record Disposal Details';
  const actionLabel = method === 'donated' ? 'Mark as Donated' : 'Mark as Disposed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">{title}</h2>
        {itemTitle && <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">Item: <span className="font-semibold">{itemTitle}</span></div>}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            await onSubmit({ method, location, recipient, details });
            setSubmitting(false);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Where was it donated/disposed?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">To Whom</label>
            <input
              type="text"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Recipient or buyer name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Details</label>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder={method === 'donated' ? 'Any notes about the donation' : 'How was it disposed (e.g., auction, thrown away)?'}
              rows={3}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
            >
              {actionLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
