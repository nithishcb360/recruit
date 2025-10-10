'use client';

import { useState } from 'react';
import JobCreationForm from '@/components/JobCreationForm';
import JobList from '@/components/JobList';
import Modal from '@/components/ui/modal';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Job } from '@/lib/api/jobs';

export default function JobsPage() {
  const { user } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isEditJobOpen, setIsEditJobOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const handleJobCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleViewDetails = (job: Job) => {
    setSelectedJob(job);
    setIsViewDetailsOpen(true);
  };

  const closeViewDetails = () => {
    setIsViewDetailsOpen(false);
    setSelectedJob(null);
  };

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setIsEditJobOpen(true);
  };

  const closeEditJob = () => {
    setIsEditJobOpen(false);
    setSelectedJob(null);
  };

  const handleJobUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
    closeViewDetails();
    closeEditJob();
  };

  return (
    <ProtectedRoute requiredRoles={['hr', 'admin']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header Section */}
        <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="space-y-1">
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Jobs Management
                </h1>
                <p className="text-slate-600 text-sm">
                  Manage your job postings and create new opportunities for candidates.
                </p>
              </div>
              {user?.role === 'hr' && (
                <div className="flex-shrink-0">
                  <button
                    onClick={openModal}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center gap-2 w-full sm:w-auto"
                  >
                    <div className="p-1 bg-white/20 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <span className="whitespace-nowrap">Create New Job</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Job List Container */}
          <div className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8zM16 10h.01M12 14h.01M8 14h.01M8 10h.01" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Active Job Postings</h2>
                  <p className="text-slate-600 mt-1">Manage and monitor your current job listings</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <JobList
                refreshTrigger={refreshTrigger}
                onViewDetails={handleViewDetails}
                onEditJob={handleEditJob}
              />
            </div>
          </div>

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

          {/* View Details Modal */}
          <Modal
            isOpen={isViewDetailsOpen}
            onClose={closeViewDetails}
            title="View Job Details"
            maxWidth="4xl"
          >
            {selectedJob && (
              <JobCreationForm
                onSuccess={handleJobUpdated}
                onClose={closeViewDetails}
                editingJob={selectedJob}
                isModal={true}
              />
            )}
          </Modal>

          {/* Edit Job Modal */}
          <Modal
            isOpen={isEditJobOpen}
            onClose={closeEditJob}
            title="Edit Job Posting"
            maxWidth="4xl"
          >
            {selectedJob && (
              <JobCreationForm
                onSuccess={handleJobUpdated}
                onClose={closeEditJob}
                editingJob={selectedJob}
                isModal={true}
              />
            )}
          </Modal>
        </div>
      </div>
    </ProtectedRoute>
  );
}