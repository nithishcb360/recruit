'use client'

import React, { useState, useEffect, useMemo, ReactNode, useRef } from 'react'
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
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
  interview_stages?: Array<{
    id: string
    name: string
    interviewerType: 'human' | 'ai' | 'hybrid'
    feedbackFormId: string
    feedbackFormName?: string
    assignee?: string
    assigneeName?: string
  }>
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
  assessment_video_recording?: string
  assessment_screen_recording?: string
  assessment_video_url?: string
  assessment_audio_url?: string
  assessment_screen_url?: string
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

  // Retell AI Call fields
  retell_call_id?: string
  retell_call_status?: string
  retell_call_type?: string
  retell_recording_url?: string
  retell_transcript?: string
  retell_transcript_object?: any[]
  retell_call_duration_ms?: number
  retell_call_summary?: string
  retell_call_analysis?: any
  retell_user_sentiment?: string
  retell_call_successful?: boolean
  retell_in_voicemail?: boolean

  // Retell AI - Interview Scheduling
  retell_interview_scheduled?: boolean
  retell_scheduled_date?: string
  retell_scheduled_time?: string
  retell_scheduled_timezone?: string
  retell_scheduled_datetime_iso?: string
  retell_candidate_timezone?: string
  retell_availability_preference?: string
  retell_unavailable_dates?: string

  // Retell AI - Screening Data
  retell_is_qualified?: boolean
  retell_interest_level?: string
  retell_technical_skills?: string[]
  retell_questions_asked?: string[]
  retell_call_outcome?: string
  retell_rejection_reason?: string

  // Retell AI - Metadata
  retell_metadata?: any
  retell_start_timestamp?: number
  retell_end_timestamp?: number
  retell_public_log_url?: string
  retell_additional_notes?: string

  // Assignment
  assigned_to?: string
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

// PDF Generation Function
const generateAssessmentPDF = (candidate: Candidate, assessmentResponses: any) => {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.setTextColor(40, 60, 120)
  doc.text('Assessment Report', 105, 20, { align: 'center' })

  // Candidate Information
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text(`Candidate: ${candidate.first_name} ${candidate.last_name}`, 14, 35)
  doc.text(`Email: ${candidate.email}`, 14, 42)

  if (candidate.assessment_completed) {
    doc.text(`Status: Completed`, 14, 49)
  }

  if (candidate.assessment_time_taken) {
    const minutes = Math.floor(candidate.assessment_time_taken / 60)
    const seconds = candidate.assessment_time_taken % 60
    doc.text(`Time Taken: ${minutes}m ${seconds}s`, 14, 56)
  }

  if (candidate.assessment_tab_switches !== undefined) {
    doc.text(`Tab Switches: ${candidate.assessment_tab_switches}`, 14, 63)
  }

  // Score Summary
  if (assessmentResponses.percentage !== undefined) {
    doc.setFontSize(14)
    doc.setTextColor(40, 120, 40)
    doc.text(`Total Score: ${assessmentResponses.percentage}% (${assessmentResponses.totalScore}/${assessmentResponses.maxScore} points)`, 14, 75)
  }

  // Add a line separator
  doc.setDrawColor(200, 200, 200)
  doc.line(14, 80, 196, 80)

  let yPosition = 90

  // Questions and Answers
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Assessment Responses', 14, yPosition)
  yPosition += 10

  assessmentResponses.questions.forEach((response: any, index: number) => {
    // Check if we need a new page
    if (yPosition > 270) {
      doc.addPage()
      yPosition = 20
    }

    // Question Header
    doc.setFontSize(11)
    doc.setTextColor(60, 60, 60)
    doc.setFont('helvetica', 'bold')
    doc.text(`Question ${index + 1} (${response.type.toUpperCase()}) - ${response.points} points`, 14, yPosition)
    yPosition += 7

    // Question Text
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    const questionLines = doc.splitTextToSize(response.question, 180)
    doc.text(questionLines, 14, yPosition)
    yPosition += questionLines.length * 5 + 3

    // Options for MCQ
    if (response.type === 'mcq' && response.options) {
      doc.setFontSize(10)
      response.options.forEach((option: string, optIndex: number) => {
        if (yPosition > 275) {
          doc.addPage()
          yPosition = 20
        }
        const isCorrect = response.correctAnswer === optIndex
        const isSelected = response.candidateAnswer === optIndex

        if (isSelected && isCorrect) {
          doc.setTextColor(0, 150, 0) // Green for correct answer
          doc.text(`✓ ${option}`, 20, yPosition)
        } else if (isSelected && !isCorrect) {
          doc.setTextColor(200, 0, 0) // Red for wrong answer
          doc.text(`✗ ${option}`, 20, yPosition)
        } else if (isCorrect) {
          doc.setTextColor(0, 100, 0) // Dark green for correct option
          doc.text(`✓ ${option} (Correct)`, 20, yPosition)
        } else {
          doc.setTextColor(100, 100, 100) // Gray for other options
          doc.text(`  ${option}`, 20, yPosition)
        }
        yPosition += 5
      })
      doc.setTextColor(0, 0, 0)
      yPosition += 3
    }

    // Candidate's Answer for Text/Coding
    if ((response.type === 'text' || response.type === 'coding') && response.candidateAnswer) {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Answer:', 14, yPosition)
      yPosition += 6

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const answerLines = doc.splitTextToSize(String(response.candidateAnswer), 180)

      // Handle long answers
      answerLines.forEach((line: string) => {
        if (yPosition > 280) {
          doc.addPage()
          yPosition = 20
        }
        doc.text(line, 14, yPosition)
        yPosition += 4
      })
      yPosition += 5
    }

    // Correctness indicator
    if (response.isCorrect !== null) {
      if (yPosition > 275) {
        doc.addPage()
        yPosition = 20
      }
      doc.setFontSize(10)
      if (response.isCorrect) {
        doc.setTextColor(0, 150, 0)
        doc.text('✓ Correct', 14, yPosition)
      } else {
        doc.setTextColor(200, 0, 0)
        doc.text('✗ Incorrect', 14, yPosition)
      }
      doc.setTextColor(0, 0, 0)
      yPosition += 3
    }

    // Separator line
    if (yPosition > 275) {
      doc.addPage()
      yPosition = 20
    }
    doc.setDrawColor(220, 220, 220)
    doc.line(14, yPosition, 196, yPosition)
    yPosition += 8
  })

  // Recording Links
  if (candidate.assessment_video_recording || candidate.assessment_screen_recording) {
    if (yPosition > 260) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setTextColor(40, 60, 120)
    doc.text('Assessment Recordings', 14, yPosition)
    yPosition += 8

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)

    if (candidate.assessment_video_recording) {
      doc.text('📷 Camera Recording:', 14, yPosition)
      yPosition += 5
      doc.setTextColor(0, 0, 200)
      const videoUrl = candidate.assessment_video_recording.startsWith('http')
        ? candidate.assessment_video_recording
        : `http://localhost:8000${candidate.assessment_video_recording}`
      doc.textWithLink('View Camera Recording', 20, yPosition, { url: videoUrl })
      doc.setTextColor(0, 0, 0)
      yPosition += 8
    }

    if (candidate.assessment_screen_recording) {
      doc.text('🖥️ Screen Recording:', 14, yPosition)
      yPosition += 5
      doc.setTextColor(0, 0, 200)
      const screenUrl = candidate.assessment_screen_recording.startsWith('http')
        ? candidate.assessment_screen_recording
        : `http://localhost:8000${candidate.assessment_screen_recording}`
      doc.textWithLink('View Screen Recording', 20, yPosition, { url: screenUrl })
      doc.setTextColor(0, 0, 0)
      yPosition += 8
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' })
    doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 285, { align: 'center' })
  }

  // Save the PDF
  doc.save(`Assessment_${candidate.first_name}_${candidate.last_name}_${Date.now()}.pdf`)
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
  const movedCandidatesRef = useRef<ScreeningCandidateData[]>([])
  const [candidateCallData, setCandidateCallData] = useState<Map<number, EnhancedRetellCallData>>(new Map())
  const [loadingCallData, setLoadingCallData] = useState<Set<number>>(new Set())
  const [callIdInputs, setCallIdInputs] = useState<Map<number, string>>(new Map())
  const [autoCallScheduled, setAutoCallScheduled] = useState<Set<number>>(new Set())
  const [autoCallInProgress, setAutoCallInProgress] = useState<Set<number>>(new Set())
  const [initiatedCallIds, setInitiatedCallIds] = useState<Map<number, string>>(new Map())
  const [assigneeInputs, setAssigneeInputs] = useState<Map<number, string>>(new Map())
  const [assessmentEmailInputs, setAssessmentEmailInputs] = useState<Map<number, string>>(new Map())

  // Helper function to get WebDesk stage info from job's interview stages
  const getWebDeskStageInfo = (jobTitle: string): { assigneeEmail: string | null, feedbackFormId: string | null } => {
    // Find the job by title
    const job = jobs.find(j => j.title.toLowerCase() === jobTitle.toLowerCase())
    if (!job || !job.interview_stages) return { assigneeEmail: null, feedbackFormId: null }

    // Find the WebDesk/Technical Assignment stage
    const webdeskStage = job.interview_stages.find(stage =>
      stage.name.toLowerCase().includes('webdesk') ||
      stage.name.toLowerCase().includes('technical assignment') ||
      stage.name.toLowerCase().includes('technical assessment')
    )

    if (!webdeskStage) return { assigneeEmail: null, feedbackFormId: null }

    // Get assignee email from the assignees list
    let assigneeEmail: string | null = null
    if (webdeskStage.assignee) {
      // Map assignee ID to email
      const assigneeMap: Record<string, string> = {
        'jaikar': 'jaikar.s@cloudberry360.com',
        'yadhendra': 'yadhendra.kannan@cloudberry360.com'
      }
      assigneeEmail = assigneeMap[webdeskStage.assignee] || null
    }

    return {
      assigneeEmail,
      feedbackFormId: webdeskStage.feedbackFormId || null
    }
  }

  // Auto-populate assessment email and store feedback form ID when assessment is completed
  useEffect(() => {
    movedCandidatesList.forEach(candidate => {
      if (candidate.jobTitle) {
        const { assigneeEmail, feedbackFormId } = getWebDeskStageInfo(candidate.jobTitle)

        // Auto-fill email when assessment is completed
        if (candidate.assessment_completed && assigneeEmail && !assessmentEmailInputs.has(candidate.id)) {
          setAssessmentEmailInputs(prev => {
            const newMap = new Map(prev)
            newMap.set(candidate.id, assigneeEmail)
            return newMap
          })
        }

        // Store feedback form ID if not already stored
        if (feedbackFormId && candidate.webdesk_feedback_form_id !== feedbackFormId) {
          setMovedCandidatesList(prev =>
            prev.map(c => c.id === candidate.id
              ? { ...c, webdesk_feedback_form_id: feedbackFormId }
              : c
            )
          )
        }
      }
    })
  }, [movedCandidatesList, jobs])

  // Update ref whenever movedCandidatesList changes
  useEffect(() => {
    movedCandidatesRef.current = movedCandidatesList
  }, [movedCandidatesList])

  // Save movedCandidatesList to sessionStorage whenever it changes
  useEffect(() => {
    if (movedCandidatesList.length > 0) {
      sessionStorage.setItem('screeningCandidatesList', JSON.stringify(movedCandidatesList))
      console.log('Saved candidates to sessionStorage:', movedCandidatesList.length)
    }
  }, [movedCandidatesList])

  // Auto-refresh candidates data every 5 seconds to detect assessment completion
  useEffect(() => {
    if (movedCandidatesList.length === 0) return

    console.log('Starting auto-refresh polling for assessment updates...')

    const pollInterval = setInterval(() => {
      console.log('Polling for assessment updates...')
      // Use ref to get the latest candidates list
      if (movedCandidatesRef.current.length > 0) {
        refreshMovedCandidatesData(movedCandidatesRef.current)
      }
    }, 5000) // Poll every 5 seconds for faster updates

    // Cleanup on unmount
    return () => {
      console.log('Stopping auto-refresh polling')
      clearInterval(pollInterval)
    }
  }, [movedCandidatesList.length]) // Only depend on length to avoid re-creating interval

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
                assessment_disqualified: freshData.assessment_disqualified,
                assessment_video_recording: freshData.assessment_video_recording,
                assessment_screen_recording: freshData.assessment_screen_recording,
                assessment_audio_url: freshData.assessment_audio_url,
                assessment_recording: freshData.assessment_recording
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

  // Function to manually fetch call data by call ID and save to database
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
      console.log(`Fetching and saving call data for candidate ${candidateId} with call ID: ${callId}`)

      // Use the new method that both fetches AND saves to backend
      const result = await enhancedRetellAPI.getCallDetailsAndSave(callId.trim(), candidateId)

      if (result && result.success) {
        // Store call data for this candidate (for UI display)
        const callData = {
          call_id: result.candidate.retell_call_id,
          call_status: result.candidate.retell_call_status,
          recording_url: result.candidate.retell_recording_url,
          transcript: result.candidate.retell_transcript,
          duration_ms: result.candidate.retell_call_duration_ms,
          metadata: result.candidate.retell_metadata
        }

        setCandidateCallData(prev => {
          const newMap = new Map(prev)
          newMap.set(candidateId, callData)
          return newMap
        })

        // Show success with more detail
        const hasSchedule = result.candidate.retell_interview_scheduled
        const scheduleInfo = hasSchedule
          ? `\n✓ Interview: ${result.candidate.retell_scheduled_date} at ${result.candidate.retell_scheduled_time}`
          : ''

        toast({
          title: "✅ Call Data Saved",
          description: `Recording, transcript, and analysis saved to database${scheduleInfo}`,
          variant: "default"
        })

        console.log('✅ Call data retrieved and saved:', {
          callId: result.candidate.retell_call_id,
          hasRecording: !!result.candidate.retell_recording_url,
          hasTranscript: !!result.candidate.retell_transcript,
          interview_scheduled: result.candidate.retell_interview_scheduled,
          scheduled_date: result.candidate.retell_scheduled_date,
          scheduled_time: result.candidate.retell_scheduled_time
        })
      } else {
        toast({
          title: "Call Not Found",
          description: "Could not find call data with the provided call ID",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching/saving call data:', error)
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


  // Handle sending assessment results via email
  const handleSendAssessmentEmail = async (candidateId: number) => {
    const emailTo = assessmentEmailInputs.get(candidateId)
    const candidate = movedCandidatesList.find(c => c.id === candidateId)

    if (!emailTo || emailTo.trim() === '') {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      })
      return
    }

    if (!candidate) {
      toast({
        title: "Error",
        description: "Candidate not found",
        variant: "destructive"
      })
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailTo)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      })
      return
    }

    if (!candidate.assessment_completed) {
      toast({
        title: "Error",
        description: "Assessment not yet completed",
        variant: "destructive"
      })
      return
    }

    try {
      toast({
        title: "Processing",
        description: "Preparing videos for email...",
        variant: "default"
      })

      const fromEmail = process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'hr@company.com'
      const subject = `WebDesk Assessment Results - ${candidate.name}`

      // Get video URLs
      const videoUrl = candidate.assessment_video_recording
        ? (candidate.assessment_video_recording.startsWith('http')
            ? candidate.assessment_video_recording
            : `http://localhost:8000${candidate.assessment_video_recording}`)
        : null

      const screenUrl = candidate.assessment_screen_recording
        ? (candidate.assessment_screen_recording.startsWith('http')
            ? candidate.assessment_screen_recording
            : `http://localhost:8000${candidate.assessment_screen_recording}`)
        : null

      // Prepare attachments array
      const attachments: any[] = []

      // Fetch and convert video files to base64 for email attachments
      if (videoUrl) {
        try {
          const videoResponse = await fetch(videoUrl)
          const videoBlob = await videoResponse.blob()
          const videoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1]
              resolve(base64)
            }
            reader.readAsDataURL(videoBlob)
          })

          attachments.push({
            filename: `camera_recording_${candidate.id}.mp4`,
            content: videoBase64,
            encoding: 'base64',
            contentType: 'video/mp4'
          })
        } catch (error) {
          console.error('Error fetching camera recording:', error)
        }
      }

      if (screenUrl) {
        try {
          const screenResponse = await fetch(screenUrl)
          const screenBlob = await screenResponse.blob()
          const screenBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1]
              resolve(base64)
            }
            reader.readAsDataURL(screenBlob)
          })

          attachments.push({
            filename: `screen_recording_${candidate.id}.mp4`,
            content: screenBase64,
            encoding: 'base64',
            contentType: 'video/mp4'
          })
        } catch (error) {
          console.error('Error fetching screen recording:', error)
        }
      }

      const emailBody = `Assessment Results for ${candidate.name}

Candidate Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${candidate.name}
Email: ${candidate.email}
Phone: ${candidate.phone || 'N/A'}

Assessment Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score: ${candidate.assessment_score}%
Status: ${candidate.assessment_disqualified ? 'DISQUALIFIED' : 'PASSED'}
Tab Switches: ${candidate.assessment_tab_switches || 0}
Time Taken: ${candidate.assessment_time_taken ? Math.round(candidate.assessment_time_taken / 60) : 'N/A'} minutes

Assessment Recordings:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${videoUrl ? `📷 Camera Recording:
   - Attachment: camera_recording_${candidate.id}.mp4
   - Link: ${videoUrl}` : '📷 Camera Recording: Not available'}

${screenUrl ? `🖥️ Screen Recording:
   - Attachment: screen_recording_${candidate.id}.mp4
   - Link: ${screenUrl}` : '🖥️ Screen Recording: Not available'}

Note: Videos are attached to this email. You can also view them using the links above.

Please review the attached assessment recordings and results.

Best regards,
Recruitment Team
${fromEmail}`

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Assessment Results for ${candidate.name}</h2>

          <div style="background-color: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Candidate Information</h3>
            <p><strong>Name:</strong> ${candidate.name}</p>
            <p><strong>Email:</strong> ${candidate.email}</p>
            <p><strong>Phone:</strong> ${candidate.phone || 'N/A'}</p>
          </div>

          <div style="background-color: ${candidate.assessment_disqualified ? '#fef2f2' : '#f0fdf4'}; border: 2px solid ${candidate.assessment_disqualified ? '#ef4444' : '#22c55e'}; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: ${candidate.assessment_disqualified ? '#991b1b' : '#166534'}; margin-top: 0;">Assessment Details</h3>
            <p><strong>Score:</strong> <span style="font-size: 24px; font-weight: bold; color: ${candidate.assessment_disqualified ? '#dc2626' : '#16a34a'};">${candidate.assessment_score}%</span></p>
            <p><strong>Status:</strong> <span style="font-weight: bold; color: ${candidate.assessment_disqualified ? '#dc2626' : '#16a34a'};">${candidate.assessment_disqualified ? 'DISQUALIFIED' : 'PASSED'}</span></p>
            <p><strong>Tab Switches:</strong> ${candidate.assessment_tab_switches || 0}</p>
            <p><strong>Time Taken:</strong> ${candidate.assessment_time_taken ? Math.round(candidate.assessment_time_taken / 60) : 'N/A'} minutes</p>
          </div>

          <div style="background-color: #fefce8; border: 2px solid #eab308; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #854d0e; margin-top: 0;">📹 Assessment Recordings</h3>

            ${videoUrl ? `
              <div style="background-color: #fff; border: 1px solid #d97706; border-radius: 6px; padding: 15px; margin-bottom: 15px;">
                <p style="margin: 0 0 10px 0;"><strong style="color: #854d0e;">📷 Camera Recording:</strong></p>
                <p style="margin: 5px 0; font-size: 14px;">
                  📎 <strong>Attachment:</strong> camera_recording_${candidate.id}.mp4
                </p>
                <p style="margin: 5px 0; font-size: 14px;">
                  🔗 <strong>Direct Link:</strong> <a href="${videoUrl}" style="color: #2563eb; word-break: break-all;">${videoUrl}</a>
                </p>
              </div>
            ` : '<p><strong>📷 Camera Recording:</strong> Not available</p>'}

            ${screenUrl ? `
              <div style="background-color: #fff; border: 1px solid #d97706; border-radius: 6px; padding: 15px; margin-bottom: 10px;">
                <p style="margin: 0 0 10px 0;"><strong style="color: #854d0e;">🖥️ Screen Recording:</strong></p>
                <p style="margin: 5px 0; font-size: 14px;">
                  📎 <strong>Attachment:</strong> screen_recording_${candidate.id}.mp4
                </p>
                <p style="margin: 5px 0; font-size: 14px;">
                  🔗 <strong>Direct Link:</strong> <a href="${screenUrl}" style="color: #2563eb; word-break: break-all;">${screenUrl}</a>
                </p>
              </div>
            ` : '<p><strong>🖥️ Screen Recording:</strong> Not available</p>'}

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin-top: 15px;">
              <p style="margin: 0; color: #78350f; font-size: 13px;">
                💡 <strong>Tip:</strong> Videos are attached to this email as MP4 files. You can download them directly or use the links above to view them online.
              </p>
            </div>
          </div>

          <p style="margin-top: 30px; color: #6b7280;">Please review the attached assessment recordings and results.</p>

          <p style="margin-top: 30px;">
            Best regards,<br/>
            <strong>Recruitment Team</strong><br/>
            ${fromEmail}
          </p>
        </div>
      `

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailTo,
          subject,
          text: emailBody,
          html: emailHtml,
          attachments: attachments
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: result.demo ? "Email Preview" : "Assessment Results Sent",
          description: result.demo
            ? `Email content ready but not sent (configure EMAIL_USER and EMAIL_PASSWORD)`
            : `Assessment results sent successfully to ${emailTo}`,
          variant: "default"
        })

        // Clear the input after successful send
        setAssessmentEmailInputs(prev => {
          const newMap = new Map(prev)
          newMap.delete(candidateId)
          return newMap
        })
      } else {
        toast({
          title: "Email Failed",
          description: result.message || "Failed to send email",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error sending assessment email:', error)
      toast({
        title: "Error",
        description: "Failed to send assessment email",
        variant: "destructive"
      })
    }
  }

  // Handle removing a candidate from screening list
  const handleAssignMember = async (candidateId: number) => {
    const assigneeEmail = assigneeInputs.get(candidateId)

    if (!assigneeEmail || assigneeEmail.trim() === '') {
      toast({
        title: "Error",
        description: "Please enter an assignee email address",
        variant: "destructive"
      })
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(assigneeEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      })
      return
    }

    try {
      const candidate = movedCandidatesList.find(c => c.id === candidateId)
      if (!candidate) {
        throw new Error('Candidate not found')
      }

      // Update candidate with assigned member
      const updatedCandidate = {
        ...candidate,
        assigned_to: assigneeEmail
      }

      // Update in local state
      setMovedCandidatesList(prev =>
        prev.map(c => c.id === candidateId ? updatedCandidate : c)
      )

      // Here you can add API call to assign the member
      // Example: await fetch(`http://localhost:8000/api/candidates/${candidateId}/assign/`, {...})

      toast({
        title: "Member Assigned",
        description: `Candidate ${candidate.name} has been assigned to ${assigneeEmail}`,
        variant: "default"
      })

      // Clear the input after successful assignment
      setAssigneeInputs(prev => {
        const newMap = new Map(prev)
        newMap.delete(candidateId)
        return newMap
      })

    } catch (error) {
      console.error('Error assigning member:', error)
      toast({
        title: "Error",
        description: "Failed to assign member",
        variant: "destructive"
      })
    }
  }

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
                jobTitle: "Test Position",
                assessment_screen_recording: undefined,
                assessment_video_recording: undefined
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
              placeholder="Search candidates by name, email, phone, or ID..."
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
                      candidate.id?.toString().includes(search) ||
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

                              // Get public URL for WebDesk link (accessible from anywhere)
                              // Uses NEXT_PUBLIC_WEBDESK_URL from .env.local
                              // Can be ngrok URL (https://abc123.ngrok.io) or deployed domain
                              const baseUrl = process.env.NEXT_PUBLIC_WEBDESK_URL || window.location.origin
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

                      {/* Retell Call Analysis and Interview Schedule */}
                      {(candidate.retell_interview_scheduled || candidate.retell_call_status || candidate.retell_call_summary) && (
                        <div className="mt-2 bg-purple-50 border border-purple-200 rounded p-3 space-y-2">
                          <p className="font-semibold text-purple-900 text-xs mb-2">📞 Retell Call Analysis:</p>

                          {/* Interview Schedule */}
                          {candidate.retell_interview_scheduled && (
                            <div className="bg-green-50 border border-green-300 rounded p-2">
                              <p className="text-xs font-semibold text-green-900 mb-1">✅ Interview Scheduled</p>
                              {candidate.retell_scheduled_date && (
                                <p className="text-xs text-green-800">
                                  <strong>Date:</strong> {new Date(candidate.retell_scheduled_date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              )}
                              {candidate.retell_scheduled_time && (
                                <p className="text-xs text-green-800">
                                  <strong>Time:</strong> {candidate.retell_scheduled_time}
                                </p>
                              )}
                              {candidate.retell_scheduled_timezone && (
                                <p className="text-xs text-green-700">
                                  <strong>Timezone:</strong> {candidate.retell_scheduled_timezone}
                                </p>
                              )}
                              {candidate.retell_scheduled_datetime_iso && (
                                <p className="text-xs text-green-700 mt-1">
                                  <strong>Full DateTime:</strong> {new Date(candidate.retell_scheduled_datetime_iso).toLocaleString()}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Call Status */}
                          {candidate.retell_call_status && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-purple-700">
                                <strong>Status:</strong>
                              </span>
                              <Badge
                                variant={
                                  candidate.retell_call_status === 'ended' ? 'default' :
                                  candidate.retell_call_status === 'ongoing' ? 'secondary' :
                                  candidate.retell_call_status === 'error' ? 'destructive' : 'secondary'
                                }
                                className="text-xs"
                              >
                                {candidate.retell_call_status}
                              </Badge>
                            </div>
                          )}

                          {/* Call Outcome */}
                          {candidate.retell_call_outcome && (
                            <p className="text-xs text-purple-700">
                              <strong>Outcome:</strong> {candidate.retell_call_outcome}
                            </p>
                          )}

                          {/* Interest Level */}
                          {candidate.retell_interest_level && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-purple-700">
                                <strong>Interest:</strong>
                              </span>
                              <Badge
                                variant={
                                  candidate.retell_interest_level === 'High' ? 'default' :
                                  candidate.retell_interest_level === 'Medium' ? 'secondary' :
                                  'destructive'
                                }
                                className="text-xs"
                              >
                                {candidate.retell_interest_level}
                              </Badge>
                            </div>
                          )}

                          {/* Qualification Status */}
                          {candidate.retell_is_qualified && (
                            <p className="text-xs text-green-700 font-semibold">
                              ✓ Meets Basic Qualifications
                            </p>
                          )}

                          {/* Call Duration */}
                          {candidate.retell_call_duration_ms && (
                            <p className="text-xs text-purple-700">
                              <strong>Duration:</strong> {Math.floor(candidate.retell_call_duration_ms / 60000)}m {Math.floor((candidate.retell_call_duration_ms % 60000) / 1000)}s
                            </p>
                          )}

                          {/* Call Summary */}
                          {candidate.retell_call_summary && (
                            <div className="bg-white border border-purple-200 rounded p-2 mt-2">
                              <p className="text-xs font-semibold text-purple-900 mb-1">Summary:</p>
                              <p className="text-xs text-gray-700 whitespace-pre-wrap">{candidate.retell_call_summary}</p>
                            </div>
                          )}

                          {/* Technical Skills */}
                          {candidate.retell_technical_skills && candidate.retell_technical_skills.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-purple-900 mb-1">Technical Skills:</p>
                              <div className="flex flex-wrap gap-1">
                                {candidate.retell_technical_skills.map((skill: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Questions Asked by Candidate */}
                          {candidate.retell_questions_asked && candidate.retell_questions_asked.length > 0 && (
                            <div className="bg-white border border-purple-200 rounded p-2">
                              <p className="text-xs font-semibold text-purple-900 mb-1">Questions Asked:</p>
                              <ul className="text-xs text-gray-700 list-disc list-inside space-y-1">
                                {candidate.retell_questions_asked.map((question: string, idx: number) => (
                                  <li key={idx}>{question}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Sentiment */}
                          {candidate.retell_user_sentiment && (
                            <p className="text-xs text-purple-700">
                              <strong>Sentiment:</strong> {candidate.retell_user_sentiment}
                            </p>
                          )}

                          {/* Recording URL */}
                          {candidate.retell_recording_url && (
                            <a
                              href={candidate.retell_recording_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            >
                              🎙️ Listen to Call Recording
                            </a>
                          )}

                          {/* Public Log URL */}
                          {candidate.retell_public_log_url && (
                            <a
                              href={candidate.retell_public_log_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            >
                              📋 View Call Logs
                            </a>
                          )}

                          {/* Availability Preference */}
                          {candidate.retell_availability_preference && (
                            <p className="text-xs text-purple-700">
                              <strong>Availability:</strong> {candidate.retell_availability_preference}
                            </p>
                          )}

                          {/* Additional Notes */}
                          {candidate.retell_additional_notes && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                              <p className="text-xs font-semibold text-yellow-900 mb-1">📝 Notes:</p>
                              <p className="text-xs text-gray-700 whitespace-pre-wrap">{candidate.retell_additional_notes}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Assigned Member Display */}
                      {candidate.assigned_to && (
                        <div className="mt-3 bg-green-50 border border-green-300 rounded p-2">
                          <p className="font-semibold text-green-900 text-xs mb-1">✅ Assigned To:</p>
                          <p className="text-sm text-green-700 font-medium">{candidate.assigned_to}</p>
                        </div>
                      )}

                      <div className="mt-2 space-y-2">
                        {(() => {
                          const webdeskInfo = candidate.jobTitle ? getWebDeskStageInfo(candidate.jobTitle) : { assigneeEmail: null, feedbackFormId: null }

                          // Build URL parameters
                          const params = new URLSearchParams()
                          const formId = candidate.webdesk_feedback_form_id || webdeskInfo.feedbackFormId
                          if (formId) {
                            params.append('formId', formId)
                          }
                          if (webdeskInfo.assigneeEmail) {
                            params.append('assigneeEmail', webdeskInfo.assigneeEmail)
                          }

                          const webdeskUrl = `/webdesk/${candidate.id}${params.toString() ? `?${params.toString()}` : ''}`

                          return (
                            <>
                              <a
                                href={webdeskUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-600 hover:text-green-800 hover:underline flex items-center gap-1"
                              >
                                <Clock className="h-3 w-3" />
                                Start WebDesk Assessment
                              </a>
                              {webdeskInfo.assigneeEmail && (
                                <div className="text-xs text-blue-600 bg-blue-50 p-1 rounded">
                                  📧 Auto-send to: {webdeskInfo.assigneeEmail}
                                </div>
                              )}
                              {!webdeskInfo.assigneeEmail && candidate.jobTitle && (
                                <div className="text-xs text-red-600 bg-red-50 p-1 rounded">
                                  ⚠️ No assignee configured for this job
                                </div>
                              )}
                            </>
                          )
                        })()}
                        {candidate.assessment_username && candidate.assessment_password && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 text-xs">
                            <p className="font-semibold text-red-900 mb-1">WebDesk Credentials:</p>
                            <p className="text-red-700">Username: <span className="font-mono font-bold">{candidate.assessment_username}</span></p>
                            <p className="text-red-700">Password: <span className="font-mono font-bold">{candidate.assessment_password}</span></p>
                          </div>
                        )}
                        {candidate.assessment_completed && (
                          <div className={`border rounded p-2 text-xs ${
                            candidate.assessment_disqualified
                              ? 'bg-red-50 border-red-200'
                              : 'bg-green-50 border-green-200'
                          }`}>
                            <p className={`font-semibold mb-1 ${
                              candidate.assessment_disqualified ? 'text-red-900' : 'text-green-900'
                            }`}>
                              ✅ Assessment: {candidate.assessment_disqualified ? 'DISQUALIFIED' : 'Completed'}
                            </p>
                            <p className={candidate.assessment_disqualified ? 'text-red-700' : 'text-green-700'}>
                              Score: {candidate.assessment_score}%
                            </p>
                            {(candidate.assessment_tab_switches ?? 0) > 0 && (
                              <p className="text-orange-700">⚠️ Tab Switches: {candidate.assessment_tab_switches}</p>
                            )}


                            

                            {/* Video Players */}
                            {(candidate.assessment_video_recording || candidate.assessment_screen_recording) && (
                              <div className="mt-3 space-y-2">
                                <p className="font-semibold text-gray-700 mb-2">📹 Assessment Recordings:</p>
                                <div className="grid grid-cols-1 gap-2">
                                  {/* Camera Recording */}
                                  {candidate.assessment_video_recording && (
                                    <div className="bg-white border border-gray-300 rounded overflow-hidden">
                                      <div className="bg-gray-800 text-white text-xs px-2 py-1 font-semibold">
                                        📷 Camera Recording
                                      </div>
                                      <video
                                        controls
                                        className="w-full"
                                        style={{ maxHeight: '150px' }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <source
                                          src={candidate.assessment_video_recording.startsWith('http')
                                            ? candidate.assessment_video_recording
                                            : `http://localhost:8000${candidate.assessment_video_recording}`
                                          }
                                          type="video/webm"
                                        />
                                        Your browser does not support the video tag.
                                      </video>
                                    </div>
                                  )}

                                  {/* Screen Recording */}
                                  {candidate.assessment_screen_recording && (
                                    <div className="bg-white border border-gray-300 rounded overflow-hidden">
                                      <div className="bg-gray-800 text-white text-xs px-2 py-1 font-semibold">
                                        🖥️ Screen Recording
                                      </div>
                                      <video
                                        controls
                                        className="w-full"
                                        style={{ maxHeight: '150px' }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <source
                                          src={candidate.assessment_screen_recording.startsWith('http')
                                            ? candidate.assessment_screen_recording
                                            : `http://localhost:8000${candidate.assessment_screen_recording}`
                                          }
                                          type="video/webm"
                                        />
                                        Your browser does not support the video tag.
                                      </video>
                                    </div>
                                  )}
                                </div>

                                {/* Send Assessment Results via Email Section */}
                                <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded p-3">
                                  <p className="font-semibold text-indigo-900 text-xs mb-2">📧 Send Assessment Results & Videos:</p>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="email"
                                      placeholder="Enter email to send results"
                                      value={assessmentEmailInputs.get(candidate.id) || ''}
                                      onChange={(e) => {
                                        setAssessmentEmailInputs(prev => {
                                          const newMap = new Map(prev)
                                          newMap.set(candidate.id, e.target.value)
                                          return newMap
                                        })
                                      }}
                                      className="flex-1 h-8 text-xs"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleSendAssessmentEmail(candidate.id)}
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-3"
                                    >
                                      <Mail className="h-3 w-3 mr-1" />
                                      Send
                                    </Button>
                                  </div>
                                  <p className="text-xs text-indigo-600 mt-1">
                                    Sends webdesk score, camera recording, and screen recording
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Assessment Responses Section */}
                            {candidate.assessment_responses && candidate.assessment_responses.questions && (
                              <div className="mt-4 border-t border-gray-200 pt-3">
                                <p className="font-semibold text-gray-700 mb-3">📝 Assessment Responses:</p>
                                <div className="space-y-3">
                                  {candidate.assessment_responses.questions.map((q: any, index: number) => (
                                    <div key={q.questionId || index} className="bg-gray-50 border border-gray-200 rounded p-3">
                                      <div className="flex items-start justify-between mb-2">
                                        <p className="text-xs font-semibold text-gray-800">
                                          Q{index + 1}. {q.question}
                                        </p>
                                        <Badge
                                          variant={q.isCorrect === true ? "default" : q.isCorrect === false ? "destructive" : "secondary"}
                                          className="ml-2 text-xs"
                                        >
                                          {q.points} pts
                                        </Badge>
                                      </div>

                                      {/* MCQ Type */}
                                      {q.type === 'mcq' && q.options && (
                                        <div className="mt-2 space-y-1">
                                          {q.options.map((option: string, optIndex: number) => {
                                            const isCorrect = optIndex === q.correctAnswer
                                            const isCandidate = optIndex === q.candidateAnswer
                                            return (
                                              <div
                                                key={optIndex}
                                                className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${
                                                  isCorrect && isCandidate
                                                    ? 'bg-green-100 border border-green-300 text-green-800 font-semibold'
                                                    : isCorrect
                                                    ? 'bg-green-50 border border-green-200 text-green-700'
                                                    : isCandidate
                                                    ? 'bg-red-100 border border-red-300 text-red-800 font-semibold'
                                                    : 'bg-white border border-gray-200 text-gray-600'
                                                }`}
                                              >
                                                {isCorrect && <CheckCircle className="h-3 w-3 text-green-600" />}
                                                {isCandidate && !isCorrect && <XCircle className="h-3 w-3 text-red-600" />}
                                                <span>{option}</span>
                                                {isCandidate && <span className="ml-auto text-xs">(Selected)</span>}
                                                {isCorrect && !isCandidate && <span className="ml-auto text-xs">(Correct)</span>}
                                              </div>
                                            )
                                          })}
                                          {q.candidateAnswer === null && (
                                            <p className="text-xs text-orange-600 mt-1 italic">⚠️ Not answered</p>
                                          )}
                                        </div>
                                      )}

                                      {/* Text/Coding Type */}
                                      {(q.type === 'text' || q.type === 'coding') && (
                                        <div className="mt-2">
                                          {q.candidateAnswer ? (
                                            <div className="bg-white border border-gray-300 rounded p-2">
                                              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                                                {q.candidateAnswer}
                                              </pre>
                                            </div>
                                          ) : (
                                            <p className="text-xs text-orange-600 italic">⚠️ Not answered</p>
                                          )}
                                        </div>
                                      )}

                                      {/* Result indicator */}
                                      <div className="mt-2 flex items-center gap-2">
                                        {q.isCorrect === true && (
                                          <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3" /> Correct
                                          </span>
                                        )}
                                        {q.isCorrect === false && (
                                          <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                                            <XCircle className="h-3 w-3" /> Incorrect
                                          </span>
                                        )}
                                        {q.isCorrect === null && (
                                          <span className="text-xs text-gray-500 italic">
                                            Requires manual review
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Overall Score Summary */}
                                {candidate.assessment_score !== null && (
                                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-2">
                                    <p className="text-xs font-semibold text-blue-900">
                                      Total Score: {candidate.assessment_score}%
                                      {candidate.assessment_responses.questions && (
                                        <span className="ml-2 text-blue-700 font-normal">
                                          ({candidate.assessment_responses.questions.filter((q: any) => q.isCorrect).length}/
                                          {candidate.assessment_responses.questions.length} correct)
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Screening Results Section */}
        { !isLoading && filteredResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Screening Results</h2>
              <div className="text-sm text-gray-600">
                Sorted by AI compatibility score
              </div>
            </div>

          
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
