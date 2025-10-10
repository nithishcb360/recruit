'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Briefcase,
  Video,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Download
} from 'lucide-react'

interface InterviewCandidate {
  id: number
  name: string
  email: string
  phone?: string
  status: string
  current_position?: string
  current_company?: string
  experience_level?: string
  skills?: string[]
  resume_file?: string
  description?: string

  // Retell Call Data
  retell_interview_scheduled: boolean
  retell_scheduled_date?: string
  retell_scheduled_time?: string
  retell_scheduled_timezone?: string
  retell_call_summary?: string
  retell_interest_level?: string
  retell_technical_skills?: string[]
  retell_user_sentiment?: string
  retell_recording_url?: string
  retell_public_log_url?: string

  // Assessment Data
  assessment_completed?: boolean
  assessment_score?: number
  assessment_disqualified?: boolean
  assessment_tab_switches?: number
  assessment_video_recording?: string
  assessment_screen_recording?: string

  // Job Info
  jobTitle?: string
}

export default function InterviewsPage() {
  const [candidates, setCandidates] = useState<InterviewCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'pending'>('all')
  const [descriptions, setDescriptions] = useState<Record<number, string>>({})
  const [savingDescription, setSavingDescription] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchInterviewCandidates()
  }, [])

  const fetchInterviewCandidates = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8000/api/candidates/')
      if (response.ok) {
        const data = await response.json()
        const candidatesList = Array.isArray(data) ? data : (data.results || [])

        // Filter candidates with status 'interviewing'
        const interviewingCandidates = candidatesList.filter(
          (c: InterviewCandidate) => c.status === 'interviewing'
        )

        setCandidates(interviewingCandidates)
        console.log(`Found ${interviewingCandidates.length} candidates for interviews`)
      } else {
        toast({
          title: "Error",
          description: "Failed to load interview candidates",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching candidates:', error)
      toast({
        title: "Error",
        description: "Failed to fetch candidates",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const updateCandidateStatus = async (candidateId: number, newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/candidates/${candidateId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        })
      })

      if (response.ok) {
        // Remove from list or update
        if (newStatus === 'hired' || newStatus === 'rejected') {
          setCandidates(prev => prev.filter(c => c.id !== candidateId))
        }

        toast({
          title: "Status Updated",
          description: `Candidate status updated to ${newStatus}`,
          variant: "default"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update status",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: "Error",
        description: "Failed to update candidate status",
        variant: "destructive"
      })
    }
  }

  const saveDescription = async (candidateId: number) => {
    try {
      setSavingDescription(candidateId)
      const description = descriptions[candidateId] || ''

      const response = await fetch(`http://localhost:8000/api/candidates/${candidateId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description
        })
      })

      if (response.ok) {
        // Update candidate in state
        setCandidates(prev => prev.map(c =>
          c.id === candidateId ? { ...c, description: description } : c
        ))

        toast({
          title: "Description Saved",
          description: "Candidate description has been saved successfully",
          variant: "default"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to save description",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error saving description:', error)
      toast({
        title: "Error",
        description: "Failed to save candidate description",
        variant: "destructive"
      })
    } finally {
      setSavingDescription(null)
    }
  }

  const filteredCandidates = candidates.filter(candidate => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'scheduled') return candidate.retell_interview_scheduled
    if (filterStatus === 'pending') return !candidate.retell_interview_scheduled
    return true
  })

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Interviews</h1>
            <p className="text-gray-600 mt-1">Manage and schedule candidate interviews</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <User className="h-4 w-4 mr-2" />
              {candidates.length} Candidate{candidates.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            onClick={() => setFilterStatus('all')}
            size="sm"
            className={filterStatus === 'all' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
          >
            All ({candidates.length})
          </Button>
          <Button
            onClick={() => setFilterStatus('scheduled')}
            size="sm"
            className={filterStatus === 'scheduled' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
          >
            Scheduled ({candidates.filter(c => c.retell_interview_scheduled).length})
          </Button>
          <Button
            onClick={() => setFilterStatus('pending')}
            size="sm"
            className={filterStatus === 'pending' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
          >
            Pending ({candidates.filter(c => !c.retell_interview_scheduled).length})
          </Button>
        </div>

        {/* Candidates List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading candidates...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Candidates Found</h3>
            <p className="text-gray-600">
              {filterStatus === 'all'
                ? 'No candidates are currently in the interview stage.'
                : filterStatus === 'scheduled'
                ? 'No interviews have been scheduled yet.'
                : 'All candidates have scheduled interviews.'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredCandidates.map(candidate => (
              <Card key={candidate.id} className="p-6">
                <div className="space-y-4">
                  {/* Header - Name and Status */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-900">{candidate.name}</h3>
                        <Badge className="bg-blue-100 text-blue-800">
                          Interviewing
                        </Badge>
                      </div>

                      {candidate.jobTitle && (
                        <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          Applied for: {candidate.jobTitle}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateCandidateStatus(candidate.id, 'hired')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Hire
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateCandidateStatus(candidate.id, 'rejected')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      {candidate.email}
                    </div>
                    {candidate.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        {candidate.phone}
                      </div>
                    )}
                  </div>

                  {/* Description Field */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <label htmlFor={`description-${candidate.id}`} className="block text-sm font-semibold text-gray-900 mb-2">
                      Description
                    </label>
                    <textarea
                      id={`description-${candidate.id}`}
                      value={descriptions[candidate.id] ?? candidate.description ?? ''}
                      onChange={(e) => setDescriptions(prev => ({
                        ...prev,
                        [candidate.id]: e.target.value
                      }))}
                      placeholder="Add notes or description about this candidate..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => saveDescription(candidate.id)}
                        disabled={savingDescription === candidate.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {savingDescription === candidate.id ? (
                          <>
                            <Clock className="h-4 w-4 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Save Description
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Interview Schedule */}
                  {candidate.retell_interview_scheduled && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-green-700 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-green-900 mb-2">✅ Interview Scheduled</p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {candidate.retell_scheduled_date && (
                              <div>
                                <span className="text-green-700 font-medium">Date:</span>
                                <p className="text-green-900">
                                  {new Date(candidate.retell_scheduled_date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            )}
                            {candidate.retell_scheduled_time && (
                              <div>
                                <span className="text-green-700 font-medium">Time:</span>
                                <p className="text-green-900">{candidate.retell_scheduled_time}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assessment Results */}
                  {candidate.assessment_completed && (
                    <div className={`border rounded-lg p-4 ${
                      candidate.assessment_disqualified
                        ? 'bg-red-50 border-red-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        <FileText className={`h-5 w-5 mt-0.5 ${
                          candidate.assessment_disqualified ? 'text-red-700' : 'text-blue-700'
                        }`} />
                        <div className="flex-1">
                          <p className={`font-semibold mb-2 ${
                            candidate.assessment_disqualified ? 'text-red-900' : 'text-blue-900'
                          }`}>
                            WebDesk Assessment: {candidate.assessment_disqualified ? 'Failed' : 'Passed'}
                          </p>
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className={candidate.assessment_disqualified ? 'text-red-700' : 'text-blue-700'}>
                                Score:
                              </span>
                              <p className={`font-bold text-lg ${
                                candidate.assessment_disqualified ? 'text-red-900' : 'text-blue-900'
                              }`}>
                                {candidate.assessment_score}%
                              </p>
                            </div>
                            {candidate.assessment_tab_switches !== undefined && (
                              <div>
                                <span className={candidate.assessment_disqualified ? 'text-red-700' : 'text-blue-700'}>
                                  Tab Switches:
                                </span>
                                <p className={candidate.assessment_disqualified ? 'text-red-900' : 'text-blue-900'}>
                                  {candidate.assessment_tab_switches}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Assessment Videos */}
                          {(candidate.assessment_video_recording || candidate.assessment_screen_recording) && (
                            <div className="mt-3 flex gap-2">
                              {candidate.assessment_video_recording && (
                                <a
                                  href={candidate.assessment_video_recording}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                >
                                  <Video className="h-3 w-3" />
                                  Camera Recording
                                </a>
                              )}
                              {candidate.assessment_screen_recording && (
                                <a
                                  href={candidate.assessment_screen_recording}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                >
                                  <Video className="h-3 w-3" />
                                  Screen Recording
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Retell Call Summary */}
                  {candidate.retell_call_summary && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="font-semibold text-purple-900 mb-2">📞 Call Summary:</p>
                      <p className="text-sm text-purple-800">{candidate.retell_call_summary}</p>

                      {/* Additional Retell Info */}
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        {candidate.retell_interest_level && (
                          <div>
                            <span className="text-purple-700 font-medium">Interest Level:</span>
                            <Badge className={`ml-2 ${
                              candidate.retell_interest_level === 'High' ? 'bg-green-100 text-green-800' :
                              candidate.retell_interest_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {candidate.retell_interest_level}
                            </Badge>
                          </div>
                        )}
                        {candidate.retell_user_sentiment && (
                          <div>
                            <span className="text-purple-700 font-medium">Sentiment:</span>
                            <span className="ml-2 text-purple-900">{candidate.retell_user_sentiment}</span>
                          </div>
                        )}
                      </div>

                      {/* Call Recording */}
                      {candidate.retell_recording_url && (
                        <a
                          href={candidate.retell_recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 text-xs text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1"
                        >
                          🎙️ Listen to Call Recording
                        </a>
                      )}
                    </div>
                  )}

                  {/* Skills */}
                  {candidate.skills && candidate.skills.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {candidate.skills.map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resume Download */}
                  {candidate.resume_file && (
                    <div>
                      <a
                        href={candidate.resume_file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Resume
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
