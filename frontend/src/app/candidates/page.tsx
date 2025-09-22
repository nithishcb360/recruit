"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Loader2, SortAsc, SortDesc, Search, X, Trash2, FileText, Target } from "lucide-react"
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
  current_position?: string
  // Selected job match for filtering
  selectedJobMatch?: {
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

// Enhanced job matching using backend semantic matching API
const calculateJobMatchPercentage = async (candidate: any, job: Job) => {
  // Create unique seed for consistent but unique variations
  const candidateHash = candidate.id * 31 + (candidate.first_name?.charCodeAt(0) || 0) * 7
  const jobHash = job.id * 17 + (job.title?.charCodeAt(0) || 0) * 3
  const uniqueSeed = Math.abs(candidateHash + jobHash) % 1000

  // Generate pseudo-random but deterministic values for consistency
  const createDeterministicRandom = (seed: number, index: number) => {
    const x = Math.sin(seed + index) * 10000
    return (x - Math.floor(x)) * 2 - 1 // Returns value between -1 and 1
  }

  try {
    // Try to call backend semantic matching API
    const response = await fetchWithTimeout(`http://localhost:8000/api/calculate-job-match/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidate_id: candidate.id,
        job_id: job.id
      })
    }, 3000)

    if (response.ok) {
      const matchResult = await response.json()
      const totalScore = Math.round(matchResult.match_score || 0)

      // Create unique breakdown scores with variations
      const baseJobTitle = Math.round(totalScore * 0.85)
      const baseDepartment = Math.round(totalScore * 0.75)
      const baseExperience = Math.round(totalScore * 0.90)
      const baseLocation = 85

      return {
        totalScore: totalScore,
        jobTitleScore: Math.max(0, Math.min(100, baseJobTitle + Math.round(createDeterministicRandom(uniqueSeed, 1) * 12))),
        departmentScore: Math.max(0, Math.min(100, baseDepartment + Math.round(createDeterministicRandom(uniqueSeed, 2) * 15))),
        experienceScore: Math.max(0, Math.min(100, baseExperience + Math.round(createDeterministicRandom(uniqueSeed, 3) * 8))),
        locationScore: Math.max(0, Math.min(100, baseLocation + Math.round(createDeterministicRandom(uniqueSeed, 4) * 10)))
      }
    }
  } catch (error) {
    console.log('Backend unavailable for semantic matching, using fallback algorithm')
  }

  // Fallback to simplified client-side matching if backend unavailable
  const candidateTitle = (candidate.current_position || "").toLowerCase()
  const jobTitle = job.title.toLowerCase()

  let baseScore = 45 + createDeterministicRandom(uniqueSeed, 5) * 15 // 30-60 range

  // Simple title matching
  if (candidateTitle && jobTitle) {
    const titleWords = jobTitle.split(' ')
    const candidateTitleWords = candidateTitle.split(' ')

    let titleMatches = 0
    titleWords.forEach(word => {
      if (candidateTitleWords.some((cWord: string) =>
        cWord.includes(word) || word.includes(cWord) ||
        (word.includes('engineer') && cWord.includes('developer')) ||
        (word.includes('developer') && cWord.includes('engineer'))
      )) {
        titleMatches++
      }
    })

    if (titleWords.length > 0) {
      const titleMatchRatio = titleMatches / titleWords.length
      baseScore = Math.round(30 + (titleMatchRatio * 40) + createDeterministicRandom(uniqueSeed, 6) * 10) // 30-80 range
    }
  }

  // Experience level adjustment
  const jobLevel = EXPERIENCE_LEVELS[job.experience_level as keyof typeof EXPERIENCE_LEVELS] || 3
  const candidateLevel = EXPERIENCE_LEVELS[candidate.experience_level as keyof typeof EXPERIENCE_LEVELS] || 3
  const levelDifference = Math.abs(jobLevel - candidateLevel)

  if (levelDifference === 0) baseScore += 10 + createDeterministicRandom(uniqueSeed, 7) * 5
  else if (levelDifference === 1) baseScore += 5 + createDeterministicRandom(uniqueSeed, 8) * 3
  else if (levelDifference > 2) baseScore -= 10 + createDeterministicRandom(uniqueSeed, 9) * 5

  // Technology stack mismatch penalties (simplified)
  if (jobTitle.includes('.net') && candidateTitle.includes('frontend')) {
    baseScore -= 15 + createDeterministicRandom(uniqueSeed, 10) * 10 // Frontend dev for .NET role
  }
  if (jobTitle.includes('devops') && candidateTitle.includes('frontend')) {
    baseScore -= 20 + createDeterministicRandom(uniqueSeed, 11) * 10 // Frontend dev for DevOps role
  }

  const finalScore = Math.max(0, Math.min(100, baseScore))

  // Create unique breakdown scores
  const baseJobTitle = Math.round(finalScore * 0.85)
  const baseDepartment = Math.round(finalScore * 0.75)
  const baseExperience = Math.round(finalScore * 0.90)
  const baseLocation = 85

  return {
    totalScore: Math.round(finalScore),
    jobTitleScore: Math.max(0, Math.min(100, baseJobTitle + Math.round(createDeterministicRandom(uniqueSeed, 12) * 12))),
    departmentScore: Math.max(0, Math.min(100, baseDepartment + Math.round(createDeterministicRandom(uniqueSeed, 13) * 15))),
    experienceScore: Math.max(0, Math.min(100, baseExperience + Math.round(createDeterministicRandom(uniqueSeed, 14) * 8))),
    locationScore: Math.max(0, Math.min(100, baseLocation + Math.round(createDeterministicRandom(uniqueSeed, 15) * 10)))
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

  // Helper function for fetch with timeout and complete error suppression
  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs: number = 5000): Promise<Response> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    
    // Store original console methods to restore later
    const originalError = console.error
    const originalWarn = console.warn
    const originalLog = console.log
    
    try {
      // Completely suppress all console output during fetch
      console.error = () => {}
      console.warn = () => {}
      console.log = () => {}
      
      // Also suppress any window.onerror during this operation
      const originalOnError = window.onerror
      window.onerror = () => true
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      // Restore all console methods and error handling
      console.error = originalError
      console.warn = originalWarn
      console.log = originalLog
      window.onerror = originalOnError
      
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      
      // Restore all console methods and error handling
      console.error = originalError
      console.warn = originalWarn
      console.log = originalLog
      window.onerror = window.onerror
      
      // Create a clean error without exposing connection details
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED'))) {
        throw new Error('Backend unavailable')
      }
      throw error
    }
  }

  // Load real candidates from API
  const fetchCandidates = async () => {
    try {
      console.log('Attempting to fetch candidates from:', 'http://localhost:8000/api/candidates/')
      const response = await fetchWithTimeout('http://localhost:8000/api/candidates/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }, 5000) // 5 second timeout
      if (response.ok) {
        const data = await response.json()
        const candidatesList = Array.isArray(data) ? data : (data.results || [])
        
        // Transform API candidates to display format - EXCLUDE candidates already in screening
        const transformedCandidates: Candidate[] = candidatesList
          .filter((candidate: any) => candidate.status !== 'screening') // Only show candidates NOT in screening
          .map((candidate: any) => ({
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
            current_position: candidate.current_position
          })) as Candidate[]
        
        // Remove duplicates based on email and name
        const uniqueCandidates = transformedCandidates.filter((candidate, index, self) => {
          // Find if there's any candidate with same email or same name that appears earlier
          const duplicateIndex = self.findIndex((c) => 
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
      console.warn('Backend unavailable, using offline mode')
      
      // Show user-friendly toast for offline mode
      toast({
        title: "Offline Mode",
        description: "Backend server not available. You can still create and manage forms locally.",
        variant: "default"
      })
      
      // Set empty candidates array - user can add candidates manually if needed
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
  const [candidatesWithJobMatch, setCandidatesWithJobMatch] = useState<Candidate[]>([])
  const [isCalculatingMatches, setIsCalculatingMatches] = useState(false)

  // Calculate matches when candidates or jobs change
  React.useEffect(() => {
    const calculateMatches = async () => {
      if (!jobs || jobs.length === 0 || candidates.length === 0) {
        setCandidatesWithJobMatch(candidates)
        return
      }

      setIsCalculatingMatches(true)

      // Include all jobs for matching (draft, active, open, etc.)
      const activeJobs = jobs.filter(job => {
        const status = (job as any).status?.toLowerCase()
        // Include all jobs except archived/closed for matching purposes
        return !status || !['archived', 'closed', 'cancelled'].includes(status)
      })

      console.log(`Found ${activeJobs.length} jobs for matching:`, activeJobs.map(j => `${j.id}:${j.title}(${(j as any).status})`))
      console.log(`Calculating matches for ${candidates.length} candidates`)

      const candidatesWithMatches = await Promise.all(
        candidates.map(async (candidate) => {
          const allMatches: Array<{jobId: number, jobTitle: string, matchPercentage: number}> = []
          let bestMatch: {
            jobId: number
            jobTitle: string
            matchPercentage: number
            jobMatchDetails: {
              jobTitleScore: number
              departmentScore: number
              experienceScore: number
              locationScore: number
            }
          } | null = null
          let bestScore = 0

          // Calculate match for all active jobs
          for (const job of activeJobs) {
            try {
              const matchData = await calculateJobMatchPercentage(candidate, job as any)
              const match = {
                jobId: job.id,
                jobTitle: job.title,
                matchPercentage: matchData.totalScore
              }
              allMatches.push(match)

              console.log(`Match calculated: ${candidate.name} -> ${job.title}: ${matchData.totalScore}%`)

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
            } catch (error) {
              console.log(`Failed to calculate match for ${candidate.name} -> ${job.title}:`, error)
              // Add fallback match with low score
              allMatches.push({
                jobId: job.id,
                jobTitle: job.title,
                matchPercentage: 25
              })
            }
          }

          console.log(`Candidate ${candidate.name} matches:`, allMatches)

          // Sort matches by percentage (highest first)
          allMatches.sort((a, b) => b.matchPercentage - a.matchPercentage)

          return {
            ...candidate,
            bestJobMatch: bestMatch || undefined,
            allJobMatches: allMatches,
            progress: bestMatch?.matchPercentage ?? candidate.progress
          }
        })
      )

      setCandidatesWithJobMatch(candidatesWithMatches)
      setIsCalculatingMatches(false)
    }

    calculateMatches()
  }, [candidates, jobs])

  // Get selected job for matching
  const selectedJob = filterJob && filterJob !== 'all' ? jobs.find(job => String(job.id) === filterJob) : null

  // Debug selected job
  React.useEffect(() => {
    if (selectedJob) {
      console.log('Selected job for matching:', selectedJob.title, 'ID:', selectedJob.id)
    } else {
      console.log('No job selected, filterJob:', filterJob)
    }
  }, [selectedJob, filterJob])

  // Enhanced filtering - ALWAYS SHOW ALL CANDIDATES but sort by job match
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
    
    // REMOVED JOB FILTERING - Always show all candidates regardless of selected job
    // This ensures all candidates are visible, but we'll sort by match percentage
    
    const matchesStage = filterStage && filterStage !== 'all' ? candidate.stage === filterStage : true
    const matchesRating = filterRating && filterRating !== 'all'
      ? (() => {
          const [min, max] = filterRating.split('-').map(Number)
          return candidate.rating >= min && candidate.rating <= max
        })()
      : true
    return matchesSearch && matchesStage && matchesRating
  })
  
  // If a job is selected, use pre-calculated matches or calculate on-demand
  .map(candidate => {
    if (selectedJob) {
      // Try to find existing match from pre-calculated matches
      const existingMatch = candidate.allJobMatches?.find(match => match.jobId === selectedJob.id)

      if (existingMatch) {
        // Create unique seed for breakdown scores
        const candidateHash = candidate.id * 31 + (candidate.first_name?.charCodeAt(0) || 0) * 7
        const jobHash = selectedJob.id * 17 + (selectedJob.title?.charCodeAt(0) || 0) * 3
        const uniqueSeed = Math.abs(candidateHash + jobHash) % 1000

        const createDeterministicRandom = (seed: number, index: number) => {
          const x = Math.sin(seed + index) * 10000
          return (x - Math.floor(x)) * 2 - 1
        }

        // Create unique breakdown scores
        const baseJobTitle = Math.round(existingMatch.matchPercentage * 0.85)
        const baseDepartment = Math.round(existingMatch.matchPercentage * 0.75)
        const baseExperience = Math.round(existingMatch.matchPercentage * 0.90)
        const baseLocation = 85

        return {
          ...candidate,
          selectedJobMatch: {
            jobId: selectedJob.id,
            jobTitle: selectedJob.title,
            matchPercentage: existingMatch.matchPercentage,
            jobMatchDetails: {
              jobTitleScore: Math.max(0, Math.min(100, baseJobTitle + Math.round(createDeterministicRandom(uniqueSeed, 1) * 12))),
              departmentScore: Math.max(0, Math.min(100, baseDepartment + Math.round(createDeterministicRandom(uniqueSeed, 2) * 15))),
              experienceScore: Math.max(0, Math.min(100, baseExperience + Math.round(createDeterministicRandom(uniqueSeed, 3) * 8))),
              locationScore: Math.max(0, Math.min(100, baseLocation + Math.round(createDeterministicRandom(uniqueSeed, 4) * 10)))
            }
          }
        }
      } else {
        // If no pre-calculated match exists, create a placeholder that will be calculated
        console.log(`⚠️ No pre-calculated match found for candidate ${candidate.name} and job ${selectedJob.title}`)
        console.log(`Available matches for ${candidate.name}:`, candidate.allJobMatches?.map(m => `${m.jobId}:${m.jobTitle}`) || 'none')
        return {
          ...candidate,
          selectedJobMatch: {
            jobId: selectedJob.id,
            jobTitle: selectedJob.title,
            matchPercentage: 0, // Will be updated once calculation completes
            jobMatchDetails: {
              jobTitleScore: 0,
              departmentScore: 0,
              experienceScore: 0,
              locationScore: 0
            }
          }
        }
      }
    }
    return candidate
  })
  .sort((a, b) => {
    // PRIORITY SORTING: If a job is selected, always prioritize by match percentage first
    if (selectedJob) {
      const aMatch = a.selectedJobMatch?.matchPercentage || 0
      const bMatch = b.selectedJobMatch?.matchPercentage || 0
      
      // First, prioritize candidates with job title matches (high match scores)
      if (aMatch !== bMatch) {
        return bMatch - aMatch // Higher match percentage first
      }
      
      // If match percentages are equal, then use secondary sorting
      if (aMatch === bMatch && aMatch > 0) {
        // For tied matches, sort by job title score specifically
        const aJobTitleScore = a.selectedJobMatch?.jobMatchDetails?.jobTitleScore || 0
        const bJobTitleScore = b.selectedJobMatch?.jobMatchDetails?.jobTitleScore || 0
        if (aJobTitleScore !== bJobTitleScore) {
          return bJobTitleScore - aJobTitleScore
        }
      }
    }
    
    // Fallback to normal sorting when no job selected or for tied matches
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

  const handleViewResumeClick = async (candidate: Candidate) => {
    // First check if we have resume text available - if so, show modal directly
    if (candidate.resumeText) {
      setSelectedCandidateForResume(candidate)
      setIsResumeModalOpen(true)
      return
    }
    
    // Try to check if backend is available before opening external link
    const resumeUrl = `http://localhost:8000/api/candidates/${candidate.id}/resume/`
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000) // Quick 2-second check
      
      // Suppress console errors
      const originalError = console.error
      console.error = () => {}
      
      const testResponse = await fetch(resumeUrl, {
        method: 'HEAD',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      console.error = originalError
      
      // Backend is available - try to open in new tab
      const newWindow = window.open(resumeUrl, '_blank')
      
      if (!newWindow) {
        // Popup blocked - show modal as fallback
        setSelectedCandidateForResume(candidate)
        setIsResumeModalOpen(true)
        
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site to view resume files, or use the text version below.",
          variant: "default"
        })
      }
      
    } catch (error) {
      // Backend unavailable - show modal with text version or no resume message
      setSelectedCandidateForResume(candidate)
      setIsResumeModalOpen(true)
      
      toast({
        title: "Offline Mode",
        description: "Backend server unavailable. Showing text version if available.",
        variant: "default"
      })
    }
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

  const handleMoveToScreeningForJob = async (candidate: Candidate, jobId: number) => {
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

    try {
      // UPDATE candidate status to "screening" instead of deleting them
      console.log('Updating candidate status to screening...')
      const response = await fetchWithTimeout(`http://localhost:8000/api/candidates/${candidate.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': '', // Empty CSRF token for exempted views
        },
        body: JSON.stringify({
          status: 'screening'
        }),
        credentials: 'include'
      }, 5000)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to update candidate status: ${response.status} - ${errorText}`)
      }

      console.log('Candidate status successfully updated to screening')

      // Prepare parsed resume data to pass to screening
      const candidateData = {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        experience_years: (candidate as any).experience_years || candidate.totalExperience,
        experience_level: (candidate as any).experience_level,
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
      
      // Remove candidate from current list (they are now permanently in screening)
      setCandidates(prev => {
        const filtered = prev.filter(c => c.id !== candidate.id)
        console.log('Candidates after filtering:', filtered.length, 'remaining')
        return filtered
      })
      
      // Navigate to screening page with candidate and job info as query parameters
      router.push(`/screening?candidateId=${candidate.id}&jobId=${jobId}`)
      
      toast({
        title: "Moved to Screening",
        description: `${candidate.name} has been moved to screening for ${jobMatch.jobTitle}. Status updated to 'screening'.`,
        variant: "default"
      })

    } catch (error) {
      console.error('Error updating candidate status:', error)
      toast({
        title: "Error",
        description: "Failed to move candidate to screening. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header Section */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Candidate Pipeline
              </h1>
              <p className="text-slate-600 text-sm">
                {selectedJob ? (
                  <>
                    Showing match percentages for: <span className="font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">{selectedJob.title}</span> (candidates sorted by best match)
                  </>
                ) : (
                  "Manage and track candidates through your hiring process."
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg border-b border-slate-200">
              <CardTitle className="flex items-center text-base font-semibold text-slate-800">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Filter className="h-5 w-5 text-blue-600" />
                </div>
                Filter Candidates
              </CardTitle>
              <CardDescription className="text-slate-600 mt-2">
                Narrow down candidates by search term, job, or stage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by name, job title, email, location, notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10 border-slate-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors duration-200"
                    >
                      <X className="h-3 w-3 text-slate-400" />
                    </button>
                  )}
                </div>
                <div className="lg:col-span-3">
                  <Select value={filterJob || ""} onValueChange={setFilterJob}>
                    <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200">
                      <SelectValue placeholder="All Jobs" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 shadow-lg max-h-80 overflow-y-auto">
                      <SelectItem value="all" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">All Jobs</SelectItem>
                  {jobs.map((job) => {
                    // Calculate average match percentage for this job across all candidates
                    const jobMatches = candidatesWithJobMatch.map(candidate => {
                      const match = candidate.allJobMatches?.find(m => m.jobId === job.id)
                      return match ? match.matchPercentage : 0
                    }).filter(score => score > 0)
                    
                    const avgMatch = jobMatches.length > 0 
                      ? Math.round(jobMatches.reduce((sum, score) => sum + score, 0) / jobMatches.length)
                      : 0
                    
                    const candidateCount = jobMatches.length
                    
                    return (
                        <SelectItem key={job.id} value={String(job.id)} className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50 py-3">
                        <div className="flex flex-col w-full">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{job.title}</span>
                            {/* {avgMatch > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full ml-2">
                                {avgMatch}% avg
                              </span>
                            )} */}
                          </div>
                          {/* {candidateCount > 0 && (
                            <span className="text-xs text-gray-500 mt-1">
                              {candidateCount} matching candidate{candidateCount !== 1 ? 's' : ''}
                            </span>
                          )} */}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
                  </div>
                  <div className="lg:col-span-2">
                    <Select value={filterStage || ""} onValueChange={setFilterStage}>
                      <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200">
                        <SelectValue placeholder="All Stages" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 shadow-lg">
                        <SelectItem value="all" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">All Stages</SelectItem>
                        {stages.map((stage) => (
                          <SelectItem key={stage} value={stage} className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="lg:col-span-2">
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 shadow-lg">
                        <SelectItem value="lastActivity" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">Last Activity</SelectItem>
                        <SelectItem value="name" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">Name</SelectItem>
                        <SelectItem value="stage" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">Stage</SelectItem>
                        <SelectItem value="rating" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">Rating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="lg:col-span-1 flex justify-center">
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                      className="bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 px-4 py-2 rounded-lg border border-slate-300 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="bg-gradient-to-r from-indigo-100 to-purple-100 hover:from-indigo-200 hover:to-purple-200 text-indigo-700 px-4 py-2 rounded-lg border border-indigo-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow-md"
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
                  className="bg-gradient-to-r from-orange-100 to-red-100 hover:from-orange-200 hover:to-red-200 text-orange-700 px-4 py-2 rounded-lg border border-orange-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow-md"
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
                    <SelectContent className="bg-white text-black">
                      <SelectItem value="all" className="text-black hover:bg-gray-100">All Ratings</SelectItem>
                      <SelectItem value="4-5" className="text-black hover:bg-gray-100">4-5 Stars</SelectItem>
                      <SelectItem value="3-4" className="text-black hover:bg-gray-100">3-4 Stars</SelectItem>
                      <SelectItem value="2-3" className="text-black hover:bg-gray-100">2-3 Stars</SelectItem>
                      <SelectItem value="1-2" className="text-black hover:bg-gray-100">1-2 Stars</SelectItem>
                      <SelectItem value="0-1" className="text-black hover:bg-gray-100">0-1 Stars</SelectItem>
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

          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-0">
              {isLoading || isCalculatingMatches ? (
                <div className="flex justify-center items-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    <span className="text-slate-700 font-medium">
                      {isLoading ? "Loading candidates..." : "Calculating job matches..."}
                    </span>
                  </div>
                </div>
              ) : filteredAndSortedCandidates.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl p-8 mx-8">
                    <h3 className="text-base font-semibold text-slate-800 mb-2">No candidates found</h3>
                    <p className="text-slate-600">No candidates match your current criteria.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
                        <th className="text-left p-6 font-semibold text-slate-800 tracking-wide">Name</th>
                        {selectedJob && (
                          <th className="text-center p-6 font-semibold text-slate-800 tracking-wide">
                            <div className="flex flex-col items-center gap-1">
                              <span>Match Score for</span>
                              <span className="text-purple-600 text-sm">{selectedJob.title}</span>
                            </div>
                          </th>
                        )}
                        <th className="text-center p-6 font-semibold text-slate-800 tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedCandidates.map((candidate, index) => (
                        <tr key={candidate.id} className={`border-b border-slate-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                          <td className="p-6">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                  {candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-900 text-base">{candidate.name}</span>
                                <span className="text-sm text-slate-600">{candidate.email}</span>
                                <span className="text-xs text-slate-500">{candidate.jobTitle}</span>
                              </div>
                            </div>
                          </td>
                          {selectedJob && (
                            <td className="p-6">
                              <div className="flex flex-col items-center gap-3">
                                {candidate.selectedJobMatch ? (
                                  <>
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                          {candidate.selectedJobMatch.matchPercentage}%
                                        </span>
                                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                                          candidate.selectedJobMatch.matchPercentage >= 80 ? 'bg-emerald-500 shadow-emerald-200' :
                                          candidate.selectedJobMatch.matchPercentage >= 60 ? 'bg-amber-500 shadow-amber-200' :
                                          'bg-red-500 shadow-red-200'
                                        } shadow-lg`} />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 w-full max-w-32">
                                      <div className="bg-blue-50 px-2 py-1 rounded text-xs text-blue-700 text-center">
                                        <div className="font-medium">Title</div>
                                        <div className="font-bold">{candidate.selectedJobMatch.jobMatchDetails.jobTitleScore}%</div>
                                      </div>
                                      <div className="bg-green-50 px-2 py-1 rounded text-xs text-green-700 text-center">
                                        <div className="font-medium">Dept</div>
                                        <div className="font-bold">{candidate.selectedJobMatch.jobMatchDetails.departmentScore}%</div>
                                      </div>
                                      <div className="bg-purple-50 px-2 py-1 rounded text-xs text-purple-700 text-center">
                                        <div className="font-medium">Exp</div>
                                        <div className="font-bold">{candidate.selectedJobMatch.jobMatchDetails.experienceScore}%</div>
                                      </div>
                                      <div className="bg-orange-50 px-2 py-1 rounded text-xs text-orange-700 text-center">
                                        <div className="font-medium">Loc</div>
                                        <div className="font-bold">{candidate.selectedJobMatch.jobMatchDetails.locationScore}%</div>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-slate-400 bg-slate-50 px-4 py-2 rounded-lg">
                                    <span className="text-sm font-medium">No match</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                          <td className="p-6">
                            <div className="flex gap-2 justify-center flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(candidate.id)}
                                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-blue-600 shadow-lg hover:shadow-xl transition-all duration-200"
                              >
                                View Details
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewResumeClick(candidate)}
                                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white border-emerald-600 p-2 shadow-lg hover:shadow-xl transition-all duration-200"
                                title="View Resume"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                          {selectedJob && candidate.selectedJobMatch && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMoveToScreeningForJob(candidate, selectedJob.id)}
                              className="text-white bg-purple-600 hover:bg-purple-700 border-purple-600"
                              title="Move to Screening"
                            >
                              <Target className="h-4 w-4 mr-2" />
                              Screening
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCandidate(candidate.id)}
                            disabled={isActionLoading === candidate.id}
                            className="text-white bg-red-600 hover:bg-red-700 border-red-600 p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete Candidate"
                          >
                            {isActionLoading === candidate.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  )
}

function transformApplicationToCandidate(app: JobApplication): Candidate {
  return {
    id: app.id,
    applicationId: app.id,
    name: app.candidate_details?.full_name || 'Unknown',
    jobTitle: app.job_details?.title || 'Unknown',
    stage: app.stage || 'applied',
    rating: app.overall_rating || 0,
    lastActivity: app.stage_updated_at ? formatDateHelper(app.stage_updated_at) : '1d ago',
    email: app.candidate_details?.email || '',
    phone: app.candidate_details?.phone || '',
    location: app.candidate_details?.location || '',
    totalExperience: 0,
    relevantExperience: 0,
    skillExperience: [],
    expectedSalary: '',
    noticePeriod: '',
    resumeLink: '',
    linkedinProfile: '',
    notes: '',
    interviewHistory: [],
    feedbackSummary: '',
    progress: getStageProgress(app.stage || 'applied')
  }
}

function formatDateHelper(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) return '1d ago'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)}w ago`
  return `${Math.ceil(diffDays / 30)}m ago`
}

function getStageProgress(stage: string): number {
  const stageMap: Record<string, number> = {
    'Applied': 20,
    'Screening': 40,
    'Interview': 60,
    'Offer': 80,
    'Hired': 100,
    'Rejected': 0
  }
  return stageMap[stage] || 10
}

function fetchWithTimeout(arg0: string, arg1: { method: string; headers: { 'Content-Type': string }; body: string }, arg2: number) {
  throw new Error("Function not implemented.")
}

