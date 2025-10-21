"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ReportLostItem() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    // handle file input
    const file = (formData.get('image') as File) || null;
    let imageBase64: string | null = null;
    if (file) {
      if (!['image/jpeg','image/png'].includes(file.type)) {
        setError('Only JPG/PNG images are allowed');
        setSubmitting(false);
        return;
      }
      if (file.size > 3 * 1024 * 1024) { // 3MB
        setError('Image must be under 3MB');
        setSubmitting(false);
        return;
      }
      imageBase64 = await file.arrayBuffer().then(buf => {
        const b64 = Buffer.from(buf).toString('base64');
        return `data:${file.type};base64,${b64}`;
      });
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
      const res = await fetch('/api/items/lost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      
      if (!res.ok) {
        // Show server error in UI instead of throwing so the user sees it clearly
        setError(result?.error || 'Failed to submit report');
        return;
      }

      router.push('/?status=lost-reported');
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold text-gray-800 mb-3 tracking-tight">
            Report Lost Item
          </h1>
          <p className="text-lg text-gray-600">
            Please provide as much detail as possible to help us find your item.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 shadow-sm">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 bg-white/95 backdrop-blur-xl p-8 rounded-2xl 
          shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] border border-gray-100">
          <div className="space-y-6">
            <div className="group">
              <label htmlFor="image" className="block text-sm font-medium text-gray-600 mb-2">
                Photo (optional)
              </label>
              <input
                type="file"
                name="image"
                id="image"
                accept="image/png,image/jpeg"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0 file:text-sm file:font-semibold
                  file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
            </div>
            <div className="group">
              <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                Item Name
                <span className="text-gray-400 font-normal ml-1">Required</span>
              </label>
              <input
                type="text"
                name="title"
                id="title"
                required
                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl
                          shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]
                          focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 
                          hover:border-gray-300 focus:bg-white 
                          transition-all duration-200"
                placeholder="e.g., Blue Nike Backpack"
              />
            </div>

            <div className="group">
              <label htmlFor="category" className="block text-sm font-medium text-gray-600 mb-2">
                Category
              </label>
              <select
                name="category"
                id="category"
                required
                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl
                          shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]
                          focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                          hover:border-gray-300 focus:bg-white
                          transition-all duration-200 appearance-none cursor-pointer"
                style={{ 
                  WebkitAppearance: 'none',
                  background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E") no-repeat right 1rem center/1.25rem`
                }}
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
              <label htmlFor="description" className="block text-sm font-medium text-gray-600 mb-2">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                required
                rows={4}
                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl
                          shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]
                          focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                          hover:border-gray-300 focus:bg-white
                          transition-all duration-200 resize-none min-h-[120px]"
                placeholder="Please provide color, size, distinctive features, etc."
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="group">
                <label htmlFor="location" className="block text-sm font-medium text-gray-600 mb-2">
                  Last Seen Location
                </label>
                <input
                  type="text"
                  name="location"
                  id="location"
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl
                            shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]
                            focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                            hover:border-gray-300 focus:bg-white transition-all duration-200"
                  placeholder="e.g., Library, 2nd floor"
                />
              </div>

              <div className="group">
                <label htmlFor="date" className="block text-sm font-medium text-gray-600 mb-2">
                  Date Lost
                </label>
                <input
                  type="date"
                  name="date"
                  id="date"
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl
                            shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]
                            focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                            hover:border-gray-300 focus:bg-white transition-all duration-200"
                />
              </div>
            </div>
            
            <div className="group">
              <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-600 mb-2">
                Contact Information
              </label>
              <input
                type="text"
                name="contactInfo"
                id="contactInfo"
                required
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl
                          shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]
                          focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                          hover:border-gray-300 focus:bg-white transition-all duration-200"
                placeholder="Email or phone number"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-8">
            <Link 
              href="/"
              className="flex-1 px-6 py-3.5 border-2 border-gray-200 text-gray-700 rounded-2xl
                        hover:bg-gray-50 hover:border-gray-300 text-center 
                        transition-all duration-200 text-sm font-semibold
                        shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)]
                        hover:shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]
                        focus:outline-none focus:ring-2 focus:ring-gray-400/20"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3.5 bg-blue-500 text-white rounded-2xl
                        hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed
                        transition-all duration-200 text-sm font-semibold
                        shadow-[0_2px_8px_rgba(59,130,246,0.25)]
                        hover:shadow-[0_8px_24px_rgba(59,130,246,0.25)]
                        focus:outline-none focus:ring-2 focus:ring-blue-500/30
                        active:scale-[0.98]"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}