'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/modal'
import {
  matchCandidateWithJobs,
  CandidateJobMatch,
  getMatchScoreColor,
  getMatchScoreDescription
} from '@/lib/api/matching'

interface CandidateMatchingModalProps {
  isOpen: boolean
  onClose: () => void
  candidate: any | null
}

export default function CandidateMatchingModal({ isOpen, onClose, candidate }: CandidateMatchingModalProps) {
  const [matches, setMatches] = useState<CandidateJobMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(10)

  useEffect(() => {
    if (isOpen && candidate) {
      fetchMatches()
    }
  }, [isOpen, candidate, limit])

  const fetchMatches = async () => {
    if (!candidate) return

    setLoading(true)
    setError(null)
    try {
      const response = await matchCandidateWithJobs(candidate.id, limit)
      setMatches(response.matches)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch matches')
    } finally {
      setLoading(false)
    }
  }

  const formatExperience = (experienceValue: number | string) => {
    if (!experienceValue) return '0 years'
    const numValue = typeof experienceValue === 'string' ? parseFloat(experienceValue) : experienceValue
    if (numValue < 1) {
      const months = Math.round(numValue * 12)
      return months === 1 ? '1 month' : `${months} months`
    }
    return `${numValue} years`
  }

  const formatSkills = (skills: any) => {
    if (!skills) return 'No skills listed'
    if (Array.isArray(skills)) {
      return skills.length > 0 ? skills.join(', ') : 'No skills listed'
    }
    return typeof skills === 'string' ? skills : 'No skills listed'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!candidate) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Job Matches for: ${candidate.first_name} ${candidate.last_name}`}
      maxWidth="6xl"
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Show top:
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value={5}>5 matches</option>
              <option value={10}>10 matches</option>
              <option value={20}>20 matches</option>
              <option value={50}>50 matches</option>
            </select>
          </div>
          <button
            onClick={fetchMatches}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Matching...' : 'Refresh Matches'}
          </button>
        </div>

        {/* Candidate Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-600">Current Position:</span>
              <span className="ml-2 text-gray-900">{candidate.current_position || 'Not specified'}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Experience:</span>
              <span className="ml-2 text-gray-900">{formatExperience(candidate.experience_years)}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Location:</span>
              <span className="ml-2 text-gray-900">{candidate.location || 'Not specified'}</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="font-semibold text-gray-600 text-sm">Skills:</span>
            <span className="ml-2 text-gray-900 text-sm">{formatSkills(candidate.skills)}</span>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Finding best job matches using AI...</span>
          </div>
        )}

        {/* Matches List */}
        {!loading && matches.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Top {matches.length} Job Matches
              </h3>
              <div className="text-sm text-gray-500">
                Powered by AI semantic matching
              </div>
            </div>

            <div className="grid gap-4">
              {matches.map((match, index) => (
                <div key={match.job.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        #{index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{match.job.title}</h4>
                        <p className="text-sm text-gray-600">
                          {match.job.department?.name || 'Department not specified'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getMatchScoreColor(match.match_score)}`}>
                        {match.match_percentage}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {getMatchScoreDescription(match.match_score)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Experience Level:</span>
                      <div className="text-gray-900 capitalize">
                        {match.job.experience_level || 'Not specified'}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium text-gray-600">Job Type:</span>
                      <div className="text-gray-900 capitalize">
                        {match.job.job_type?.replace('_', ' ') || 'Not specified'}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium text-gray-600">Location:</span>
                      <div className="text-gray-900">{match.job.location || 'Not specified'}</div>
                    </div>

                    <div>
                      <span className="font-medium text-gray-600">Work Type:</span>
                      <div className="text-gray-900 capitalize">{match.job.work_type || 'Not specified'}</div>
                    </div>
                  </div>

                  {/* Job Status and Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3">
                    <div>
                      <span className="font-medium text-gray-600">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        match.job.status === 'active' ? 'bg-green-100 text-green-800' :
                        match.job.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {match.job.status?.charAt(0).toUpperCase() + match.job.status?.slice(1)}
                      </span>
                    </div>

                    <div>
                      <span className="font-medium text-gray-600">Posted:</span>
                      <div className="text-gray-900">{formatDate(match.job.created_at)}</div>
                    </div>
                  </div>

                  {/* Salary Information */}
                  {match.job.salary_range_display && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-600 text-sm">Salary Range:</span>
                      <div className="text-sm text-gray-900 mt-1">{match.job.salary_range_display}</div>
                    </div>
                  )}

                  {/* Required Skills */}
                  {match.job.required_skills && match.job.required_skills.length > 0 && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-600 text-sm">Required Skills:</span>
                      <div className="text-sm text-gray-900 mt-1">
                        {Array.isArray(match.job.required_skills)
                          ? match.job.required_skills.join(', ')
                          : match.job.required_skills}
                      </div>
                    </div>
                  )}

                  {/* Job Description Preview */}
                  {match.job.description && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-600 text-sm">Description:</span>
                      <div className="text-sm text-gray-900 mt-1 line-clamp-2">
                        {match.job.description.length > 200
                          ? `${match.job.description.substring(0, 200)}...`
                          : match.job.description}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Matches */}
        {!loading && matches.length === 0 && !error && (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No job matches found</h3>
            <p className="mt-1 text-sm text-gray-500">
              There are no active jobs that match this candidate's profile.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Matching uses sentence-transformers/all-MiniLM-L6-v2 for semantic similarity
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}