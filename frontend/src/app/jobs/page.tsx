'use client';

import { useState } from 'react';
import JobCreationForm from '@/components/JobCreationForm';
import JobList from '@/components/JobList';
import Modal from '@/components/ui/modal';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

export default function JobsPage() {
  const { user } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleJobCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <ProtectedRoute requiredRoles={['hr', 'admin']}>
      <div className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        {/* Header with New Job Button */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                Jobs Management
              </h1>
              <p className="text-lg text-slate-600">
                Manage your job postings and create new opportunities for candidates.
              </p>
            </div>
{user?.role === 'hr' && (
              <button
                onClick={openModal}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Job
              </button>
            )}
          </div>
        </div>

        {/* Job List */}
        <JobList refreshTrigger={refreshTrigger} />

        {/* Job Creation Modal - HR Only */}
        {user?.role === 'hr' && (
          <Modal
            isOpen={isModalOpen}
            onClose={closeModal}
            title="Create New Job Posting"
            maxWidth="4xl"
          >
            <JobCreationForm 
              onJobCreated={handleJobCreated} 
              onClose={closeModal}
              isModal={true}
            />
          </Modal>
        )}
      </div>
    </ProtectedRoute>
  );
}