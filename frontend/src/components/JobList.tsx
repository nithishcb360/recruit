'use client';

import { useState, useEffect } from 'react';
import { getJobs, deleteJob, type Job } from '@/lib/api/jobs';
import { Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface JobListProps {
  refreshTrigger?: number;
  onViewDetails?: (job: Job) => void;
  onEditJob?: (job: Job) => void;
}

export default function JobList({ refreshTrigger = 0, onViewDetails, onEditJob }: JobListProps) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded-lg w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/60 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-lg">
                <div className="h-6 bg-slate-200 rounded-lg w-3/4 mb-3"></div>
                <div className="h-4 bg-slate-200 rounded-lg w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded-lg w-full mb-4"></div>
                <div className="flex justify-between">
                  <div className="h-4 bg-slate-200 rounded-lg w-1/4"></div>
                  <div className="h-6 bg-slate-200 rounded-lg w-16"></div>
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
      <div className="bg-white/80 backdrop-blur-sm border border-red-200 rounded-2xl p-8 shadow-lg">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-red-600 text-base font-semibold mb-2">Error Loading Jobs</div>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={loadJobs}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between ">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Job Listings</h2>
          <p className="text-slate-600 mt-1">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <button
          onClick={loadJobs}
          className="bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 px-4 py-2 rounded-xl border border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-12 shadow-lg text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8zM16 10h.01M12 14h.01M8 14h.01M8 10h.01" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No Jobs Yet</h3>
          <p className="text-slate-600">Create your first job posting to get started with recruitment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-xl transition-all duration-300 shadow-lg"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors duration-200">
                      {job.title}
                    </h3>
                    {job.job_id && (
                      <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-3 py-1 rounded-full font-mono text-xs font-semibold border border-purple-200">
                        {job.job_id}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm mb-3">
                    <span className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-3 py-1.5 rounded-full font-medium border border-blue-200">
                      {job.department.name}
                    </span>
                    {job.experience_range && (
                      <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-3 py-1.5 rounded-full font-medium border border-green-200 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0h2a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h2" />
                        </svg>
                        {job.experience_range} years
                      </span>
                    )}
                    <span className="text-slate-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-3 3m3-3l3 3M4 7h16M4 7v10a2 2 0 002 2h12a2 2 0 002-2V7" />
                      </svg>
                      Created {formatDate(job.created_at)}
                    </span>
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
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-sm ${getStatusColor(job.status)}`}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                  <span className="text-xs text-slate-500">#{job.id}</span>
                </div>
              </div>

              {/* Job Description */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Job Description
                  </h4>
                  {job.description && job.description.length > 200 && (
                    <button
                      onClick={() => toggleDescriptionExpanded(job.id)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors duration-200"
                    >
                      {expandedDescriptions.has(job.id) ? 'Show Less' : 'Show More'}
                    </button>
                  )}
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200">
                  <p className={`text-slate-700 leading-relaxed ${expandedDescriptions.has(job.id) ? '' : 'line-clamp-2'}`}>
                    {job.description || 'No description available'}
                  </p>
                </div>
              </div>
              
              {/* Requirements */}
              {job.requirements && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Requirements
                    </h4>
                    {job.requirements.length > 150 && (
                      <button
                        onClick={() => toggleRequirementsExpanded(job.id)}
                        className="text-emerald-600 hover:text-emerald-800 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors duration-200"
                      >
                        {expandedRequirements.has(job.id) ? 'Show Less' : 'Show More'}
                      </button>
                    )}
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                    <p className={`text-slate-700 leading-relaxed ${expandedRequirements.has(job.id) ? '' : 'line-clamp-2'}`}>
                      {job.requirements}
                    </p>
                  </div>
                </div>
              )}

              {/* Responsibilities */}
              {job.responsibilities && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Responsibilities
                    </h4>
                    {job.responsibilities.length > 150 && (
                      <button
                        onClick={() => toggleResponsibilitiesExpanded(job.id)}
                        className="text-purple-600 hover:text-purple-800 text-xs font-medium bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg transition-colors duration-200"
                      >
                        {expandedResponsibilities.has(job.id) ? 'Show Less' : 'Show More'}
                      </button>
                    )}
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                    <p className={`text-slate-700 leading-relaxed ${expandedResponsibilities.has(job.id) ? '' : 'line-clamp-2'}`}>
                      {job.responsibilities}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Job ID: #{job.id}
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
                              <div className="font-medium text-gray-900 mb-1">{stage.name || `Stage ${index + 1}`}</div>
                              <div className="flex items-center gap-3 text-xs text-gray-600 mb-1">
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
                              {/* Assignee Information */}
                              {stage.assigneeName && (
                                <div className="flex items-center gap-1 text-xs">
                                  <div className="w-4 h-4 bg-indigo-100 rounded-full flex items-center justify-center">
                                    <span className="text-indigo-700 font-semibold text-xs">
                                      {stage.assigneeName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-indigo-700 font-medium">
                                    {stage.assigneeName}
                                  </span>
                                </div>
                              )}
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

              {/* Action Buttons */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <div className="flex gap-3">
                    <button
                      onClick={() => onViewDetails?.(job)}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </button>
                    {user?.role === 'hr' && (
                      <button
                        onClick={() => onEditJob?.(job)}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Job
                      </button>
                    )}
                  </div>
                  {user?.role === 'hr' && (
                    <button
                      onClick={() => handleDeleteJob(job)}
                      disabled={deletingJobId === job.id}
                      className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete job"
                    >
                      {deletingJobId === job.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}