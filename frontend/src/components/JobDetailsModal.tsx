'use client';

import Modal from '@/components/ui/modal';
import { Job } from '@/lib/api/jobs';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
}

export default function JobDetailsModal({ isOpen, onClose, job }: JobDetailsModalProps) {
  if (!job) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'paused':
        return 'bg-orange-100 text-orange-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Job Details"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(job.status)}`}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-600">Department:</span>
              <span className="ml-2 text-gray-900">{job.department.name}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Job ID:</span>
              <span className="ml-2 text-gray-900">#{job.id}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Created:</span>
              <span className="ml-2 text-gray-900">{formatDate(job.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Job Description */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
          </div>
        </div>

        {/* Requirements */}
        {job.requirements && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{job.requirements}</p>
            </div>
          </div>
        )}

        {/* Responsibilities */}
        {job.responsibilities && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Responsibilities</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{job.responsibilities}</p>
            </div>
          </div>
        )}

        {/* Additional Details Grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-3">
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-semibold text-gray-600">Experience Level</div>
                <div className="text-gray-900 capitalize">{(job as any).experience_level || 'Not specified'}</div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-semibold text-gray-600">Job Type</div>
                <div className="text-gray-900 capitalize">{(job as any).job_type?.replace('_', ' ') || 'Not specified'}</div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-semibold text-gray-600">Work Type</div>
                <div className="text-gray-900 capitalize">{(job as any).work_type || 'Not specified'}</div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-semibold text-gray-600">Location</div>
                <div className="text-gray-900">{(job as any).location || 'Not specified'}</div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-semibold text-gray-600">Salary Range</div>
                <div className="text-gray-900">{(job as any).salary_range_display || 'Not disclosed'}</div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-semibold text-gray-600">Openings</div>
                <div className="text-gray-900">{(job as any).openings || 1} position{(job as any).openings !== 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Urgency and Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-sm font-semibold text-gray-600">Urgency</div>
            <div className="text-gray-900 capitalize">{(job as any).urgency || 'Medium'}</div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-sm font-semibold text-gray-600">Active Status</div>
            <div className="text-gray-900">{(job as any).is_active ? 'Active' : 'Inactive'}</div>
          </div>
        </div>

        {/* Publishing Status */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Publishing Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="font-semibold text-gray-700">LinkedIn</span>
              </div>
              <div className="text-sm">
                <div className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                  job.published_to_linkedin 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {job.published_to_linkedin ? 'Published' : 'Not Published'}
                </div>
                {job.published_to_linkedin && job.linkedin_published_at && (
                  <div className="text-gray-600 mt-1">
                    <div>Published: {formatDate(job.linkedin_published_at)}</div>
                    {(job as any).linkedin_job_url && (
                      <div className="mt-1">
                        <div className="text-xs text-gray-500 mb-1">Job URL:</div>
                        <div className="bg-gray-50 p-2 rounded text-xs text-gray-700 font-mono break-all">
                          {(job as any).linkedin_job_url}
                        </div>
                        <div className="text-xs text-orange-600 mt-1">
                          ⚠️ Demo URL - Replace with actual LinkedIn job posting URL
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="font-semibold text-gray-700">Naukri</span>
              </div>
              <div className="text-sm">
                <div className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                  job.published_to_naukri 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {job.published_to_naukri ? 'Published' : 'Not Published'}
                </div>
                {job.published_to_naukri && job.naukri_published_at && (
                  <div className="text-gray-600 mt-1">
                    <div>Published: {formatDate(job.naukri_published_at)}</div>
                    {(job as any).naukri_job_url && (
                      <div className="mt-1">
                        <div className="text-xs text-gray-500 mb-1">Job URL:</div>
                        <div className="bg-gray-50 p-2 rounded text-xs text-gray-700 font-mono break-all">
                          {(job as any).naukri_job_url}
                        </div>
                        <div className="text-xs text-orange-600 mt-1">
                          ⚠️ Demo URL - Replace with actual Naukri job posting URL
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              Close
            </button>
            <button className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200">
              Edit Job
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}