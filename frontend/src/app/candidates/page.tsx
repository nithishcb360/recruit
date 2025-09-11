"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Loader2, SortAsc, SortDesc, Search, X, Trash2 } from "lucide-react"
import CandidateCard from "@/components/candidate-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import InterviewScheduler from "@/components/interview-scheduler"
import BulkCandidateUpload from "@/components/bulk-candidate-upload"
import CandidateNotes from "@/components/candidate-notes"
import ResumeModal from "@/components/ResumeModal"
import CandidateDetailsModal from "@/components/CandidateDetailsModal"
import { UploadCloud } from "lucide-react"
import { getJobApplications, advanceApplicationStage, rejectApplication, type JobApplication, type ApplicationFilters } from "@/lib/api/candidates"
import { deleteCandidate } from "@/lib/api/candidates-new"
import { getJobs, type JobListItem } from "@/lib/api/jobs"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { setScreeningCandidateData } from "@/utils/screeningData"

interface Candidate {
  id: number
  applicationId?: number // Application ID for advancing stages
  name: string
  jobTitle: string
  stage: string
  rating: number
  lastActivity: string
  avatar?: string
  email: string
  phone: string
  location: string
  totalExperience: number
  relevantExperience: number
  skillExperience: { skill: string; years: number }[]
  expectedSalary: string
  noticePeriod: string
  resumeLink: string
  linkedinProfile: string
  notes: string
  interviewHistory: { date: string; type: string; outcome: string }[]
  feedbackSummary: string
  progress: number
  resumeText?: string
  // Enhanced job matching fields
  bestJobMatch?: {
    jobId: number
    jobTitle: string
    matchPercentage: number
    jobMatchDetails: {
      jobTitleScore: number
      departmentScore: number
      experienceScore: number
      locationScore: number
    }
  }
  allJobMatches?: Array<{
    jobId: number
    jobTitle: string
    matchPercentage: number
  }>
  // Additional candidate data for matching
  first_name?: string
  last_name?: string
  skills?: string[]
  experience_years?: number
  experience_level?: string
  current_company?: string
  current_position?: string
}

interface Job {
  id: number
  title: string
  department: { name: string }
  experience_level: string
  required_skills: string[]
  preferred_skills: string[]
  requirements: string
  description: string
  status: string
}

// Experience level hierarchy for scoring (from screening page)
const EXPERIENCE_LEVELS = {
  'entry': 1,
  'junior': 2,
  'mid': 3,
  'senior': 4,
  'lead': 5,
  'principal': 6,
  'director': 7,
  'vp': 8
}

const EXPERIENCE_YEARS_MAP = {
  'entry': { min: 0, max: 1 },
  'junior': { min: 1, max: 3 },
  'mid': { min: 3, max: 6 },
  'senior': { min: 6, max: 10 },
  'lead': { min: 8, max: 15 },
  'principal': { min: 10, max: 20 },
  'director': { min: 12, max: 25 },
  'vp': { min: 15, max: 30 }
}

interface CandidatePipelineProps {
  selectedJobId?: number | null
}

// Job matching algorithm (adapted from screening page)
const calculateJobMatchPercentage = (candidate: any, job: Job) => {
  const baseRandomness = (candidate.id * 7 + job.id * 3) % 30 - 15
  
  // 1. Job Title Matching (30%)
  let jobTitleScore = 70 + baseRandomness + Math.random() * 20
  const candidateTitle = (candidate.current_position || "").toLowerCase()
  const jobTitle = job.title.toLowerCase()
  
  if (candidateTitle && jobTitle) {
    const titleWords = jobTitle.split(' ')
    const candidateTitleWords = candidateTitle.split(' ')
    
    let titleMatches = 0
    titleWords.forEach(word => {
      if (candidateTitleWords.some(cWord => 
        cWord.includes(word) || word.includes(cWord) ||
        (word.includes('senior') && cWord.includes('sr')) ||
        (word.includes('junior') && cWord.includes('jr')) ||
        (word.includes('engineer') && cWord.includes('developer')) ||
        (word.includes('developer') && cWord.includes('engineer'))
      )) {
        titleMatches++
      }
    })
    
    if (titleWords.length > 0) {
      jobTitleScore = (titleMatches / titleWords.length) * 100
    }
  }
  jobTitleScore = Math.max(0, Math.min(100, jobTitleScore))

  // 2. Department Matching (25%)
  let departmentScore = 75 + baseRandomness + Math.random() * 15
  const candidateCompany = (candidate.current_company || "").toLowerCase()
  const jobDepartment = job.department.name.toLowerCase()
  
  if (candidateCompany || candidateTitle) {
    const candidateBackground = `${candidateCompany} ${candidateTitle}`.toLowerCase()
    
    const departmentKeywords: Record<string, string[]> = {
      'engineering': ['engineer', 'developer', 'software', 'tech', 'programming', 'coding'],
      'product': ['product', 'pm', 'manager', 'strategy', 'roadmap'],
      'design': ['designer', 'ux', 'ui', 'creative', 'visual'],
      'marketing': ['marketing', 'growth', 'campaign', 'brand', 'content'],
      'sales': ['sales', 'business development', 'account', 'revenue'],
      'hr': ['hr', 'human resources', 'talent', 'recruiting', 'people'],
      'finance': ['finance', 'accounting', 'financial', 'budget', 'analyst']
    }
    
    const relevantKeywords = departmentKeywords[jobDepartment] || []
    let departmentMatches = 0
    
    relevantKeywords.forEach(keyword => {
      if (candidateBackground.includes(keyword)) {
        departmentMatches++
      }
    })
    
    if (relevantKeywords.length > 0) {
      departmentScore = (departmentMatches / relevantKeywords.length) * 100
    }
  }
  departmentScore = Math.max(0, Math.min(100, departmentScore))

  // 3. Experience Range Matching (25%)
  const jobLevel = EXPERIENCE_LEVELS[job.experience_level as keyof typeof EXPERIENCE_LEVELS] || 3
  const candidateLevel = EXPERIENCE_LEVELS[candidate.experience_level as keyof typeof EXPERIENCE_LEVELS] || 3
  const levelDifference = Math.abs(jobLevel - candidateLevel)
  
  let experienceLevelMatch = 100
  if (levelDifference === 1) experienceLevelMatch = 80
  else if (levelDifference === 2) experienceLevelMatch = 60
  else if (levelDifference === 3) experienceLevelMatch = 40
  else if (levelDifference > 3) experienceLevelMatch = 20

  const expectedYears = EXPERIENCE_YEARS_MAP[job.experience_level as keyof typeof EXPERIENCE_YEARS_MAP]
  let experienceYearsMatch = 80 + baseRandomness
  
  if (candidate.experience_years !== null && expectedYears) {
    if (candidate.experience_years >= expectedYears.min && candidate.experience_years <= expectedYears.max) {
      experienceYearsMatch = 100
    } else if (candidate.experience_years < expectedYears.min) {
      experienceYearsMatch = Math.max(30, (candidate.experience_years / expectedYears.min) * 80)
    } else if (candidate.experience_years > expectedYears.max) {
      experienceYearsMatch = Math.max(70, 100 - ((candidate.experience_years - expectedYears.max) * 5))
    }
  }

  experienceYearsMatch = Math.max(0, Math.min(100, experienceYearsMatch))
  const experienceScore = (experienceLevelMatch * 0.6 + experienceYearsMatch * 0.4)

  // 4. Location Matching (20%)
  let locationScore = 85 + baseRandomness + Math.random() * 10
  const candidateLocation = (candidate.location || "").toLowerCase()
  const jobLocation = "remote" // Default assumption
  
  if (candidateLocation) {
    if (jobLocation === "remote" || candidateLocation.includes("remote")) {
      locationScore = 100
    } else if (candidateLocation.includes(jobLocation) || jobLocation.includes(candidateLocation)) {
      locationScore = 95
    } else {
      locationScore = 70 + Math.random() * 20
    }
  }
  locationScore = Math.max(0, Math.min(100, locationScore))

  // Calculate total weighted score
  const totalScore = Math.round(
    jobTitleScore * 0.30 + 
    departmentScore * 0.25 + 
    experienceScore * 0.25 + 
    locationScore * 0.20
  )

  return {
    totalScore,
    jobTitleScore: Math.round(jobTitleScore),
    departmentScore: Math.round(departmentScore),
    experienceScore: Math.round(experienceScore),
    locationScore: Math.round(locationScore)
  }
}

export default function CandidatePipeline({ selectedJobId = null }: CandidatePipelineProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState<number | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])

  const [searchTerm, setSearchTerm] = useState("")
  const [filterJob, setFilterJob] = useState<string | null>(selectedJobId ? String(selectedJobId) : null)
  const [filterStage, setFilterStage] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'stage' | 'rating' | 'lastActivity'>('lastActivity')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterRating, setFilterRating] = useState<string | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false)
  const [selectedCandidateForSchedule, setSelectedCandidateForSchedule] = useState<Candidate | null>(null)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [selectedCandidateForNotes, setSelectedCandidateForNotes] = useState<Candidate | null>(null)
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false)
  const [selectedCandidateForResume, setSelectedCandidateForResume] = useState<Candidate | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedCandidateForDetails, setSelectedCandidateForDetails] = useState<Candidate | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null)

  // Load real candidates from API
  const fetchCandidates = async () => {
    try {
      console.log('Attempting to fetch candidates from:', 'http://localhost:8000/api/candidates/')
      const response = await fetch('http://localhost:8000/api/candidates/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout and error handling
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })
      if (response.ok) {
        const data = await response.json()
        const candidatesList = Array.isArray(data) ? data : (data.results || [])
        
        // Transform API candidates to display format
        const transformedCandidates = candidatesList.map((candidate: any) => ({
          id: candidate.id,
          name: candidate.full_name || `${candidate.first_name} ${candidate.last_name}`,
          jobTitle: 'Available', // Since these are not associated with specific jobs yet
          stage: 'Available',
          rating: candidate.rating || 0,
          lastActivity: formatDate(candidate.updated_at || candidate.created_at),
          avatar: null, // No avatar
          email: candidate.email || '',
          phone: candidate.phone || '',
          location: candidate.location || '',
          totalExperience: candidate.experience_years || 0,
          relevantExperience: 0,
          skillExperience: candidate.skills?.map((skill: string) => ({ skill, years: 0 })) || [],
          expectedSalary: candidate.salary_expectation ? `$${candidate.salary_expectation}` : '',
          noticePeriod: candidate.availability || '',
          resumeLink: '#',
          linkedinProfile: '#',
          notes: '',
          interviewHistory: [],
          feedbackSummary: '',
          progress: 0, // Available/not yet applied
          resumeText: candidate.resume_text || '',
          // Additional fields for job matching
          first_name: candidate.first_name,
          last_name: candidate.last_name,
          skills: candidate.skills || [],
          experience_years: candidate.experience_years,
          experience_level: candidate.experience_level,
          current_company: candidate.current_company,
          current_position: candidate.current_position
        }))
        
        // Remove duplicates based on email and name
        const uniqueCandidates = transformedCandidates.filter((candidate, index, self) => {
          // Find if there's any candidate with same email or same name that appears earlier
          const duplicateIndex = self.findIndex(c => 
            (c.email && candidate.email && c.email.toLowerCase() === candidate.email.toLowerCase()) ||
            (c.name && candidate.name && c.name.toLowerCase() === candidate.name.toLowerCase())
          )
          
          // Keep only the first occurrence (earliest index)
          return duplicateIndex === index
        })
        
        setCandidates(uniqueCandidates)
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error fetching candidates:', error)
      
      let errorMessage = "Failed to load candidate data."
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        errorMessage = "Cannot connect to backend server. Please ensure the Django server is running on http://localhost:8000"
      } else if (error instanceof Error && error.name === 'TimeoutError') {
        errorMessage = "Request timed out. Backend server may be slow or unresponsive."
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`
      }
      
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        type: typeof error,
        name: error instanceof Error ? error.name : 'Unknown'
      })
      
      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive"
      })
      
      // Set empty candidates array to prevent UI issues
      setCandidates([])
    }
  }

  // Load applications and jobs data
  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [jobsResponse] = await Promise.all([
        getJobs(),
        fetchCandidates()
      ])
      
      setJobs(jobsResponse.results)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: "Failed to load data. Please refresh the page.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    console.log('useEffect triggered - selectedJobId changed:', selectedJobId)
    fetchData()
  }, [selectedJobId])

  // Handle new candidates from bulk upload
  const handleCandidatesCreated = async (newCandidates: any[]) => {
    if (!newCandidates || newCandidates.length === 0) {
      console.log('No new candidates to add')
      return
    }

    console.log('New candidates uploaded:', newCandidates.length)
    
    // Show success toast
    toast({
      title: "Candidates Added",
      description: `${newCandidates.length} candidate(s) added successfully. Refreshing list...`,
      variant: "default"
    })

    // Refresh the candidates list from API to get the latest data
    // This ensures the candidates persist after page refresh
    await fetchCandidates()
  }


  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '1d ago'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)}w ago`
    return `${Math.ceil(diffDays / 30)}m ago`
  }

  useEffect(() => {
    if (selectedJobId) {
      setFilterJob(String(selectedJobId))
    }
  }, [selectedJobId])

  const stages = ["Available", "Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"]

  // Calculate job match percentages for all active jobs
  const candidatesWithJobMatch = React.useMemo(() => {
    if (!jobs || jobs.length === 0) {
      return candidates
    }
    
    // Filter only active/open jobs
    const activeJobs = jobs.filter(job => (job as any).status === 'active' || (job as any).status === 'open' || !(job as any).status)
    
    return candidates.map(candidate => {
      const allMatches: Array<{jobId: number, jobTitle: string, matchPercentage: number}> = []
      let bestMatch = null
      let bestScore = 0
      
      // Calculate match for all active jobs
      activeJobs.forEach(job => {
        const matchData = calculateJobMatchPercentage(candidate, job as any)
        const match = {
          jobId: job.id,
          jobTitle: job.title,
          matchPercentage: matchData.totalScore
        }
        allMatches.push(match)
        
        // Track best match
        if (matchData.totalScore > bestScore) {
          bestScore = matchData.totalScore
          bestMatch = {
            jobId: job.id,
            jobTitle: job.title,
            matchPercentage: matchData.totalScore,
            jobMatchDetails: {
              jobTitleScore: matchData.jobTitleScore,
              departmentScore: matchData.departmentScore,
              experienceScore: matchData.experienceScore,
              locationScore: matchData.locationScore
            }
          }
        }
      })
      
      // Sort matches by percentage (highest first)
      allMatches.sort((a, b) => b.matchPercentage - a.matchPercentage)
      
      return {
        ...candidate,
        bestJobMatch: bestMatch,
        allJobMatches: allMatches,
        progress: bestMatch ? bestMatch.matchPercentage : candidate.progress
      }
    })
  }, [candidates, jobs])

  // Get selected job for matching
  const selectedJob = filterJob && filterJob !== 'all' ? jobs.find(job => String(job.id) === filterJob) : null

  // Enhanced filtering with job matching
  const filteredAndSortedCandidates = candidatesWithJobMatch.filter((candidate) => {
    if (!candidate || typeof candidate !== 'object') {
      return false;
    }
    const matchesSearch = searchTerm
      ? (candidate.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (candidate.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (candidate.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (candidate.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (candidate.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
      : true
    
    // If a specific job is selected, show all candidates (we'll show match percentages)
    const matchesJob = true // Show all candidates when job is selected for matching
    
    const matchesStage = filterStage && filterStage !== 'all' ? candidate.stage === filterStage : true
    const matchesRating = filterRating && filterRating !== 'all'
      ? (() => {
          const [min, max] = filterRating.split('-').map(Number)
          return candidate.rating >= min && candidate.rating <= max
        })()
      : true
    return matchesSearch && matchesJob && matchesStage && matchesRating
  })
  
  // If a job is selected, add match percentages and sort by match score
  .map(candidate => {
    if (selectedJob) {
      const matchData = calculateJobMatchPercentage(candidate, selectedJob as any)
      return {
        ...candidate,
        selectedJobMatch: {
          jobId: selectedJob.id,
          jobTitle: selectedJob.title,
          matchPercentage: matchData.totalScore,
          jobMatchDetails: {
            jobTitleScore: matchData.jobTitleScore,
            departmentScore: matchData.departmentScore,
            experienceScore: matchData.experienceScore,
            locationScore: matchData.locationScore
          }
        }
      }
    }
    return candidate
  })
  .sort((a, b) => {
    // If a job is selected, sort by match percentage first
    if (selectedJob && a.selectedJobMatch && b.selectedJobMatch) {
      return b.selectedJobMatch.matchPercentage - a.selectedJobMatch.matchPercentage
    }
    
    // Otherwise use normal sorting
    let aValue: any, bValue: any
    
    switch (sortBy) {
      case 'name':
        aValue = (a.name || '').toLowerCase()
        bValue = (b.name || '').toLowerCase()
        break
      case 'stage':
        const stageOrder = ['Available', 'Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']
        aValue = stageOrder.indexOf(a.stage || '')
        bValue = stageOrder.indexOf(b.stage || '')
        break
      case 'rating':
        aValue = a.rating || 0
        bValue = b.rating || 0
        break
      case 'lastActivity':
      default:
        aValue = new Date((a.lastActivity || '') === '1d ago' ? Date.now() - 86400000 : 
                         (a.lastActivity || '') === '2d ago' ? Date.now() - 172800000 :
                         Date.now() - 604800000).getTime()
        bValue = new Date((b.lastActivity || '') === '1d ago' ? Date.now() - 86400000 : 
                         (b.lastActivity || '') === '2d ago' ? Date.now() - 172800000 :
                         Date.now() - 604800000).getTime()
        break
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const handleAdvanceStage = async (candidateId: number) => {
    const candidate = candidates.find(c => c.id === candidateId)
    if (!candidate || !candidate.applicationId) return

    try {
      setIsActionLoading(candidateId)
      await advanceApplicationStage(candidate.applicationId)
      
      toast({
        title: "Success!",
        description: `${candidate.name} has been advanced to the next stage.`,
        variant: "default"
      })
      
      // Refresh data
      const [applicationsResponse] = await Promise.all([
        getJobApplications({ job: selectedJobId || undefined })
      ])
      
      setApplications(applicationsResponse.results)
      const transformedCandidates = applicationsResponse.results.map(transformApplicationToCandidate)
      setCandidates(transformedCandidates)
      
    } catch (error: any) {
      console.error('Error advancing stage:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to advance candidate stage.",
        variant: "destructive"
      })
    } finally {
      setIsActionLoading(null)
    }
  }

  const handleRejectCandidate = async (candidateId: number) => {
    const candidate = candidates.find(c => c.id === candidateId)
    if (!candidate || !candidate.applicationId) return

    try {
      setIsActionLoading(candidateId)
      await rejectApplication(candidate.applicationId, 'Rejected by recruiter')
      
      toast({
        title: "Candidate Rejected",
        description: `${candidate.name} has been rejected.`,
        variant: "default"
      })
      
      // Refresh data
      const [applicationsResponse] = await Promise.all([
        getJobApplications({ job: selectedJobId || undefined })
      ])
      
      setApplications(applicationsResponse.results)
      const transformedCandidates = applicationsResponse.results.map(transformApplicationToCandidate)
      setCandidates(transformedCandidates)
      
    } catch (error: any) {
      console.error('Error rejecting candidate:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to reject candidate.",
        variant: "destructive"
      })
    } finally {
      setIsActionLoading(null)
    }
  }

  const handleDeleteCandidate = (candidateId: number) => {
    const candidate = candidates.find(c => c.id === candidateId)
    if (!candidate) {
      console.error('Candidate not found:', candidateId)
      return
    }

    // Show confirmation dialog
    setCandidateToDelete(candidate)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteCandidate = async () => {
    if (!candidateToDelete) return

    console.log('Deleting candidate:', candidateToDelete.id, candidateToDelete.name)

    try {
      setIsActionLoading(candidateToDelete.id)
      
      // Make API call to delete candidate from backend
      console.log('Making DELETE API call...')
      await deleteCandidate(candidateToDelete.id)
      
      console.log('API deletion successful, updating UI...')
        
        // Successfully deleted from backend, now remove from local state
        setCandidates(prev => {
          const updated = prev.filter(c => c.id !== candidateToDelete.id)
          console.log('Updated candidates list:', updated.length, 'candidates remaining')
          return updated
        })
        setApplications(prev => prev.filter(app => app.candidate === candidateToDelete.id || app.id === candidateToDelete.id))
        
        toast({
          title: "Candidate Deleted",
          description: `${candidateToDelete.name} has been permanently deleted.`,
          variant: "default"
        })
        
        // Close dialog and reset state
        setIsDeleteDialogOpen(false)
        setCandidateToDelete(null)
        console.log('Deletion completed successfully')
      
    } catch (error: any) {
      console.error('Error deleting candidate:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete candidate. Please try again.",
        variant: "destructive"
      })
      
      // Close dialog and reset state on error too
      setIsDeleteDialogOpen(false)
      setCandidateToDelete(null)
    } finally {
      setIsActionLoading(null)
    }
  }

  const handleViewDetails = (candidateId: number) => {
    const candidate = candidates.find((c) => c.id === candidateId)
    if (candidate) {
      setSelectedCandidateForDetails(candidate)
      setIsDetailsModalOpen(true)
    }
  }

  const handleScheduleInterviewClick = (candidate: Candidate) => {
    setSelectedCandidateForSchedule(candidate)
    setIsSchedulerOpen(true)
  }

  const handleAddNoteClick = (candidate: Candidate) => {
    setSelectedCandidateForNotes(candidate)
    setIsNotesOpen(true)
  }

  const handleViewResumeClick = (candidate: Candidate) => {
    // Always try to open the resume file first
    const resumeUrl = `http://localhost:8000/api/candidates/${candidate.id}/resume/`
    
    // Open the resume URL in a new tab
    // The backend will handle showing the file or returning an error page
    const newWindow = window.open(resumeUrl, '_blank')
    
    // If window opening failed (popup blocker), show modal as fallback
    if (!newWindow) {
      setSelectedCandidateForResume(candidate)
      setIsResumeModalOpen(true)
      
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for this site to view resume files, or use the text version below.",
        variant: "default"
      })
    }
    
    // Note: If the resume file doesn't exist, the backend will return a 404 page
    // Users can then close that tab and click "View Resume" again to see the text modal
  }

  const handleEditProfile = (updatedCandidate: Candidate) => {
    // Update the local candidates state
    setCandidates(prev => prev.map(c => 
      c.id === updatedCandidate.id ? updatedCandidate : c
    ))
    
    toast({
      title: "Profile Updated",
      description: `${updatedCandidate.name}'s profile has been updated successfully.`,
      variant: "default"
    })
  }

  const handleEditCandidate = (candidate: Candidate) => {
    toast({
      title: "Edit Candidate",
      description: `Opening edit form for ${candidate.name}...`,
      variant: "default"
    })
  }

  const handleMoveToScreening = (candidate: Candidate) => {
    if (!candidate.bestJobMatch) {
      toast({
        title: "No Job Matches",
        description: "No active jobs found to screen this candidate against.",
        variant: "destructive"
      })
      return
    }

    // Navigate to screening page with candidate and best job match
    const bestJob = candidate.bestJobMatch
    
    // Navigate to screening page
    router.push(`/screening?candidateId=${candidate.id}&jobId=${bestJob.jobId}`)
    
    toast({
      title: "Moving to Screening",
      description: `${candidate.name} will be screened for ${bestJob.jobTitle} (${bestJob.matchPercentage}% match).`,
      variant: "default"
    })
  }

  const handleMoveToScreeningForJob = (candidate: Candidate, jobId: number) => {
    console.log('handleMoveToScreeningForJob called with:', { candidate, jobId })
    
    // Find the job match - use selectedJobMatch if available, otherwise find from allJobMatches
    let jobMatch = null
    if ((candidate as any).selectedJobMatch && (candidate as any).selectedJobMatch.jobId === jobId) {
      jobMatch = (candidate as any).selectedJobMatch
    } else {
      jobMatch = candidate.allJobMatches?.find(match => match.jobId === jobId)
    }
    
    console.log('Found job match:', jobMatch)
    
    if (!jobMatch) {
      console.error('No job match found for jobId:', jobId)
      toast({
        title: "Error",
        description: "Could not find job match information.",
        variant: "destructive"
      })
      return
    }

    // Prepare parsed resume data to pass to screening
    const candidateData = {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      experience_years: (candidate as any).experience_years || candidate.totalExperience,
      experience_level: (candidate as any).experience_level,
      current_company: (candidate as any).current_company,
      current_position: (candidate as any).current_position,
      skills: (candidate as any).skills || [],
      education: (candidate as any).education || [],
      certifications: (candidate as any).certifications || [],
      salary_expectation: (candidate as any).salary_expectation,
      jobId: jobId,
      jobTitle: jobMatch.jobTitle
    }

    console.log('Candidate data prepared:', candidateData)

    // Store candidate data using utility function for the screening page
    setScreeningCandidateData(candidateData)
    
    // Remove candidate from current list
    setCandidates(prev => {
      const filtered = prev.filter(c => c.id !== candidate.id)
      console.log('Candidates after filtering:', filtered.length, 'remaining')
      return filtered
    })
    
    // Navigate to screening page with candidate and job info as query parameters
    router.push(`/screening?candidateId=${candidate.id}&jobId=${jobId}`)
    
    toast({
      title: "Moved to Screening",
      description: `${candidate.name} has been moved to screening for ${jobMatch.jobTitle}.`,
      variant: "default"
    })
  }

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Candidate Pipeline</h1>
          <p className="text-muted-foreground">
            {selectedJob ? (
              <>Showing match percentages for: <span className="font-semibold text-purple-600">{selectedJob.title}</span> (candidates sorted by best match)</>
            ) : (
              "Manage and track candidates through your hiring process."
            )}
          </p>
        </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Filter Candidates</CardTitle>
          <CardDescription>Narrow down candidates by search term, job, or stage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, job title, email, location, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-md hover:bg-gray-100 flex items-center justify-center transition-colors duration-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="w-full md:w-[180px]">
              <Select value={filterJob || ""} onValueChange={setFilterJob}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Jobs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={String(job.id)}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[180px]">
              <Select value={filterStage || ""} onValueChange={setFilterStage}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[150px]">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lastActivity">Last Activity</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="stage">Stage</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
            >
              <Filter className="h-4 w-4" /> 
              {showAdvancedFilters ? 'Hide' : 'More'} Filters
            </button>
            <button
              onClick={() => {
                setSearchTerm("")
                setFilterJob(selectedJobId ? String(selectedJobId) : null)
                setFilterStage(null)
                setFilterRating(null)
                setSortBy('lastActivity')
                setSortOrder('desc')
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
            >
              <X className="h-4 w-4" /> Reset
            </button>
            <button
              onClick={() => setIsBulkUploadOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
            >
              <UploadCloud className="h-4 w-4" /> Upload
            </button>
          </div>
          
          {showAdvancedFilters && (
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Rating Range</label>
                  <Select value={filterRating || ""} onValueChange={setFilterRating}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Ratings" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ratings</SelectItem>
                      <SelectItem value="4-5">4-5 Stars</SelectItem>
                      <SelectItem value="3-4">3-4 Stars</SelectItem>
                      <SelectItem value="2-3">2-3 Stars</SelectItem>
                      <SelectItem value="1-2">1-2 Stars</SelectItem>
                      <SelectItem value="0-1">0-1 Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredAndSortedCandidates.length} of {candidates.length} candidates
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
        {isLoading ? (
          <div className="col-span-full flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2 text-black">Loading candidates...</span>
          </div>
        ) : filteredAndSortedCandidates.length === 0 ? (
          <div className="col-span-full text-center text-gray-600 py-8">
            No candidates found matching your criteria.
          </div>
        ) : (
          filteredAndSortedCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onViewDetails={handleViewDetails}
              onAdvanceStage={handleAdvanceStage}
              onRejectCandidate={handleRejectCandidate}
              onDeleteCandidate={handleDeleteCandidate}
              onScheduleInterview={handleScheduleInterviewClick}
              onAddNote={handleAddNoteClick}
              onEditProfile={handleEditProfile}
              onViewResume={handleViewResumeClick}
              onEditCandidate={handleEditCandidate}
              onMoveToScreening={handleMoveToScreening}
              onMoveToScreeningForJob={handleMoveToScreeningForJob}
              showJobMatch={true} // Always show job match now
              jobs={jobs}
            />
          ))
        )}
      </div>

      <Dialog open={isSchedulerOpen} onOpenChange={setIsSchedulerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-black">Schedule Interview</DialogTitle>
          </DialogHeader>
          {selectedCandidateForSchedule && (
            <InterviewScheduler
              candidateName={selectedCandidateForSchedule.name}
              jobTitle={selectedCandidateForSchedule.jobTitle}
              applicationId={selectedCandidateForSchedule.id}
              onScheduleSuccess={() => {
                setIsSchedulerOpen(false)
                setSelectedCandidateForSchedule(null)
              }}
              onClose={() => setIsSchedulerOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-black">Bulk Candidate Upload</DialogTitle>
          </DialogHeader>
          <BulkCandidateUpload 
            onClose={() => setIsBulkUploadOpen(false)} 
            onCandidatesCreated={handleCandidatesCreated}
          />
        </DialogContent>
      </Dialog>
      
      {selectedCandidateForNotes && (
        <CandidateNotes
          candidateId={selectedCandidateForNotes.id}
          candidateName={selectedCandidateForNotes.name}
          isOpen={isNotesOpen}
          onClose={() => {
            setIsNotesOpen(false)
            setSelectedCandidateForNotes(null)
          }}
        />
      )}

      {/* Resume Modal */}
      <ResumeModal
        isOpen={isResumeModalOpen}
        onClose={() => {
          setIsResumeModalOpen(false)
          setSelectedCandidateForResume(null)
        }}
        candidateName={selectedCandidateForResume?.name || ''}
        resumeText={selectedCandidateForResume?.resumeText || ''}
        candidateId={selectedCandidateForResume?.id}
      />

      {/* Candidate Details Modal */}
      <CandidateDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false)
          setSelectedCandidateForDetails(null)
        }}
        candidate={selectedCandidateForDetails}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Candidate
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                Are you sure you want to delete <strong>{candidateToDelete?.name}</strong>?
              </p>
              <p className="text-xs text-red-700 mt-2">
                This action cannot be undone. All candidate data, notes, and interview history will be permanently removed.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false)
                  setCandidateToDelete(null)
                }}
                disabled={isActionLoading === candidateToDelete?.id}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteCandidate}
                disabled={isActionLoading === candidateToDelete?.id}
                className="flex items-center gap-2"
              >
                {isActionLoading === candidateToDelete?.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Candidate
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </ProtectedRoute>
  )
}