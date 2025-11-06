"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { showToast } from './Toast';
import { playSuccessSound } from '@/lib/sounds';

type ItemReportFormProps = {
  type: 'lost' | 'found';
  onSuccess?: () => void;
};

type FormData = {
  title: string;
  description: string;
  location: string;
  date: string;
  category: string;
  contactInfo: string;
  mobileNumber?: string; // Optional mobile number for lost items
  image: string | null;
  imageFile: File | null;
  // Student who turned in the item (for found items only)
  turnedInByName?: string;
  turnedInByStudentNumber?: string;
  turnedInByContact?: string;
  turnedInByDepartment?: string;
};

export default function ItemReportForm({ type, onSuccess }: ItemReportFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedItemTitle, setSubmittedItemTitle] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [userEmail, setUserEmail] = useState('');

  // Automatically populate user's email from session
  useEffect(() => {
    if (session?.user?.email) {
      setUserEmail(session.user.email);
    }
  }, [session]);

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
    setError('');

    const formElement = e.currentTarget;
    const formDataObj = new FormData(formElement);
    
    // Handle file input
    const file = formDataObj.get('image') as File | null;
    let imageBase64: string | null = null;
    
    // For found items, image is required
    if (!isLost && (!file || file.size === 0)) {
      setError('Photo is required for found items');
      return;
    }
    
    if (file && file.size > 0) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('Only JPG/PNG images are allowed');
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        setError('Image must be under 3MB');
        return;
      }
      
      try {
        const buffer = await file.arrayBuffer();
        const b64 = Buffer.from(buffer).toString('base64');
        imageBase64 = `data:${file.type};base64,${b64}`;
      } catch (err) {
        setError('Failed to process image');
        return;
      }
    }

    // Store form data and show confirmation
    const data: FormData = {
      title: formDataObj.get('title') as string,
      description: formDataObj.get('description') as string,
      location: formDataObj.get('location') as string,
      date: formDataObj.get('date') as string,
      category: formDataObj.get('category') as string,
      contactInfo: formDataObj.get('contactInfo') as string,
      mobileNumber: formDataObj.get('mobileNumber') as string || undefined,
      image: imageBase64,
      imageFile: file && file.size > 0 ? file : null,
      // Student turnin info (found items only)
      turnedInByName: formDataObj.get('turnedInByName') as string || undefined,
      turnedInByStudentNumber: formDataObj.get('turnedInByStudentNumber') as string || undefined,
      turnedInByContact: formDataObj.get('turnedInByContact') as string || undefined,
      turnedInByDepartment: formDataObj.get('turnedInByDepartment') as string || undefined,
    };

    setFormData(data);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!formData) return;

    setSubmitting(true);
    setError('');

    const data = {
      title: formData.title,
      description: formData.description,
      location: formData.location,
      date: formData.date,
      category: formData.category,
      contactInfo: formData.contactInfo,
      mobileNumber: formData.mobileNumber,
      image: formData.image,
      // Student turnin info (found items only)
      turnedInByName: formData.turnedInByName,
      turnedInByStudentNumber: formData.turnedInByStudentNumber,
      turnedInByContact: formData.turnedInByContact,
      turnedInByDepartment: formData.turnedInByDepartment,
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
        setShowConfirmation(false);
        return;
      }

      // Success
      setSubmittedItemTitle(formData.title);
      setShowConfirmation(false);
      setShowSuccessModal(true);
      
      // Play success sound
      playSuccessSound();
      
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
      setShowConfirmation(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditForm = () => {
    setShowConfirmation(false);
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
            
            {/* Student Turnin Information - Only for found items */}
            {!isLost && (
              <div className="space-y-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-xl border-2 border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                    Student Who Turned In Item
                  </h3>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
                  Information about the student who physically brought this item to OSAS
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="group">
                    <label htmlFor="turnedInByName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Student Name
                    </label>
                    <input
                      type="text"
                      name="turnedInByName"
                      id="turnedInByName"
                      maxLength={100}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-950 
                                border border-gray-300 dark:border-gray-700 rounded-xl
                                text-gray-900 dark:text-gray-100
                                placeholder:text-gray-500 dark:placeholder:text-gray-400
                                focus:ring-2 focus:ring-purple-500/50 
                                focus:border-purple-500
                                hover:border-gray-400 dark:hover:border-gray-600
                                transition-all duration-200"
                      placeholder="e.g., Juan Dela Cruz"
                    />
                  </div>

                  <div className="group">
                    <label htmlFor="turnedInByStudentNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Student Number
                    </label>
                    <input
                      type="text"
                      name="turnedInByStudentNumber"
                      id="turnedInByStudentNumber"
                      maxLength={50}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-950 
                                border border-gray-300 dark:border-gray-700 rounded-xl
                                text-gray-900 dark:text-gray-100
                                placeholder:text-gray-500 dark:placeholder:text-gray-400
                                focus:ring-2 focus:ring-purple-500/50 
                                focus:border-purple-500
                                hover:border-gray-400 dark:hover:border-gray-600
                                transition-all duration-200"
                      placeholder="e.g., 2021-12345"
                    />
                  </div>

                  <div className="group">
                    <label htmlFor="turnedInByContact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contact Info
                    </label>
                    <input
                      type="text"
                      name="turnedInByContact"
                      id="turnedInByContact"
                      maxLength={100}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-950 
                                border border-gray-300 dark:border-gray-700 rounded-xl
                                text-gray-900 dark:text-gray-100
                                placeholder:text-gray-500 dark:placeholder:text-gray-400
                                focus:ring-2 focus:ring-purple-500/50 
                                focus:border-purple-500
                                hover:border-gray-400 dark:hover:border-gray-600
                                transition-all duration-200"
                      placeholder="Email or phone number"
                    />
                  </div>

                  <div className="group">
                    <label htmlFor="turnedInByDepartment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Department / Course
                    </label>
                    <input
                      type="text"
                      name="turnedInByDepartment"
                      id="turnedInByDepartment"
                      maxLength={100}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-950 
                                border border-gray-300 dark:border-gray-700 rounded-xl
                                text-gray-900 dark:text-gray-100
                                placeholder:text-gray-500 dark:placeholder:text-gray-400
                                focus:ring-2 focus:ring-purple-500/50 
                                focus:border-purple-500
                                hover:border-gray-400 dark:hover:border-gray-600
                                transition-all duration-200"
                      placeholder="e.g., BS Computer Science"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="group">
              <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contact Information *
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="contactInfo"
                  id="contactInfo"
                  required
                  value={userEmail}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 
                            border border-gray-300 dark:border-gray-700 rounded-xl
                            text-gray-900 dark:text-gray-100
                            cursor-not-allowed
                            focus:ring-2 focus:ring-blue-500/50 
                            focus:border-blue-500
                            transition-all duration-200"
                  placeholder="Your institutional email"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                📧 Your institutional email will be automatically recorded
              </p>
            </div>

            {/* Mobile Number - Only for lost items */}
            {isLost && (
              <div className="group">
                <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mobile Number (optional)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="mobileNumber"
                    id="mobileNumber"
                    maxLength={15}
                    pattern="[0-9+\-\s()]+"
                    className="w-full px-4 py-3 bg-white dark:bg-gray-950 
                              border border-gray-300 dark:border-gray-700 rounded-xl
                              text-gray-900 dark:text-gray-100
                              placeholder:text-gray-500 dark:placeholder:text-gray-400
                              focus:ring-2 focus:ring-blue-500/50 
                              focus:border-blue-500
                              hover:border-gray-400 dark:hover:border-gray-600
                              transition-all duration-200"
                    placeholder="e.g., +63 912 345 6789"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  📱 We may contact you via SMS for urgent updates
                </p>
              </div>
            )}
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

        {/* Confirmation Modal */}
        {showConfirmation && formData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto 
                          animate-in slide-in-from-bottom-4 zoom-in-95 duration-500">
              {/* Header */}
              <div className={`px-8 py-6 border-b border-gray-200 dark:border-gray-800 
                            ${isLost ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20' 
                                     : 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${isLost ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-green-100 dark:bg-green-900/40'}`}>
                    <svg className={`w-6 h-6 ${isLost ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`} 
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Confirm Your Report
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Please review your information before submitting
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-8 py-6 space-y-6">
                {/* Image Preview */}
                {formData.image && (
                  <div className="animate-in slide-in-from-left duration-500 delay-100">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      📸 Photo Preview
                    </label>
                    <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700
                                  shadow-lg hover:shadow-xl transition-shadow duration-300">
                      <img 
                        src={formData.image} 
                        alt="Preview" 
                        className="w-full h-64 object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Item Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="animate-in slide-in-from-left duration-500 delay-150">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      📝 Item Name
                    </label>
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{formData.title}</p>
                    </div>
                  </div>

                  <div className="animate-in slide-in-from-right duration-500 delay-150">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      🏷️ Category
                    </label>
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-900 dark:text-gray-100 font-medium capitalize">{formData.category}</p>
                    </div>
                  </div>

                  <div className="animate-in slide-in-from-left duration-500 delay-200">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      📍 {locationLabel}
                    </label>
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{formData.location || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="animate-in slide-in-from-right duration-500 delay-200">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      📅 {dateLabel}
                    </label>
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-900 dark:text-gray-100 font-medium">
                        {new Date(formData.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="animate-in slide-in-from-bottom duration-500 delay-250">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📄 Description
                  </label>
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{formData.description}</p>
                  </div>
                </div>

                {/* Student Turnin Info - Only for found items */}
                {!isLost && (formData.turnedInByName || formData.turnedInByStudentNumber || formData.turnedInByContact || formData.turnedInByDepartment) && (
                  <div className="animate-in slide-in-from-bottom duration-500 delay-275">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      👤 Student Who Turned In Item
                    </label>
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-800 space-y-2">
                      {formData.turnedInByName && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formData.turnedInByName}</span>
                        </div>
                      )}
                      {formData.turnedInByStudentNumber && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Student Number:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formData.turnedInByStudentNumber}</span>
                        </div>
                      )}
                      {formData.turnedInByContact && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Contact:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formData.turnedInByContact}</span>
                        </div>
                      )}
                      {formData.turnedInByDepartment && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Department/Course:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formData.turnedInByDepartment}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact Info */}
                <div className="animate-in slide-in-from-bottom duration-500 delay-300">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📧 Reported by
                  </label>
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                    <p className="text-blue-900 dark:text-blue-100 font-semibold">{formData.contactInfo}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Institutional Email (Auto-recorded)</p>
                  </div>
                </div>

                {/* Mobile Number - Only for lost items */}
                {isLost && formData.mobileNumber && (
                  <div className="animate-in slide-in-from-bottom duration-500 delay-325">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      📱 Mobile Number
                    </label>
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{formData.mobileNumber}</p>
                    </div>
                  </div>
                )}

                {/* Info Banner */}
                <div className={`p-4 rounded-xl border-2 animate-in slide-in-from-bottom duration-500 delay-350
                              ${isLost 
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
                  <div className="flex gap-3">
                    <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isLost ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`} 
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className={`text-sm ${isLost ? 'text-blue-800 dark:text-blue-200' : 'text-green-800 dark:text-green-200'}`}>
                      {isLost 
                        ? "Once submitted, we'll search for matching found items and notify you if there's a potential match."
                        : "Once submitted, we'll check if this matches any lost item reports and notify the owner."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-8 py-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 
                            flex gap-3 animate-in slide-in-from-bottom duration-500 delay-400">
                <button
                  onClick={handleEditForm}
                  disabled={submitting}
                  className="flex-1 px-6 py-3.5 
                            border-2 border-gray-300 dark:border-gray-600 
                            text-gray-700 dark:text-gray-200 rounded-xl
                            hover:bg-gray-100 dark:hover:bg-gray-700 
                            hover:border-gray-400 dark:hover:border-gray-500 
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200 text-sm font-semibold
                            focus:outline-none focus:ring-2 focus:ring-gray-400/20
                            active:scale-[0.98]"
                >
                  ← Edit Form
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className={`flex-1 px-6 py-3.5 text-white rounded-xl
                            ${isLost 
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' 
                              : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200 text-sm font-semibold
                            shadow-lg hover:shadow-xl
                            focus:outline-none focus:ring-2 focus:ring-blue-500/30
                            active:scale-[0.98] disabled:active:scale-100
                            flex items-center justify-center gap-2`}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Confirm & Submit
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

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
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    <strong>📧 Check your email</strong> for match notifications
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    • Check your inbox and <strong>spam folder</strong> for updates
                    <br />
                    • You can also view notifications in your dashboard
                  </p>
                </div>
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

