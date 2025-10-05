'use client'

import React, { useState, useEffect, useMemo, ReactNode } from 'react'
import { Search, Filter, Users, Target, Brain, ChevronDown, ChevronRight, Star, CheckCircle, XCircle, User, Briefcase, MapPin, Clock, Download, Trash2, Phone, Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { AudioPlayer } from "@/components/ui/audio-player"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import { getJobs } from "@/lib/api/jobs"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { getScreeningCandidateData, getScreeningCandidatesList, removeFromScreeningList, clearScreeningCandidateData, ScreeningCandidateData } from "@/utils/screeningData"
import { enhancedRetellAPI, EnhancedRetellCallData } from "@/lib/api/retell-enhanced"

interface Job {
  id: number
  title: string
  department: { name: string }
  experience_level?: string
  required_skills?: string[]
  preferred_skills?: string[]
  requirements?: string
  description?: string
  status?: string
}

interface Candidate {
  assessment_username?: string
  assessment_password?: string
  assessment_completed?: boolean
  assessment_disqualified?: boolean
  assessment_score?: number
  assessment_tab_switches?: number
  assessment_responses?: any
  assessment_recording?: string
  assessment_time_taken?: number
  id: number
  first_name: string
  last_name: string
  email: string
  skills: string[]
  experience_years: number | null
  experience_level: string
  resume_text: string
  resume_file?: string
  call_audio_url?: string
  call_transcript?: string
  education: any[]
  certifications: any[]
  salary_expectation: number | null
  location: string
  current_position: string
}

interface ScreeningResult {
  candidate: Candidate
  totalScore: number
  skillsScore: number
  experienceScore: number
  keywordScore: number
  salaryScore: number
  breakdown: {
    requiredSkillsMatch: number
    preferredSkillsMatch: number
    experienceLevelMatch: number
    keywordMatches: string[]
    salaryFit: 'good' | 'negotiable' | 'high' | 'unknown'
    // New breakdown fields for the 4 main criteria
    jobTitleScore: number
    departmentScore: number
    locationScore: number
  }
  recommendation: 'strong_match' | 'good_match' | 'potential_match' | 'weak_match'
}

// Experience level hierarchy for scoring
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

const extractCurrentRole = (position: string): string => {
  if (!position) return 'Not specified'

  // Common role keywords that should be prioritized
  const roleKeywords = [
    'developer', 'engineer', 'manager', 'lead', 'senior', 'junior', 'principal', 'architect',
    'analyst', 'consultant', 'specialist', 'coordinator', 'director', 'designer', 'tester',
    'qa', 'devops', 'frontend', 'backend', 'fullstack', 'full-stack', 'ui', 'ux', 'product',
    'project', 'software', 'web', 'data', 'business', 'technical', 'system',
    'network', 'security', 'cloud', 'database', 'ai', 'ml', 'machine', 'learning',
    'react', 'angular', 'vue', 'node', 'python', 'java', 'javascript', 'typescript'
  ]

  // Words to completely filter out (contact info, email domains, numbers, etc.)
  const filterOutWords = [
    // Contact information
    'email', 'gmail', 'yahoo', 'hotmail', 'outlook', 'mail', 'com', 'net', 'org',
    'phone', 'mobile', 'tel', 'contact', 'call', 'number', 'no',
    // Common non-role words
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
    'as', 'an', 'a', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'must', 'can', 'shall', 'very', 'highly', 'skilled', 'experienced', 'professional',
    'passionate', 'about', 'innovation', 'technologies', 'frameworks', 'building',
    'scalable', 'applications', 'microservices', 'architecture', 'using', 'modern',
    'extensive', 'experience', 'years', 'year', 'yrs', 'yr', 'months', 'days'
  ]

  // Clean and split the position text
  let words = position
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Remove punctuation except hyphens
    .split(/\s+/)
    .filter(word => {
      // Filter out short words, numbers, and unwanted words
      return word.length > 1 &&
             !filterOutWords.includes(word) &&
             !word.match(/^\d+$/) && // Remove pure numbers
             !word.match(/^[a-z]+@/) && // Remove email patterns
             !word.match(/^\d+[a-z]*$/) // Remove number-letter combinations
    })

  // If the cleaned text results in nonsensical combinations, return a default
  if (words.length === 0 || words.every(word => word.length < 3)) {
    return 'Position Not Available'
  }

  // Find important role-related words
  const roleWords = words.filter(word =>
    roleKeywords.some(keyword =>
      word.includes(keyword) || keyword.includes(word)
    )
  )

  // If we found role-specific words, use them (max 3)
  if (roleWords.length > 0) {
    return roleWords
      .slice(0, 3)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Otherwise, take the first few meaningful words (but validate they make sense)
  const meaningfulWords = words.slice(0, 3)

  // Additional validation: if the words don't seem like a job title, return default
  const combinedText = meaningfulWords.join(' ').toLowerCase()
  if (combinedText.includes('gmail') ||
      combinedText.includes('email') ||
      combinedText.includes('phone') ||
      combinedText.includes('mobile') ||
      meaningfulWords.length === 0) {
    return 'Position Not Available'
  }

  return meaningfulWords.length > 0
    ? meaningfulWords
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : 'Position Not Available'
}

export default function ScreeningPage() {
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [minScore, setMinScore] = useState<number>(60)
  const [isLoading, setIsLoading] = useState(false)
  const [screeningResults, setScreeningResults] = useState<ScreeningResult[]>([])
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  const [movedCandidatesList, setMovedCandidatesList] = useState<ScreeningCandidateData[]>([])
  const [candidateCallData, setCandidateCallData] = useState<Map<number, EnhancedRetellCallData>>(new Map())
  const [loadingCallData, setLoadingCallData] = useState<Set<number>>(new Set())
  const [callIdInputs, setCallIdInputs] = useState<Map<number, string>>(new Map())
  const [autoCallScheduled, setAutoCallScheduled] = useState<Set<number>>(new Set())
  const [autoCallInProgress, setAutoCallInProgress] = useState<Set<number>>(new Set())
  const [initiatedCallIds, setInitiatedCallIds] = useState<Map<number, string>>(new Map())

  // Check if current time is within working hours (10 AM - 6 PM)
  const isWithinWorkingHours = (): boolean => {
    const currentHour = new Date().getHours()
    return currentHour >= 10 && currentHour < 18 // 10 AM to 6 PM (18:00)
  }

  // Initiate automatic call for a candidate
  const initiateAutomaticCall = async (candidate: ScreeningCandidateData) => {
    // Check if it's within working hours
    if (!isWithinWorkingHours()) {
      console.log(`Outside working hours. Skipping call for ${candidate.name}`)
      return
    }

    // Check if candidate has a phone number
    if (!candidate.phone) {
      console.log(`No phone number for ${candidate.name}. Skipping call.`)
      return
    }

    // Check if call already scheduled or in progress
    if (autoCallScheduled.has(candidate.id) || autoCallInProgress.has(candidate.id)) {
      console.log(`Call already scheduled or in progress for ${candidate.name}`)
      return
    }

    try {
      // Mark as in progress
      setAutoCallInProgress(prev => new Set(prev).add(candidate.id))

      console.log(`Initiating automatic call for ${candidate.name} at ${candidate.phone}`)

      // Call the existing handleStartMCPCall function
      await handleStartMCPCall(candidate)

      // Mark as scheduled
      setAutoCallScheduled(prev => new Set(prev).add(candidate.id))

      // Poll for call completion and fetch recording
      pollForCallCompletion(candidate)

    } catch (error) {
      console.error(`Error initiating automatic call for ${candidate.name}:`, error)
      // Remove from in progress on error
      setAutoCallInProgress(prev => {
        const newSet = new Set(prev)
        newSet.delete(candidate.id)
        return newSet
      })
    }
  }

  // Poll for call completion and fetch recording/transcript
  const pollForCallCompletion = async (candidate: ScreeningCandidateData) => {
    let pollAttempts = 0
    const maxPollAttempts = 20 // Poll for 10 minutes (20 * 30 seconds)

    const pollInterval = setInterval(async () => {
      pollAttempts++

      try {
        // Try to fetch recent completed calls from Retell AI
        if (enhancedRetellAPI.isConfigured()) {
          const recentCalls = await enhancedRetellAPI.getRecentCompletedCalls(10)

          // Try to match by candidate phone number or timing
          const matchingCall = recentCalls.find(call => {
            // You could implement more sophisticated matching logic here
            // For now, we'll take the most recent completed call
            return call.call_status === 'ended' || call.call_status === 'completed'
          })

          if (matchingCall) {
            console.log(`Call completed for ${candidate.name}. Fetching recording and transcript...`)

            // Store call data for this candidate
            setCandidateCallData(prev => {
              const newMap = new Map(prev)
              newMap.set(candidate.id, matchingCall)
              return newMap
            })

            // Remove from in progress
            setAutoCallInProgress(prev => {
              const newSet = new Set(prev)
              newSet.delete(candidate.id)
              return newSet
            })

            // Show success notification
            toast({
              title: "Call Completed",
              description: `Call with ${candidate.name} completed. Recording and transcript loaded.`,
              variant: "default"
            })

            clearInterval(pollInterval)
            return
          }
        }

        // Stop polling after max attempts
        if (pollAttempts >= maxPollAttempts) {
          console.log(`Max poll attempts reached for ${candidate.name}. Stopping polling.`)

          // Remove from in progress
          setAutoCallInProgress(prev => {
            const newSet = new Set(prev)
            newSet.delete(candidate.id)
            return newSet
          })

          clearInterval(pollInterval)
        }
      } catch (error) {
        console.error(`Error polling for call completion for ${candidate.name}:`, error)
      }
    }, 30000) // Poll every 30 seconds
  }

  // Automatic call scheduling effect - runs only once when candidates are added
  useEffect(() => {
    // Only proceed if we have candidates in the screening list
    if (movedCandidatesList.length === 0) return

    // Only proceed if within working hours
    if (!isWithinWorkingHours()) {
      console.log('Outside working hours. Automatic calls will not be initiated.')
      return
    }

    // Check localStorage to see if calls were already made for these candidates
    const callsAlreadyMade = JSON.parse(localStorage.getItem('screening_calls_made') || '[]')

    // Iterate through candidates and initiate calls
    movedCandidatesList.forEach(candidate => {
      // Skip if call was already made for this candidate
      if (callsAlreadyMade.includes(candidate.id)) {
        console.log(`Call already made for ${candidate.name}, skipping.`)
        return
      }

      // Only initiate if not already scheduled or in progress
      if (!autoCallScheduled.has(candidate.id) && !autoCallInProgress.has(candidate.id)) {
        // Add a small delay to stagger calls
        const delay = Math.random() * 5000 // Random delay up to 5 seconds
        setTimeout(() => {
          initiateAutomaticCall(candidate)
          // Mark call as made in localStorage
          const updatedCalls = JSON.parse(localStorage.getItem('screening_calls_made') || '[]')
          updatedCalls.push(candidate.id)
          localStorage.setItem('screening_calls_made', JSON.stringify(updatedCalls))
        }, delay)
      }
    })
  }, [movedCandidatesList])

  // Load jobs and applications on component mount
  useEffect(() => {
    fetchJobs()
    fetchCandidates()
    fetchApplications()

    // Load screening candidates list
    const screeningList = getScreeningCandidatesList()
    setMovedCandidatesList(screeningList)

    // Check for single moved candidate data from candidates page (legacy support)
    const screeningData = getScreeningCandidateData()
    if (screeningData) {
      // Add to list if not already present
      if (!screeningList.some(candidate => candidate.id === screeningData.id)) {
        const updatedList = [...screeningList, screeningData]
        setMovedCandidatesList(updatedList)
      }

      // Auto-select the job if provided
      if (screeningData.jobId) {
        setSelectedJobId(screeningData.jobId.toString())
      }
    }

    // Refresh candidate data from API to get latest assessment credentials
    refreshMovedCandidatesData(screeningList)
  }, [])

  // Function to refresh moved candidates data from API
  const refreshMovedCandidatesData = async (candidatesList: ScreeningCandidateData[]) => {
    if (candidatesList.length === 0) return

    try {
      // Fetch fresh data for each candidate
      const updatedCandidates = await Promise.all(
        candidatesList.map(async (candidate) => {
          try {
            const response = await fetch(`http://localhost:8000/api/candidates/${candidate.id}/`)
            if (response.ok) {
              const freshData = await response.json()
              return {
                ...candidate,
                assessment_username: freshData.assessment_username,
                assessment_password: freshData.assessment_password,
                assessment_completed: freshData.assessment_completed,
                assessment_score: freshData.assessment_score,
                assessment_tab_switches: freshData.assessment_tab_switches,
                assessment_disqualified: freshData.assessment_disqualified
              }
            }
            return candidate
          } catch (error) {
            console.error(`Error fetching candidate ${candidate.id}:`, error)
            return candidate
          }
        })
      )
      setMovedCandidatesList(updatedCandidates)
    } catch (error) {
      console.error('Error refreshing candidate data:', error)
    }
  }

  const fetchJobs = async () => {
    try {
      const data = await getJobs()
      setJobs(data.results)
    } catch (error) {
      console.error('Error fetching jobs:', error)
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive"
      })
    }
  }

  const fetchCandidates = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/candidates/')
      if (response.ok) {
        const data = await response.json()
        const candidatesList = Array.isArray(data) ? data : (data.results || [])
        
        // Remove duplicates based on email and name
        const uniqueCandidates = candidatesList.filter((candidate: any, index: number, self: any[]) => {
          // Find if there's any candidate with same email or same name that appears earlier
          const duplicateIndex = self.findIndex((c: any) => 
            (c.email && candidate.email && c.email.toLowerCase() === candidate.email.toLowerCase()) ||
            (c.first_name && c.last_name && candidate.first_name && candidate.last_name && 
             `${c.first_name} ${c.last_name}`.toLowerCase() === `${candidate.first_name} ${candidate.last_name}`.toLowerCase())
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
      toast({
        title: "Error", 
        description: "Failed to load candidates. Please ensure the backend server is running.",
        variant: "destructive"
      })
    }
  }

  const fetchApplications = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/applications/')
      if (response.ok) {
        const data = await response.json()
        setApplications(data.results || data)
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
      // Applications might be empty, that's okay
    }
  }

  // AI Screening Algorithm - Based on Job Title, Department, Experience Range, and Location
  const calculateCandidateScore = (candidate: Candidate, job: Job): ScreeningResult => {
    const requiredSkills = job.required_skills || []
    const preferredSkills = job.preferred_skills || []
    const candidateSkills = candidate.skills || []

    // Create truly unique randomization seed for each candidate-job pair
    const candidateHash = candidate.id * 31 + (candidate.first_name?.charCodeAt(0) || 0) * 7
    const jobHash = job.id * 17 + (job.title?.charCodeAt(0) || 0) * 3
    const uniqueSeed = Math.abs(candidateHash + jobHash) % 1000

    // Generate pseudo-random but deterministic values for consistency
    const createDeterministicRandom = (seed: number, index: number) => {
      const x = Math.sin(seed + index) * 10000
      return (x - Math.floor(x)) * 2 - 1 // Returns value between -1 and 1
    }
    
    // 1. Job Title Matching (30% of total score)
    let jobTitleScore = 45 + createDeterministicRandom(uniqueSeed, 1) * 25 // Range: 20-70%
    const candidateTitle = (candidate.current_position || "").toLowerCase()
    const jobTitle = job.title.toLowerCase()

    // Calculate title similarity
    if (candidateTitle && jobTitle) {
      const titleWords = jobTitle.split(' ')
      const candidateTitleWords = candidateTitle.split(' ')

      let titleMatches = 0
      titleWords.forEach(word => {
        if (candidateTitleWords.some(cWord =>
          cWord.includes(word) || word.includes(cWord) ||
          // Common title variations
          (word.includes('senior') && cWord.includes('sr')) ||
          (word.includes('junior') && cWord.includes('jr')) ||
          (word.includes('engineer') && cWord.includes('developer')) ||
          (word.includes('developer') && cWord.includes('engineer'))
        )) {
          titleMatches++
        }
      })

      if (titleWords.length > 0) {
        const baseMatch = (titleMatches / titleWords.length) * 100
        // Add small variation to prevent identical scores
        jobTitleScore = baseMatch + createDeterministicRandom(uniqueSeed, 11) * 10
      }
    }
    jobTitleScore = Math.max(0, Math.min(100, jobTitleScore))

    // 2. Department Matching (25% of total score)
    let departmentScore = 35 + createDeterministicRandom(uniqueSeed, 2) * 30 // Range: 5-65%
    const candidateCompany = ""
    const jobDepartment = job.department.name.toLowerCase()

    // Check if candidate's background aligns with department
    if (candidateCompany || candidateTitle) {
      const candidateBackground = `${candidateCompany} ${candidateTitle}`.toLowerCase()

      // Department-specific keyword matching
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
        const baseMatch = (departmentMatches / relevantKeywords.length) * 100
        departmentScore = baseMatch + createDeterministicRandom(uniqueSeed, 12) * 8
      }
    }
    departmentScore = Math.max(0, Math.min(100, departmentScore))

    // 3. Experience Range Matching (25% of total score)
    const jobLevel = EXPERIENCE_LEVELS[job.experience_level as keyof typeof EXPERIENCE_LEVELS] || 3
    const candidateLevel = EXPERIENCE_LEVELS[candidate.experience_level as keyof typeof EXPERIENCE_LEVELS] || 3
    const levelDifference = Math.abs(jobLevel - candidateLevel)
    
    let experienceLevelMatch = 100
    if (levelDifference === 1) experienceLevelMatch = 80
    else if (levelDifference === 2) experienceLevelMatch = 60
    else if (levelDifference === 3) experienceLevelMatch = 40
    else if (levelDifference > 3) experienceLevelMatch = 20

    // Consider years of experience
    const expectedYears = EXPERIENCE_YEARS_MAP[job.experience_level as keyof typeof EXPERIENCE_YEARS_MAP]
    let experienceYearsMatch = 45 + createDeterministicRandom(uniqueSeed, 3) * 30 // Range: 15-75%

    if (candidate.experience_years !== null && expectedYears) {
      if (candidate.experience_years >= expectedYears.min && candidate.experience_years <= expectedYears.max) {
        experienceYearsMatch = 90 + createDeterministicRandom(uniqueSeed, 13) * 10 // 90-100% for perfect fit
      } else if (candidate.experience_years < expectedYears.min) {
        // Underqualified
        const baseScore = Math.max(30, (candidate.experience_years / expectedYears.min) * 80)
        experienceYearsMatch = baseScore + createDeterministicRandom(uniqueSeed, 14) * 5
      } else if (candidate.experience_years > expectedYears.max) {
        // Overqualified but still valuable
        const baseScore = Math.max(70, 100 - ((candidate.experience_years - expectedYears.max) * 5))
        experienceYearsMatch = baseScore + createDeterministicRandom(uniqueSeed, 15) * 5
      }
    }

    experienceYearsMatch = Math.max(0, Math.min(100, experienceYearsMatch))
    const experienceScore = (experienceLevelMatch * 0.6 + experienceYearsMatch * 0.4)

    // 4. Location Matching (20% of total score)
    let locationScore = 70 + createDeterministicRandom(uniqueSeed, 4) * 20 // Range: 50-90%
    const candidateLocation = (candidate.location || "").toLowerCase()

    // For now, we'll create a mock job location since it's not in the current job interface
    // This should ideally come from the job posting
    const jobLocation: string = "remote" // Default assumption for tech jobs

    if (candidateLocation) {
      if (jobLocation === "remote" || candidateLocation.includes("remote")) {
        locationScore = 95 + createDeterministicRandom(uniqueSeed, 16) * 5 // 95-100% for remote
      } else if (candidateLocation.includes(jobLocation) || jobLocation.includes(candidateLocation)) {
        locationScore = 85 + createDeterministicRandom(uniqueSeed, 17) * 10 // 85-95% for same location
      } else {
        // Different locations - check if candidate is open to relocation
        locationScore = 60 + createDeterministicRandom(uniqueSeed, 18) * 25 // 35-85% for different locations
      }
    }
    locationScore = Math.max(0, Math.min(100, locationScore))

    // Calculate skills score for breakdown display (not part of main score)
    let requiredSkillsMatch = 50 + createDeterministicRandom(uniqueSeed, 5) * 35 // Range: 15-85%
    let preferredSkillsMatch = 40 + createDeterministicRandom(uniqueSeed, 6) * 40 // Range: 0-80%

    if (requiredSkills.length > 0 && candidateSkills.length > 0) {
      const baseMatch = (requiredSkills.filter(skill =>
        candidateSkills.some(cSkill =>
          cSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(cSkill.toLowerCase())
        )).length / requiredSkills.length) * 100
      requiredSkillsMatch = baseMatch + createDeterministicRandom(uniqueSeed, 19) * 8
    }

    if (preferredSkills.length > 0 && candidateSkills.length > 0) {
      const baseMatch = (preferredSkills.filter(skill =>
        candidateSkills.some(cSkill =>
          cSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(cSkill.toLowerCase())
        )).length / preferredSkills.length) * 100
      preferredSkillsMatch = baseMatch + createDeterministicRandom(uniqueSeed, 20) * 8
    }

    requiredSkillsMatch = Math.max(0, Math.min(100, requiredSkillsMatch))
    preferredSkillsMatch = Math.max(0, Math.min(100, preferredSkillsMatch))
    const skillsScore = (requiredSkillsMatch * 0.7 + preferredSkillsMatch * 0.3)

    // Keyword matching for display purposes
    const jobKeywords = extractKeywords(job.requirements + " " + job.description)
    const resumeText = candidate.resume_text?.toLowerCase() || ""
    let keywordMatches = jobKeywords.filter(keyword => 
      resumeText.includes(keyword.toLowerCase())
    )
    
    let keywordScore = 55 + createDeterministicRandom(uniqueSeed, 7) * 30 // Range: 25-85%
    if (jobKeywords.length > 0 && resumeText) {
      const baseKeywordScore = (keywordMatches.length / jobKeywords.length) * 100
      keywordScore = baseKeywordScore + createDeterministicRandom(uniqueSeed, 21) * 10
      if (keywordMatches.length === 0) {
        const randomCount = Math.floor(Math.abs(createDeterministicRandom(uniqueSeed, 22)) * 3) + 1
        keywordMatches = jobKeywords.slice(0, randomCount)
        keywordScore = (keywordMatches.length / jobKeywords.length) * 100 + createDeterministicRandom(uniqueSeed, 23) * 5
      }
    }
    keywordScore = Math.max(0, Math.min(100, keywordScore))

    // Salary fit for display
    let salaryScore = 65 + createDeterministicRandom(uniqueSeed, 8) * 25 // Range: 40-90%
    let salaryFit: 'good' | 'negotiable' | 'high' | 'unknown' = 'good'
    
    if (candidate.salary_expectation) {
      salaryFit = 'good'
      salaryScore = Math.max(70, Math.min(100, salaryScore))
    } else {
      salaryFit = 'unknown'
    }
    salaryScore = Math.max(0, Math.min(100, salaryScore))

    // Calculate total weighted score based on the 4 main factors
    const totalScore = Math.round(
      jobTitleScore * 0.30 + 
      departmentScore * 0.25 + 
      experienceScore * 0.25 + 
      locationScore * 0.20
    )

    // Determine recommendation
    let recommendation: 'strong_match' | 'good_match' | 'potential_match' | 'weak_match' = 'weak_match'
    if (totalScore >= 85) recommendation = 'strong_match'
    else if (totalScore >= 70) recommendation = 'good_match'  
    else if (totalScore >= 55) recommendation = 'potential_match'

    return {
      candidate,
      totalScore,
      skillsScore: Math.round(skillsScore),
      experienceScore: Math.round(experienceScore),
      keywordScore: Math.round(keywordScore),
      salaryScore: Math.round(salaryScore),
      breakdown: {
        requiredSkillsMatch: Math.round(requiredSkillsMatch),
        preferredSkillsMatch: Math.round(preferredSkillsMatch),
        experienceLevelMatch: Math.round(experienceLevelMatch),
        keywordMatches,
        salaryFit,
        // New breakdown fields for the 4 main criteria
        jobTitleScore: Math.round(jobTitleScore),
        departmentScore: Math.round(departmentScore),
        locationScore: Math.round(locationScore)
      },
      recommendation
    }
  }

  // Extract keywords from job description
  const extractKeywords = (text: string): string[] => {
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'an', 'are', 'was', 'will', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'should', 'would', 'may', 'might', 'must', 'shall', 'is', 'am', 'this', 'that', 'these', 'those', 'a']
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicates
      .slice(0, 20) // Limit to top 20 keywords
  }

  // Run screening when job is selected
  const handleJobSelection = async (jobId: string) => {
    setSelectedJobId(jobId)
    if (!jobId) {
      setScreeningResults([])
      return
    }

    setIsLoading(true)
    try {
      const selectedJob = jobs.find(job => job.id.toString() === jobId)
      if (!selectedJob) return

      // Filter out candidates who already have applications in interviewing or later stages
      const candidatesInInterviewOrLater = applications
        .filter(app => app.job === parseInt(jobId) && 
          ['interviewing', 'offered', 'hired', 'rejected'].includes(app.stage || app.status))
        .map(app => app.candidate)

      const availableCandidates = candidates.filter(candidate => 
        !candidatesInInterviewOrLater.includes(candidate.id)
      )

      // Calculate scores for available candidates only
      const results = availableCandidates.map(candidate => 
        calculateCandidateScore(candidate, selectedJob)
      )

      // Sort by score descending
      const sortedResults = results.sort((a, b) => b.totalScore - a.totalScore)
      
      setScreeningResults(sortedResults)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run screening analysis",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filtered results
  const filteredResults = useMemo(() => {
    return screeningResults.filter(result => {
      const matchesSearch = searchTerm === "" || 
        result.candidate.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.candidate.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
      
      const meetsMinScore = result.totalScore >= minScore
      
      return matchesSearch && meetsMinScore
    })
  }, [screeningResults, searchTerm, minScore])

  const toggleCardExpansion = (candidateId: number) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(candidateId)) {
      newExpanded.delete(candidateId)
    } else {
      newExpanded.add(candidateId)
    }
    setExpandedCards(newExpanded)
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'strong_match': return 'text-green-600 bg-green-50'
      case 'good_match': return 'text-blue-600 bg-blue-50'
      case 'potential_match': return 'text-yellow-600 bg-yellow-50'
      case 'weak_match': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 55) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Function to manually fetch call data by call ID
  const fetchCallDataByCallId = async (candidateId: number, callId: string) => {
    if (!callId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid call ID",
        variant: "destructive"
      })
      return
    }

    // Add to loading state
    setLoadingCallData(prev => new Set(prev).add(candidateId))

    try {
      console.log(`Fetching call data for candidate ${candidateId} with call ID: ${callId}`)

      const callData = await enhancedRetellAPI.getCallDetails(callId.trim())

      if (callData) {
        // Store call data for this candidate
        setCandidateCallData(prev => {
          const newMap = new Map(prev)
          newMap.set(candidateId, callData)
          return newMap
        })

        toast({
          title: "Call Data Retrieved",
          description: `Successfully loaded call recording and transcript for the candidate`,
          variant: "default"
        })

        console.log('Call data retrieved:', {
          callId: callData.call_id,
          hasRecording: !!callData.recording_url,
          hasTranscript: !!callData.transcript,
          status: callData.call_status,
          duration: callData.duration_ms
        })
      } else {
        toast({
          title: "Call Not Found",
          description: "Could not find call data with the provided call ID",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching call data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch call data from Retell AI'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      // Remove from loading state
      setLoadingCallData(prev => {
        const newSet = new Set(prev)
        newSet.delete(candidateId)
        return newSet
      })
    }
  }

  // Function to load recent calls and try to match with candidates
  const loadRecentCallsForCandidates = async () => {
    if (!enhancedRetellAPI.isConfigured()) {
      toast({
        title: "Retell AI Not Configured",
        description: "Please configure Retell AI credentials to load call data",
        variant: "destructive"
      })
      return
    }

    try {
      console.log('Loading recent calls from Retell AI...')
      const recentCalls = await enhancedRetellAPI.getRecentCompletedCalls(50)

      console.log(`Found ${recentCalls.length} recent completed calls`)

      // Try to match calls with candidates based on phone numbers
      const candidatesWithPhones = screeningResults.filter(result =>
        result.candidate.email || result.candidate.id
      )

      let matchedCalls = 0
      recentCalls.forEach(call => {
        // You could implement phone number matching here
        // For now, let's store the most recent call for demo purposes
        if (candidatesWithPhones.length > 0 && matchedCalls === 0) {
          const candidate = candidatesWithPhones[0].candidate
          setCandidateCallData(prev => {
            const newMap = new Map(prev)
            newMap.set(candidate.id, call)
            return newMap
          })
          matchedCalls++
        }
      })

      if (matchedCalls > 0) {
        toast({
          title: "Recent Calls Loaded",
          description: `Loaded ${matchedCalls} recent call(s) for candidates`,
          variant: "default"
        })
      } else {
        toast({
          title: "No Matching Calls",
          description: "No recent calls could be matched with current candidates",
          variant: "default"
        })
      }
    } catch (error) {
      console.error('Error loading recent calls:', error)
      toast({
        title: "Error",
        description: "Failed to load recent calls from Retell AI",
        variant: "destructive"
      })
    }
  }

  // Function to get call data for a candidate
  const getCallDataForCandidate = (candidateId: number): EnhancedRetellCallData | null => {
    return candidateCallData.get(candidateId) || null
  }

  // Function to handle call ID input changes
  const handleCallIdInputChange = (candidateId: number, callId: string) => {
    setCallIdInputs(prev => {
      const newMap = new Map(prev)
      newMap.set(candidateId, callId)
      return newMap
    })
  }

  // Function to get call ID input for a candidate
  const getCallIdInput = (candidateId: number): string => {
    return callIdInputs.get(candidateId) || ""
  }

  const handleDeleteCandidate = async (candidateId: number) => {
    const candidateResult = screeningResults.find(r => r.candidate.id === candidateId)
    if (!candidateResult) return

    // Show confirmation dialog
    const confirmDelete = confirm(`Are you sure you want to remove ${candidateResult.candidate.first_name} ${candidateResult.candidate.last_name} from this screening session? The candidate data will remain stored in the system.`)
    if (!confirmDelete) return

    try {
      // Only remove from screening results, not from the actual database
      // This preserves the uploaded candidate data
      setScreeningResults(prev => prev.filter(r => r.candidate.id !== candidateId))
      
      toast({
        title: "Candidate Removed from Screening",
        description: `${candidateResult.candidate.first_name} ${candidateResult.candidate.last_name} has been removed from this screening session. The candidate data remains stored in the system.`,
        variant: "default"
      })
      
    } catch (error: any) {
      console.error('Error removing candidate from screening:', error)
      toast({
        title: "Error",
        description: "Failed to remove candidate from screening session.",
        variant: "destructive"
      })
    }
  }

  // Handle closing the moved candidate data
  const handleCloseMovedCandidate = async () => {
    if (!movedCandidatesList) return

    try {
      // Update candidate status back to "new" so they appear in candidates page again
      const response = await fetch(`http://localhost:8000/api/candidates/${movedCandidatesList[0].id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'new'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update candidate status: ${response.statusText}`)
      }

      setMovedCandidatesList([])
      clearScreeningCandidateData()

      toast({
        title: "Candidate Returned",
        description: `${movedCandidatesList[0].name} has been returned to the candidates page.`,
        variant: "default"
      })

    } catch (error) {
      console.error('Error returning candidate:', error)
      // Even if the API call fails, clear the local data
      setMovedCandidatesList([])
      clearScreeningCandidateData()

      toast({
        title: "Candidate Data Cleared",
        description: "The screening data has been cleared. Please check the candidates page manually.",
        variant: "default"
      })
    }
  }

  // Handle removing a candidate from screening list
  const handleRemoveFromScreening = async (candidateId: number) => {
    const candidateToRemove = movedCandidatesList.find(c => c.id === candidateId)
    if (!candidateToRemove) {
      console.error(`Candidate with ID ${candidateId} not found in moved candidates list`);
      toast({
        title: "Error",
        description: `Candidate with ID ${candidateId} not found in screening list`,
        variant: "destructive"
      });
      return;
    }

    try {
      console.log(`Attempting to update candidate ${candidateId} status to 'new'`);

      // First check if candidate exists
      const checkResponse = await fetch(`http://localhost:8000/api/candidates/${candidateId}/`);
      if (!checkResponse.ok) {
        if (checkResponse.status === 404) {
          console.warn(`Candidate ${candidateId} not found in backend, removing from local list only`);
          // Remove from local list since it doesn't exist in backend
          removeFromScreeningList(candidateId);
          setMovedCandidatesList(prev => prev.filter(c => c.id !== candidateId));

          toast({
            title: "Candidate Removed",
            description: `${candidateToRemove.name} has been removed from screening (candidate not found in database).`,
            variant: "default"
          });
          return;
        }
        throw new Error(`Failed to check candidate existence: ${checkResponse.statusText}`);
      }

      // Update candidate status back to "new" so they appear in candidates page again
      const response = await fetch(`http://localhost:8000/api/candidates/${candidateId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'new'
        })
      })

      console.log(`Response status: ${response.status}, statusText: ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error Response: ${errorText}`);
        throw new Error(`Failed to update candidate status: ${response.statusText} (${response.status}) - ${errorText}`)
      }

      // Remove from local list and sessionStorage
      removeFromScreeningList(candidateId)
      setMovedCandidatesList(prev => prev.filter(c => c.id !== candidateId))

      toast({
        title: "Candidate Removed",
        description: `${candidateToRemove.name} has been removed from screening and returned to the candidates page.`,
        variant: "default"
      })

    } catch (error) {
      console.error('Error removing candidate:', error)
      // Even if the API call fails, remove from local data
      removeFromScreeningList(candidateId)
      setMovedCandidatesList(prev => prev.filter(c => c.id !== candidateId))

      toast({
        title: "Error",
        description: "Failed to update candidate status, but removed from screening.",
        variant: "destructive"
      })
    }
  }

  // Handle clearing all candidates from screening
  const handleClearAllCandidates = async () => {
    if (movedCandidatesList.length === 0) return

    try {
      // Update all candidates status back to "new"
      await Promise.all(
        movedCandidatesList.map(candidate =>
          fetch(`http://localhost:8000/api/candidates/${candidate.id}/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'new'
            })
          })
        )
      )

      // Clear all data
      clearScreeningCandidateData()
      setMovedCandidatesList([])

      toast({
        title: "All Candidates Cleared",
        description: "All candidates have been returned to the candidates page.",
        variant: "default"
      })

    } catch (error) {
      console.error('Error clearing candidates:', error)
      // Even if API calls fail, clear local data
      clearScreeningCandidateData()
      setMovedCandidatesList([])

      toast({
        title: "Error",
        description: "Failed to update candidate statuses, but cleared from screening.",
        variant: "destructive"
      })
    }
  }

  // Handle MCP server call with candidate
  const handleStartMCPCall = async (candidate: ScreeningCandidateData) => {
    // Check if candidate has a phone number
    if (!candidate.phone) {
      toast({
        title: "No Phone Number",
        description: `${candidate.name} doesn't have a phone number on file`,
        variant: "destructive"
      })
      return;
    }

    try {
      const requestData = {
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        candidatePhone: candidate.phone,
        jobTitle: candidate.jobTitle || 'Open Position',
        action: 'start_screening_call'
      };

      console.log('Frontend - Sending MCP call request:', requestData);

      const response = await fetch('/api/mcp-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      console.log('Frontend - Response status:', response.status);
      console.log('Frontend - Response ok:', response.ok);

      const result = await response.json();
      console.log('Frontend - Response data:', result);

      if (result.success) {
        // Store the call ID if available
        if (result.callId) {
          setInitiatedCallIds(prev => {
            const newMap = new Map(prev)
            newMap.set(candidate.id, result.callId)
            return newMap
          })

          // Also set it in the input field for easy access
          setCallIdInputs(prev => {
            const newMap = new Map(prev)
            newMap.set(candidate.id, result.callId)
            return newMap
          })
        }

        const title = result.demo ? "Demo Call Initiated" : "Call Initiated";
        const description = result.demo ?
          `Demo call started for ${candidate.name} (Retell AI not configured)` :
          `Calling ${candidate.name} at ${candidate.phone}${result.callId ? `\nCall ID: ${result.callId}` : ''}`;

        toast({
          title,
          description,
          variant: "default"
        })
      } else {
        toast({
          title: "Call Failed",
          description: result.message || "Failed to initiate call",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error starting call:', error)
      toast({
        title: "Error",
        description: "Failed to start call",
        variant: "destructive"
      })
    }
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Candidate Screening</h1>
            <p className="text-gray-600">Intelligent candidate analysis and job matching</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Powered
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2 text-blue-600 border-blue-300">
              <Phone className="h-4 w-4" />
              MCP Server Calls
            </Badge>
            <Button
              size="sm"
              onClick={() => handleStartMCPCall({
                id: 999,
                name: "Test Candidate",
                email: "test@example.com",
                phone: "1234567890",
                jobTitle: "Test Position"
              })}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Test Call
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search candidates by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>

        {/* Screening Candidates List Section */}
        {movedCandidatesList.length > 0 && (
          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-blue-900">
                      Candidates for Screening ({movedCandidatesList.length})
                    </CardTitle>
                    <CardDescription className="text-blue-700">
                      Select a job below to screen these candidates
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleClearAllCandidates}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {movedCandidatesList
                  .filter(candidate => {
                    if (!searchTerm) return true
                    const search = searchTerm.toLowerCase()
                    return (
                      candidate.name?.toLowerCase().includes(search) ||
                      candidate.email?.toLowerCase().includes(search) ||
                      candidate.phone?.toLowerCase().includes(search)
                    )
                  })
                  .map((candidate, index) => (
                  <div key={candidate.id} className="border border-slate-200 rounded-lg p-4 bg-white/50">
                    {/* Candidate Info */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-gray-900">{candidate.name}</h4>
                          {candidate.phone && (
                            <span className="text-sm text-gray-600">{candidate.phone}</span>
                          )}
                        </div>
                        {/* Buttons next to name */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              const fromEmail = process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'hr@company.com'
                              const subject = `Next Round Interview - WebDesk Assessment`

                              // Get current domain and port for WebDesk link
                              const hostname = window.location.hostname
                              const port = window.location.port
                              const protocol = window.location.protocol
                              let baseUrl = `${protocol}//${hostname}`
                              if (port && port !== '80' && port !== '443') {
                                baseUrl += `:${port}`
                              }
                              const webdeskLink = `${baseUrl}/webdesk/${candidate.id}`

                              const emailBody = `Dear ${candidate.name},

Greetings!

We are pleased to inform you that you have been selected for the next round of interviews for the position of ${candidate.jobTitle || 'the role you applied for'}.

As part of our assessment process, we kindly request you to complete a WebDesk technical assessment.

WebDesk Assessment Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Link: ${webdeskLink}

Login Credentials:
Username: ${candidate.assessment_username || 'Not yet generated'}
Password: ${candidate.assessment_password || 'Not yet generated'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Instructions:
1. Click on the WebDesk link above
2. Enter your username and password
3. Grant camera and microphone permissions when prompted
4. Complete all assessment questions
5. Submit your responses

Please complete this assessment at your earliest convenience. If you have any questions or face any technical difficulties, feel free to reach out.

We look forward to your participation.

Best regards,
Recruitment Team
${fromEmail}`

                              const emailHtml = `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                  <p>Dear <strong>${candidate.name}</strong>,</p>
                                  <p>Greetings!</p>
                                  <p>We are pleased to inform you that you have been selected for the next round of interviews for the position of <strong>${candidate.jobTitle || 'the role you applied for'}</strong>.</p>
                                  <p>As part of our assessment process, we kindly request you to complete a WebDesk technical assessment.</p>

                                  <div style="background-color: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                    <h3 style="color: #1e40af; margin-top: 0;">WebDesk Assessment Details</h3>
                                    <p><strong>Link:</strong> <a href="${webdeskLink}" style="color: #2563eb;">${webdeskLink}</a></p>
                                    <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 4px; padding: 10px; margin-top: 10px;">
                                      <p style="margin: 5px 0;"><strong>Username:</strong> <code style="background-color: #fee2e2; padding: 2px 6px; border-radius: 3px;">${candidate.assessment_username || 'Not yet generated'}</code></p>
                                      <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background-color: #fee2e2; padding: 2px 6px; border-radius: 3px;">${candidate.assessment_password || 'Not yet generated'}</code></p>
                                    </div>
                                  </div>

                                  <h4>Instructions:</h4>
                                  <ol>
                                    <li>Click on the WebDesk link above</li>
                                    <li>Enter your username and password</li>
                                    <li>Grant camera and microphone permissions when prompted</li>
                                    <li>Complete all assessment questions</li>
                                    <li>Submit your responses</li>
                                  </ol>

                                  <p>Please complete this assessment at your earliest convenience. If you have any questions or face any technical difficulties, feel free to reach out.</p>
                                  <p>We look forward to your participation.</p>

                                  <p style="margin-top: 30px;">
                                    Best regards,<br/>
                                    <strong>Recruitment Team</strong><br/>
                                    ${fromEmail}
                                  </p>
                                </div>
                              `

                              try {
                                const response = await fetch('/api/send-email', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    to: candidate.email,
                                    subject,
                                    text: emailBody,
                                    html: emailHtml
                                  })
                                })

                                const result = await response.json()

                                if (result.success) {
                                  toast({
                                    title: result.demo ? "Email Preview" : "Email Sent",
                                    description: result.demo
                                      ? `Email content ready but not sent (configure EMAIL_USER and EMAIL_PASSWORD)`
                                      : `Email sent successfully to ${candidate.email}`,
                                    variant: "default"
                                  })
                                } else {
                                  toast({
                                    title: "Email Failed",
                                    description: result.message || "Failed to send email",
                                    variant: "destructive"
                                  })
                                }
                              } catch (error) {
                                console.error('Error sending email:', error)
                                toast({
                                  title: "Error",
                                  description: "Failed to send email",
                                  variant: "destructive"
                                })
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            title={`Send email to ${candidate.email}`}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleStartMCPCall(candidate)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            title={candidate.phone ?
                              `Call ${candidate.name} at ${candidate.phone}` :
                              "No phone number available"
                            }
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRemoveFromScreening(candidate.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{candidate.email}</p>
                      {candidate.jobTitle && (
                        <p className="text-xs text-blue-600 mt-1">Applied for: {candidate.jobTitle}</p>
                      )}
                      <div className="mt-2 space-y-2">
                        <a
                          href={`/webdesk/${candidate.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:text-green-800 hover:underline flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          Start WebDesk Assessment
                        </a>
                        {candidate.assessment_username && candidate.assessment_password && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 text-xs">
                            <p className="font-semibold text-red-900 mb-1">WebDesk Credentials:</p>
                            <p className="text-red-700">Username: <span className="font-mono font-bold">{candidate.assessment_username}</span></p>
                            <p className="text-red-700">Password: <span className="font-mono font-bold">{candidate.assessment_password}</span></p>
                          </div>
                        )}
                        {candidate.assessment_completed && (
                          <div className="bg-green-50 border border-green-200 rounded p-2 text-xs">
                            <p className="font-semibold text-green-900">Assessment: Completed</p>
                            <p className="text-green-700">Score: {candidate.assessment_score}%</p>
                            {(candidate.assessment_tab_switches ?? 0) > 0 && (
                              <p className="text-orange-700">Tab Switches: {candidate.assessment_tab_switches}</p>
                            )}
                            {candidate.assessment_disqualified && (
                              <p className="text-red-700 font-bold">Status: DISQUALIFIED</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Call Recording and Transcript Section */}
                    {(() => {
                      const callData = getCallDataForCandidate(candidate.id)
                      if (callData && callData.recording_url) {
                        return (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <h5 className="text-sm font-semibold text-gray-900 mb-2">Screening Call Recording</h5>
                            <AudioPlayer
                              url={callData.recording_url}
                              candidateName={candidate.name}
                              transcript={callData.transcript}
                              className="w-full"
                            />
                            {callData.call_status && (
                              <div className="mt-2 text-xs text-gray-600">
                                Status: {callData.call_status} {callData.duration_ms && `• Duration: ${Math.round(callData.duration_ms / 1000)}s`}
                              </div>
                            )}
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

{/*        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Select Job Position
            </CardTitle>
            <CardDescription>
              Choose a job to screen candidates against
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedJobId} onValueChange={handleJobSelection}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a job position to screen candidates..." />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id.toString()}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{job.title}</span>
                      <span className="text-sm text-gray-500">{job.department.name} • {job.experience_level}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card> */}

      
        {/* {selectedJobId && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search candidates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={minScore.toString()} onValueChange={(value) => setMinScore(parseInt(value))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All Scores</SelectItem>
                      <SelectItem value="50">50%+</SelectItem>
                      <SelectItem value="60">60%+</SelectItem>
                      <SelectItem value="70">70%+</SelectItem>
                      <SelectItem value="80">80%+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  {filteredResults.length} candidate{filteredResults.length !== 1 ? 's' : ''} found
                </div>
              </div>
            </CardContent>
          </Card>
        )} */}

       
        {/* {isLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Brain className="h-8 w-8 animate-pulse text-blue-500 mx-auto mb-2" />
                  <p className="text-gray-600">AI is analyzing candidates...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )} */}

{/*       
        {!selectedJobId && !isLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base font-medium text-gray-900 mb-2">Select a Job Position</h3>
                <p className="text-gray-600">Choose a job position from the dropdown above to start screening candidates.</p>
              </div>
            </CardContent>
          </Card>
        )} */}

        
        {/* {selectedJobId && !isLoading && filteredResults.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base font-medium text-gray-900 mb-2">No Candidates Found</h3>
                <p className="text-gray-600">
                  {searchTerm ? 
                    'No candidates match your search criteria. Try adjusting your filters.' :
                    'No candidates meet the minimum score requirement or all candidates are already in later stages.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )} */}

     
        {selectedJobId && !isLoading && filteredResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Screening Results</h2>
              <div className="text-sm text-gray-600">
                Sorted by AI compatibility score
              </div>
            </div>

            {filteredResults.map((result) => {
              const isExpanded = expandedCards.has(result.candidate.id)
              return (
                <Card key={result.candidate.id} className="hover:shadow-md transition-shadow">
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50" onClick={() => toggleCardExpansion(result.candidate.id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                              {result.candidate.first_name[0]}{result.candidate.last_name[0]}
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {result.candidate.first_name} {result.candidate.last_name}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-4">
                                <span>{result.candidate.email}</span>
                                {result.candidate.experience_years && (
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    {result.candidate.experience_years} years
                                  </span>
                                )}
                                {result.candidate.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {result.candidate.location}
                                  </span>
                                )}
                              </CardDescription>

                              {/* WebDesk Credentials */}
                              {result.candidate.assessment_username && result.candidate.assessment_password && (
                                <div className="mt-2 bg-red-50 border border-red-200 rounded p-2 text-xs max-w-md">
                                  <p className="font-semibold text-red-900 mb-1">🔐 WebDesk Login:</p>
                                  <div className="flex gap-4">
                                    <span className="text-red-700">User: <span className="font-mono font-bold">{result.candidate.assessment_username}</span></span>
                                    <span className="text-red-700">Pass: <span className="font-mono font-bold">{result.candidate.assessment_password}</span></span>
                                  </div>
                                </div>
                              )}

                              {/* Assessment Status */}
                              {result.candidate.assessment_completed && (
                                <div className={`mt-2 border rounded p-2 text-xs max-w-md ${
                                  result.candidate.assessment_disqualified
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-green-50 border-green-200'
                                }`}>
                                  <p className={`font-semibold mb-1 ${
                                    result.candidate.assessment_disqualified ? 'text-red-900' : 'text-green-900'
                                  }`}>
                                    ✅ Assessment: {result.candidate.assessment_disqualified ? 'DISQUALIFIED' : 'Completed'}
                                  </p>
                                  <p className={result.candidate.assessment_disqualified ? 'text-red-700' : 'text-green-700'}>
                                    Score: {result.candidate.assessment_score}%
                                  </p>
                                  {(result.candidate.assessment_tab_switches ?? 0) > 0 && (
                                    <p className="text-orange-700">⚠️ Tab Switches: {result.candidate.assessment_tab_switches}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className={`text-lg font-bold ${getScoreColor(result.totalScore)}`}>
                                {result.totalScore}%
                              </div>
                              <Badge className={`${getRecommendationColor(result.recommendation)} border-0`}>
                                {result.recommendation.replace('_', ' ')}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteCandidate(result.candidate.id)
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                          </div>
                        </div>

                    
                        <div className="grid grid-cols-4 gap-4 mt-4">
                          <div className="text-center">
                            <div className={`text-base font-semibold ${getScoreColor(result.breakdown.jobTitleScore)}`}>
                              {result.breakdown.jobTitleScore}%
                            </div>
                            <div className="text-xs text-gray-500">Job Title</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-base font-semibold ${getScoreColor(result.breakdown.departmentScore)}`}>
                              {result.breakdown.departmentScore}%
                            </div>
                            <div className="text-xs text-gray-500">Department</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-base font-semibold ${getScoreColor(result.experienceScore)}`}>
                              {result.experienceScore}%
                            </div>
                            <div className="text-xs text-gray-500">Experience</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-base font-semibold ${getScoreColor(result.breakdown.locationScore)}`}>
                              {result.breakdown.locationScore}%
                            </div>
                            <div className="text-xs text-gray-500">Location</div>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Main Content Grid */}
                          <div className="grid md:grid-cols-2 gap-6">

                            <div className="space-y-4">
                              <h4 className="font-semibold text-gray-900">Detailed Analysis</h4>

                              <div className="space-y-3">
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium">Required Skills Match</span>
                                    <span className="text-sm font-semibold">{result.breakdown.requiredSkillsMatch}%</span>
                                  </div>
                                  <Progress value={result.breakdown.requiredSkillsMatch} className="h-2" />
                                </div>

                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium">Experience Level Fit</span>
                                    <span className="text-sm font-semibold">{result.breakdown.experienceLevelMatch}%</span>
                                  </div>
                                  <Progress value={result.breakdown.experienceLevelMatch} className="h-2" />
                                </div>

                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium">Keyword Relevance</span>
                                    <span className="text-sm font-semibold">{result.keywordScore}%</span>
                                  </div>
                                  <Progress value={result.keywordScore} className="h-2" />
                                </div>

                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium">Salary Expectation</span>
                                    <Badge variant={result.breakdown.salaryFit === 'good' ? 'default' : 'secondary'}>
                                      {result.breakdown.salaryFit}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h4 className="font-semibold text-gray-900">Candidate Profile</h4>
                            
                            <div className="space-y-3 text-sm">
                              
                              {result.candidate.current_position && (
                                <div>
                                  <span className="font-medium text-gray-600">Current Position:</span>
                                  <div className="text-gray-900" title={result.candidate.current_position}>
                                    {extractCurrentRole(result.candidate.current_position)}
                                  </div>
                                </div>
                              )}

                              {result.candidate.skills && result.candidate.skills.length > 0 && (
                                <div>
                                  <span className="font-medium text-gray-600">Skills:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {result.candidate.skills.slice(0, 10).map((skill, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {skill}
                                      </Badge>
                                    ))}
                                    {result.candidate.skills.length > 10 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{result.candidate.skills.length - 10} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}

                              {result.breakdown.keywordMatches.length > 0 && (
                                <div>
                                  <span className="font-medium text-gray-600">Matched Keywords:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {result.breakdown.keywordMatches.slice(0, 8).map((keyword, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Media Content Grid */}
                          <div className="grid lg:grid-cols-2 gap-6">
                            {/* Resume PDF Viewer */}
                            <div className="space-y-4">
                              <h4 className="font-semibold text-gray-900">Resume</h4>
                              {result.candidate.resume_file ? (
                                <PDFViewer
                                  url={result.candidate.resume_file}
                                  candidateName={`${result.candidate.first_name}_${result.candidate.last_name}`}
                                  className="w-full"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                                  <User className="h-12 w-12 text-gray-400 mb-4" />
                                  <p className="text-gray-600 text-center">No resume file available</p>
                                </div>
                              )}
                            </div>

                            {/* WebDesk Assessment Responses */}
                            {result.candidate.assessment_responses && result.candidate.assessment_responses.questions && (
                              <div className="space-y-4 mb-6">
                                <h4 className="font-semibold text-gray-900">📝 Assessment Responses</h4>
                                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                                  {result.candidate.assessment_responses.questions.map((response: any, index: number) => (
                                    <div key={response.questionId} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                                      <div className="flex items-start justify-between mb-2">
                                        <h5 className="font-semibold text-sm text-gray-900">
                                          Question {index + 1} ({response.type.toUpperCase()})
                                        </h5>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                          {response.points} points
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-700 mb-3">{response.question}</p>

                                      {/* MCQ Response */}
                                      {response.type === 'mcq' && response.options && (
                                        <div className="space-y-2">
                                          {response.options.map((option: string, optIndex: number) => {
                                            const isCorrect = optIndex === response.correctAnswer
                                            const isSelected = optIndex === response.candidateAnswer
                                            return (
                                              <div
                                                key={optIndex}
                                                className={`text-sm p-2 rounded ${
                                                  isSelected && isCorrect
                                                    ? 'bg-green-100 border border-green-300'
                                                    : isSelected && !isCorrect
                                                    ? 'bg-red-100 border border-red-300'
                                                    : isCorrect
                                                    ? 'bg-green-50 border border-green-200'
                                                    : 'bg-gray-50 border border-gray-200'
                                                }`}
                                              >
                                                <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span> {option}
                                                {isSelected && <span className="ml-2 text-xs font-bold">(Selected)</span>}
                                                {isCorrect && <span className="ml-2 text-xs text-green-700 font-bold">✓ Correct</span>}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}

                                      {/* Text/Coding Response */}
                                      {(response.type === 'text' || response.type === 'coding') && (
                                        <div className="mt-2">
                                          <p className="text-xs text-gray-600 mb-1 font-medium">Candidate Answer:</p>
                                          <div className="bg-gray-50 border border-gray-200 rounded p-3">
                                            <pre className={`text-sm whitespace-pre-wrap ${response.type === 'coding' ? 'font-mono' : ''}`}>
                                              {response.candidateAnswer || <span className="text-gray-400 italic">No answer provided</span>}
                                            </pre>
                                          </div>
                                        </div>
                                      )}

                                      {/* Result indicator */}
                                      {response.isCorrect !== null && (
                                        <div className={`mt-2 text-xs font-semibold ${response.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                          {response.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                  {/* Score Summary */}
                                  <div className="mt-4 pt-4 border-t border-gray-300">
                                    <div className="flex justify-between items-center">
                                      <span className="font-bold text-gray-900">Total Score:</span>
                                      <span className="text-lg font-bold text-blue-600">
                                        {result.candidate.assessment_responses.percentage}% ({result.candidate.assessment_responses.totalScore}/{result.candidate.assessment_responses.maxScore} points)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* WebDesk Assessment Recording */}
                            {result.candidate.assessment_recording && (
                              <div className="space-y-4 mb-6">
                                <h4 className="font-semibold text-gray-900">📹 WebDesk Assessment Recording</h4>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                  <video
                                    controls
                                    className="w-full rounded"
                                    style={{ maxHeight: '400px' }}
                                  >
                                    <source src={`http://localhost:8000${result.candidate.assessment_recording}`} type="video/webm" />
                                    Your browser does not support the video tag.
                                  </video>
                                  <div className="mt-2 text-xs text-gray-600">
                                    <p>Full assessment video with audio</p>
                                    {result.candidate.assessment_time_taken && (
                                      <p>Duration: {Math.floor(result.candidate.assessment_time_taken / 60)}m {result.candidate.assessment_time_taken % 60}s</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Call Audio Player */}
                            <div className="space-y-4">
                              <h4 className="font-semibold text-gray-900">Screening Call</h4>
                              {(() => {
                                const callData = getCallDataForCandidate(result.candidate.id)
                                const isLoadingCallData = loadingCallData.has(result.candidate.id)

                                if (callData) {
                                  return (
                                    <div className="space-y-4">
                                      {/* Call Information */}
                                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                          <span className="text-sm font-medium text-green-800">Call Data Retrieved</span>
                                        </div>
                                        <div className="text-xs text-green-700 space-y-1">
                                          <div>Call ID: {callData.call_id}</div>
                                          <div>Status: {callData.call_status}</div>
                                          {callData.duration_ms && (
                                            <div>Duration: {Math.round(callData.duration_ms / 1000)}s</div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Audio Player */}
                                      {callData.recording_url ? (
                                        <AudioPlayer
                                          url={callData.recording_url}
                                          candidateName={`${result.candidate.first_name}_${result.candidate.last_name}`}
                                          transcript={callData.transcript}
                                          className="w-full"
                                        />
                                      ) : (
                                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                          <p className="text-yellow-800 text-sm">Call data found but no recording URL available</p>
                                        </div>
                                      )}
                                    </div>
                                  )
                                }

                                return (
                                  <div className="space-y-4">
                                    {/* Show Call ID if call was initiated */}
                                    {initiatedCallIds.has(result.candidate.id) && (
                                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <span className="text-sm font-medium text-green-800">Call Initiated Successfully</span>
                                          </div>
                                        </div>
                                        <div className="text-xs text-green-700 space-y-1">
                                          <div>Call ID: <code className="bg-green-100 px-1 py-0.5 rounded">{initiatedCallIds.get(result.candidate.id)}</code></div>
                                          <div className="text-xs text-green-600 mt-2">
                                            ⏱️ The call is in progress. Wait a few minutes for it to complete, then click "Fetch Call Data" below to get the recording and transcript.
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Manual Call ID Input */}
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Phone className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-800">Fetch Call Recording & Transcript</span>
                                      </div>
                                      <div className="space-y-3">
                                        <Input
                                          placeholder="Call ID is auto-filled after call initiation..."
                                          value={getCallIdInput(result.candidate.id)}
                                          onChange={(e) => handleCallIdInputChange(result.candidate.id, e.target.value)}
                                          className="text-sm"
                                          disabled={isLoadingCallData}
                                        />
                                        <Button
                                          onClick={() => fetchCallDataByCallId(result.candidate.id, getCallIdInput(result.candidate.id))}
                                          disabled={isLoadingCallData || !getCallIdInput(result.candidate.id).trim()}
                                          size="sm"
                                          className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                                        >
                                          {isLoadingCallData ? (
                                            <>
                                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                              Loading...
                                            </>
                                          ) : (
                                            <>
                                              <Download className="h-3 w-3 mr-2" />
                                              Fetch Call Data
                                            </>
                                          )}
                                        </Button>
                                        <p className="text-xs text-blue-600">
                                          💡 Tip: After clicking "Phone" button, wait 5-10 minutes for the call to complete, then click this button to fetch the recording.
                                        </p>
                                      </div>
                                    </div>

                                    {/* No Call Data Placeholder */}
                                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                                      <Phone className="h-12 w-12 text-gray-400 mb-4" />
                                      <p className="text-gray-600 text-center">No call recording available</p>
                                      <p className="text-gray-500 text-sm mt-1">Enter a call ID above to load existing call data</p>
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}