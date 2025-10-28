"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { showToast } from './Toast';

type ItemReportFormProps = {
  type: 'lost' | 'found';
  onSuccess?: () => void;
};

export default function ItemReportForm({ type, onSuccess }: ItemReportFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedItemTitle, setSubmittedItemTitle] = useState('');

  const isLost = type === 'lost';
  const title = isLost ? 'Report Lost Item' : 'Report Found Item';
  const description = isLost
    ? 'Please provide as much detail as possible to help us find your item.'
    : 'Thank you for helping return this item to its owner.';
  const apiEndpoint = isLost ? '/api/items/lost' : '/api/items/found';
  const primaryColor = isLost ? 'blue' : 'green';
  const locationLabel = isLost ? 'Last Seen Location' : 'Found Location';
  const dateLabel = isLost ? 'Date Lost' : 'Date Found';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    // Handle file input
    const file = formData.get('image') as File | null;
    let imageBase64: string | null = null;
    
    // For found items, image is required
    if (!isLost && (!file || file.size === 0)) {
      setError('Photo is required for found items');
      setSubmitting(false);
      return;
    }
    
    if (file && file.size > 0) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('Only JPG/PNG images are allowed');
        setSubmitting(false);
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        setError('Image must be under 3MB');
        setSubmitting(false);
        return;
      }
      
      try {
        const buffer = await file.arrayBuffer();
        const b64 = Buffer.from(buffer).toString('base64');
        imageBase64 = `data:${file.type};base64,${b64}`;
      } catch (err) {
        setError('Failed to process image');
        setSubmitting(false);
        return;
      }
    }

    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      location: formData.get('location'),
      date: formData.get('date'),
      category: formData.get('category'),
      contactInfo: formData.get('contactInfo'),
      image: imageBase64,
    };

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        // Handle validation errors
        if (result.errors) {
          const errorMessages = result.errors.map((err: any) => err.message).join(', ');
          setError(errorMessages);
        } else {
          setError(result?.error || 'Failed to submit report');
        }
        return;
      }

      // Success
      const itemTitle = (formData.get('title') as string) || 'Item';
      setSubmittedItemTitle(itemTitle);
      setShowSuccessModal(true);
      showToast(
        isLost 
          ? 'Lost item report submitted successfully!' 
          : 'Found item report submitted successfully!',
        'success'
      );
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold text-gray-900 dark:text-gray-100 mb-3 tracking-tight">
            {title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 shadow-sm">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-8 bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-gray-800"
        >
          <div className="space-y-6">
            <div className="group">
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Photo {isLost ? '(optional)' : '(required)'}
                {!isLost && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                type="file"
                name="image"
                id="image"
                accept="image/png,image/jpeg"
                required={!isLost}
                className="block w-full text-sm text-gray-700 dark:text-gray-300 
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0 file:text-sm file:font-semibold
                  file:bg-gray-100 dark:file:bg-gray-800 
                  file:text-gray-700 dark:file:text-gray-200
                  hover:file:bg-gray-200 dark:hover:file:bg-gray-700 
                  transition-all duration-200"
              />
              {!isLost && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  A clear photo helps verify the item and return it to the rightful owner.
                </p>
              )}
            </div>

            <div className="group">
              <label htmlFor="title" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Item Name
                <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">*</span>
              </label>
              <input
                type="text"
                name="title"
                id="title"
                required
                minLength={3}
                maxLength={100}
                className="w-full px-4 py-3.5 bg-white dark:bg-gray-950 
                          border border-gray-300 dark:border-gray-700 rounded-xl
                          text-gray-900 dark:text-gray-100
                          placeholder:text-gray-500 dark:placeholder:text-gray-400
                          focus:ring-2 focus:ring-blue-500/50 
                          focus:border-blue-500
                          hover:border-gray-400 dark:hover:border-gray-600
                          transition-all duration-200"
                placeholder={isLost ? "e.g., Blue Nike Backpack" : "e.g., Black Wallet"}
              />
            </div>

            <div className="group">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                name="category"
                id="category"
                required
                className="w-full px-4 py-3.5 bg-white dark:bg-gray-950 
                          border border-gray-300 dark:border-gray-700 rounded-xl
                          text-gray-900 dark:text-gray-100
                          focus:ring-2 focus:ring-blue-500/50 
                          focus:border-blue-500
                          hover:border-gray-400 dark:hover:border-gray-600
                          transition-all duration-200 appearance-none cursor-pointer
                          bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUgNy41TDEwIDEyLjVMMTUgNy41IiBzdHJva2U9IiM2QjcyODAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=')] 
                          bg-no-repeat bg-[center_right_1rem]"
              >
                <option value="">Select a category</option>
                <option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option>
                <option value="accessories">Accessories</option>
                <option value="documents">Documents</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="group">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                id="description"
                required
                minLength={10}
                maxLength={1000}
                rows={4}
                className="w-full px-4 py-3.5 bg-white dark:bg-gray-950 
                          border border-gray-300 dark:border-gray-700 rounded-xl
                          text-gray-900 dark:text-gray-100
                          placeholder:text-gray-500 dark:placeholder:text-gray-400
                          focus:ring-2 focus:ring-blue-500/50 
                          focus:border-blue-500
                          hover:border-gray-400 dark:hover:border-gray-600
                          transition-all duration-200 resize-none min-h-[120px]"
                placeholder="Please provide color, size, distinctive features, etc."
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="group">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {locationLabel} {!isLost && '*'}
                </label>
                <input
                  type="text"
                  name="location"
                  id="location"
                  required={!isLost}
                  maxLength={200}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-950 
                            border border-gray-300 dark:border-gray-700 rounded-xl
                            text-gray-900 dark:text-gray-100
                            placeholder:text-gray-500 dark:placeholder:text-gray-400
                            focus:ring-2 focus:ring-blue-500/50 
                            focus:border-blue-500
                            hover:border-gray-400 dark:hover:border-gray-600
                            transition-all duration-200"
                  placeholder={isLost ? "e.g., Library, 2nd floor" : "e.g., Cafeteria"}
                />
              </div>

              <div className="group">
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {dateLabel} *
                </label>
                <input
                  type="date"
                  name="date"
                  id="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-950 
                            border border-gray-300 dark:border-gray-700 rounded-xl
                            text-gray-900 dark:text-gray-100
                            focus:ring-2 focus:ring-blue-500/50 
                            focus:border-blue-500
                            hover:border-gray-400 dark:hover:border-gray-600
                            transition-all duration-200"
                />
              </div>
            </div>
            
            <div className="group">
              <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contact Information *
              </label>
              <input
                type="text"
                name="contactInfo"
                id="contactInfo"
                required
                minLength={3}
                maxLength={200}
                className="w-full px-4 py-3 bg-white dark:bg-gray-950 
                          border border-gray-300 dark:border-gray-700 rounded-xl
                          text-gray-900 dark:text-gray-100
                          placeholder:text-gray-500 dark:placeholder:text-gray-400
                          focus:ring-2 focus:ring-blue-500/50 
                          focus:border-blue-500
                          hover:border-gray-400 dark:hover:border-gray-600
                          transition-all duration-200"
                placeholder="Email or phone number"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-8">
            <Link
              href="/"
              className="flex-1 px-6 py-3.5 
                        border-2 border-gray-300 dark:border-gray-700 
                        text-gray-700 dark:text-gray-200 rounded-xl
                        hover:bg-gray-100 dark:hover:bg-gray-800 
                        hover:border-gray-400 dark:hover:border-gray-600 
                        text-center transition-all duration-200 text-sm font-semibold
                        focus:outline-none focus:ring-2 focus:ring-gray-400/20"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 px-6 py-3.5 text-white rounded-xl
                        ${isLost 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-300 disabled:to-blue-400' 
                          : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-green-300 disabled:to-green-400'
                        }
                        disabled:cursor-not-allowed
                        transition-all duration-200 text-sm font-semibold
                        shadow-lg hover:shadow-xl
                        focus:outline-none focus:ring-2 focus:ring-blue-500/30
                        active:scale-[0.98] disabled:active:scale-100`}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <svg
                    className="h-10 w-10 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Successfully Submitted!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-1">
                  Your {isLost ? 'lost' : 'found'} item report for
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  "{submittedItemTitle}"
                </p>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  has been submitted successfully. {isLost ? "We'll notify you if we find a match." : "We'll check for potential matches."}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  You can also check your notifications for updates.
                </p>
                <button
                  onClick={handleCloseModal}
                  className={`w-full px-6 py-3 text-white rounded-xl font-semibold
                    ${isLost 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' 
                      : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                    }
                    transition-all duration-200 shadow-lg hover:shadow-xl
                    focus:outline-none focus:ring-2 focus:ring-blue-500/30`}
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

