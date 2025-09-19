'use client';

import { useState, useEffect } from 'react';
import { getJobs, deleteJob, type Job } from '@/lib/api/jobs';
import JobDetailsModal from './JobDetailsModal';
import JobCreationForm from './JobCreationForm';
import { Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface JobListProps {
  refreshTrigger?: number;
}

export default function JobList({ refreshTrigger = 0 }: JobListProps) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState<Job | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());
  const [expandedRequirements, setExpandedRequirements] = useState<Set<number>>(new Set());
  const [expandedResponsibilities, setExpandedResponsibilities] = useState<Set<number>>(new Set());

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getJobs();
      setJobs(response.results);
    } catch (err) {
      console.error('Error loading jobs:', err);
      setError('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [refreshTrigger]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePublishToLinkedIn = (jobId: number) => {
    // Generate a realistic LinkedIn job URL
    const linkedInJobId = `job_${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const linkedInUrl = `https://www.linkedin.com/jobs/view/${linkedInJobId}/`;
    
    // Update job status locally
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              published_to_linkedin: true, 
              linkedin_published_at: new Date().toISOString(),
              linkedin_job_url: linkedInUrl,
              linkedin_job_id: linkedInJobId
            }
          : job
      )
    );
    alert(`Job #${jobId} published to LinkedIn successfully!\n\nDemo URL: ${linkedInUrl}\n\n⚠️ This is a placeholder URL. Replace with actual LinkedIn API response.`);
    console.log(`Publishing job ${jobId} to LinkedIn: ${linkedInUrl}`);
  };

  const handlePublishToNaukri = (jobId: number) => {
    // Generate a realistic Naukri job URL
    const naukriJobId = `naukri_${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const naukriUrl = `https://www.naukri.com/job-detail/${naukriJobId}`;
    
    // Update job status locally
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              published_to_naukri: true, 
              naukri_published_at: new Date().toISOString(),
              naukri_job_url: naukriUrl,
              naukri_job_id: naukriJobId
            }
          : job
      )
    );
    alert(`Job #${jobId} published to Naukri successfully!\n\nDemo URL: ${naukriUrl}\n\n⚠️ This is a placeholder URL. Replace with actual Naukri API response.`);
    console.log(`Publishing job ${jobId} to Naukri: ${naukriUrl}`);
  };

  const handlePublishToBoth = (jobId: number) => {
    // Generate realistic job URLs for both platforms
    const linkedInJobId = `job_${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const linkedInUrl = `https://www.linkedin.com/jobs/view/${linkedInJobId}/`;
    const naukriJobId = `naukri_${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const naukriUrl = `https://www.naukri.com/job-detail/${naukriJobId}`;
    
    // Update job status locally
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              published_to_linkedin: true,
              published_to_naukri: true,
              linkedin_published_at: new Date().toISOString(),
              naukri_published_at: new Date().toISOString(),
              linkedin_job_url: linkedInUrl,
              linkedin_job_id: linkedInJobId,
              naukri_job_url: naukriUrl,
              naukri_job_id: naukriJobId
            }
          : job
      )
    );
    alert(`Job #${jobId} published to both platforms successfully!\n\nDemo URLs:\nLinkedIn: ${linkedInUrl}\nNaukri: ${naukriUrl}\n\n⚠️ These are placeholder URLs. Replace with actual API responses.`);
    console.log(`Publishing job ${jobId} to both platforms - LinkedIn: ${linkedInUrl}, Naukri: ${naukriUrl}`);
  };

  const handleViewDetails = (job: Job) => {
    setSelectedJob(job);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedJob(null);
  };

  const handleEditJob = (job: Job) => {
    setJobToEdit(job);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setJobToEdit(null);
  };

  const handleEditSuccess = () => {
    closeEditModal();
    loadJobs(); // Refresh the job list
  };

  const handleDeleteJob = async (job: Job) => {
    // Only HR users can delete jobs
    if (user?.role !== 'hr') {
      alert('Only HR users can delete jobs.');
      return;
    }

    // Show confirmation dialog
    const confirmDelete = confirm(
      `Are you sure you want to delete "${job.title}"?\n\nThis action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    try {
      setDeletingJobId(job.id);
      await deleteJob(job.id);
      
      // Remove job from local state
      setJobs(prevJobs => prevJobs.filter(j => j.id !== job.id));
      
      alert(`Job "${job.title}" has been deleted successfully.`);
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Failed to delete job. Please try again.');
    } finally {
      setDeletingJobId(null);
    }
  };

  const toggleDescriptionExpanded = (jobId: number) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const toggleRequirementsExpanded = (jobId: number) => {
    setExpandedRequirements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const toggleResponsibilitiesExpanded = (jobId: number) => {
    setExpandedResponsibilities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
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

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="text-center py-8">
          <div className="text-red-500 text-lg mb-2">Error Loading Jobs</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadJobs}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-slate-900">Job Listings</h2>
          <button
            onClick={loadJobs}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200"
          >
            Refresh
          </button>
        </div>
        <p className="text-slate-600 mt-2">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Jobs Yet</h3>
          <p className="text-gray-500">Create your first job posting above to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-md transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {job.title}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full mr-3">
                      {job.department.name}
                    </span>
                    <span>Created {formatDate(job.created_at)}</span>
                  </div>
                  
                  {/* Publishing Status Indicators */}
                  <div className="flex items-center gap-2 mt-2">
                    {job.published_to_linkedin && (
                      <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        Published on LinkedIn
                      </div>
                    )}
                    {job.published_to_naukri && (
                      <div className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Published on Naukri
                      </div>
                    )}
                    {!job.published_to_linkedin && !job.published_to_naukri && (
                      <div className="text-xs text-gray-500 italic">Not published yet</div>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)}`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </span>
              </div>
              
              {/* Job Description */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-gray-800">Job Description:</h4>
                  {job.description && job.description.length > 200 && (
                    <button
                      onClick={() => toggleDescriptionExpanded(job.id)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      {expandedDescriptions.has(job.id) ? 'Show Less' : 'Show More'}
                    </button>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-gray-700 text-sm">
                  <p className={expandedDescriptions.has(job.id) ? '' : 'line-clamp-3'}>
                    {job.description || 'No description available'}
                  </p>
                </div>
              </div>
              
              {/* Requirements */}
              {job.requirements && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-gray-800">Requirements:</h4>
                    {job.requirements.length > 150 && (
                      <button
                        onClick={() => toggleRequirementsExpanded(job.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        {expandedRequirements.has(job.id) ? 'Show Less' : 'Show More'}
                      </button>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-gray-600 text-sm">
                    <p className={expandedRequirements.has(job.id) ? '' : 'line-clamp-2'}>
                      {job.requirements}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Responsibilities */}
              {job.responsibilities && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-gray-800">Responsibilities:</h4>
                    {job.responsibilities.length > 150 && (
                      <button
                        onClick={() => toggleResponsibilitiesExpanded(job.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        {expandedResponsibilities.has(job.id) ? 'Show Less' : 'Show More'}
                      </button>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-gray-600 text-sm">
                    <p className={expandedResponsibilities.has(job.id) ? '' : 'line-clamp-2'}>
                      {job.responsibilities}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Job ID: #{job.id}
                </div>
                <div className="flex gap-2 items-center">
                  <button 
                    onClick={() => handleViewDetails(job)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Details
                  </button>
                  {user?.role === 'hr' && (
                    <button 
                      onClick={() => handleEditJob(job)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                  )}
                  {user?.role === 'hr' && (
                    <button 
                      onClick={() => handleDeleteJob(job)}
                      disabled={deletingJobId === job.id}
                      className="text-red-600 hover:text-red-800 p-1 rounded transition-colors disabled:opacity-50"
                      title="Delete job"
                    >
                      {deletingJobId === job.id ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Interview Process Configuration */}
              {(job as any).interview_stages && (job as any).interview_stages.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Interview Process:
                    </h4>
                    <span className="text-xs text-gray-500">
                      {(job as any).interview_stages.length} stage{(job as any).interview_stages.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3">
                    <div className="flex flex-wrap gap-2">
                      {(job as any).interview_stages.map((stage: any, index: number) => (
                        <div key={stage.id} className="bg-white rounded-lg px-3 py-2 border border-purple-200 shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-semibold">
                              {index + 1}
                            </div>
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{stage.name || `Stage ${index + 1}`}</div>
                              <div className="flex items-center gap-3 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  {stage.interviewerType === 'human' && (
                                    <>
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      Human
                                    </>
                                  )}
                                  {stage.interviewerType === 'ai' && (
                                    <>
                                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                      AI Assisted
                                    </>
                                  )}
                                  {stage.interviewerType === 'hybrid' && (
                                    <>
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      Hybrid
                                    </>
                                  )}
                                </span>
                                {stage.feedbackFormName && (
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {stage.feedbackFormName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Publish Buttons */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => handlePublishToLinkedIn(job.id)}
                    disabled={job.published_to_linkedin}
                    className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 ${
                      job.published_to_linkedin 
                        ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    {job.published_to_linkedin ? 'Published to LinkedIn' : 'LinkedIn'}
                  </button>
                  
                  <button 
                    onClick={() => handlePublishToNaukri(job.id)}
                    disabled={job.published_to_naukri}
                    className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 ${
                      job.published_to_naukri 
                        ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    {job.published_to_naukri ? 'Published to Naukri' : 'Naukri'}
                  </button>
                  
                  <button 
                    onClick={() => handlePublishToBoth(job.id)}
                    disabled={job.published_to_linkedin && job.published_to_naukri}
                    className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 ${
                      job.published_to_linkedin && job.published_to_naukri
                        ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    {job.published_to_linkedin && job.published_to_naukri ? 'Published to Both' : 'Publish to Both'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Job Details Modal */}
      <JobDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={closeDetailsModal}
        job={selectedJob}
      />

      {/* Job Edit Modal */}
      {isEditModalOpen && jobToEdit && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={closeEditModal} />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Edit Job</h2>
                  <button
                    onClick={closeEditModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <JobCreationForm
                  onSuccess={handleEditSuccess}
                  onClose={closeEditModal}
                  editingJob={jobToEdit}
                  isModal={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}