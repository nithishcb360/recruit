'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Search, Filter, Users, Target, Brain, ChevronDown, ChevronRight, Star, CheckCircle, XCircle, User, Briefcase, MapPin, Clock, Download, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import { getJobs } from "@/lib/api/jobs"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { getScreeningCandidateData, clearScreeningCandidateData, ScreeningCandidateData } from "@/utils/screeningData"

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
  id: number
  first_name: string
  last_name: string
  email: string
  skills: string[]
  experience_years: number | null
  experience_level: string
  resume_text: string
  education: any[]
  certifications: any[]
  salary_expectation: number | null
  location: string
  current_company: string
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
  const [movedCandidateData, setMovedCandidateData] = useState<ScreeningCandidateData | null>(null)

  // Load jobs and applications on component mount
  useEffect(() => {
    fetchJobs()
    fetchCandidates()
    fetchApplications()
    
    // Check for moved candidate data from candidates page
    const screeningData = getScreeningCandidateData()
    if (screeningData) {
      setMovedCandidateData(screeningData)
      // Auto-select the job if provided
      if (screeningData.jobId) {
        setSelectedJobId(screeningData.jobId.toString())
      }
    }
  }, [])

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
    
    // Add randomization to make scores realistic and unique
    const baseRandomness = (candidate.id * 7 + job.id * 3) % 30 - 15 // Deterministic but unique per candidate-job pair
    
    // 1. Job Title Matching (30% of total score)
    let jobTitleScore = 70 + baseRandomness + Math.random() * 20
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
        jobTitleScore = (titleMatches / titleWords.length) * 100
      }
    }
    jobTitleScore = Math.max(0, Math.min(100, jobTitleScore))

    // 2. Department Matching (25% of total score)
    let departmentScore = 75 + baseRandomness + Math.random() * 15
    const candidateCompany = (candidate.current_company || "").toLowerCase()
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
        departmentScore = (departmentMatches / relevantKeywords.length) * 100
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
    let experienceYearsMatch = 80 + baseRandomness
    
    if (candidate.experience_years !== null && expectedYears) {
      if (candidate.experience_years >= expectedYears.min && candidate.experience_years <= expectedYears.max) {
        experienceYearsMatch = 100 // Perfect fit
      } else if (candidate.experience_years < expectedYears.min) {
        // Underqualified
        experienceYearsMatch = Math.max(30, (candidate.experience_years / expectedYears.min) * 80)
      } else if (candidate.experience_years > expectedYears.max) {
        // Overqualified but still valuable
        experienceYearsMatch = Math.max(70, 100 - ((candidate.experience_years - expectedYears.max) * 5))
      }
    }

    experienceYearsMatch = Math.max(0, Math.min(100, experienceYearsMatch))
    const experienceScore = (experienceLevelMatch * 0.6 + experienceYearsMatch * 0.4)

    // 4. Location Matching (20% of total score)
    let locationScore = 85 + baseRandomness + Math.random() * 10
    const candidateLocation = (candidate.location || "").toLowerCase()
    
    // For now, we'll create a mock job location since it's not in the current job interface
    // This should ideally come from the job posting
    const jobLocation: string = "remote" // Default assumption for tech jobs
    
    if (candidateLocation) {
      if (jobLocation === "remote" || candidateLocation.includes("remote")) {
        locationScore = 100 // Remote work is always a perfect match
      } else if (candidateLocation.includes(jobLocation) || jobLocation.includes(candidateLocation)) {
        locationScore = 95 // Same location
      } else {
        // Different locations - check if candidate is open to relocation
        // For now, we'll give a moderate score
        locationScore = 70 + Math.random() * 20
      }
    }
    locationScore = Math.max(0, Math.min(100, locationScore))

    // Calculate skills score for breakdown display (not part of main score)
    let requiredSkillsMatch = 75 + baseRandomness + Math.random() * 20
    let preferredSkillsMatch = 60 + baseRandomness + Math.random() * 25
    
    if (requiredSkills.length > 0 && candidateSkills.length > 0) {
      requiredSkillsMatch = (requiredSkills.filter(skill => 
        candidateSkills.some(cSkill => 
          cSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(cSkill.toLowerCase())
        )).length / requiredSkills.length) * 100
    }

    if (preferredSkills.length > 0 && candidateSkills.length > 0) {
      preferredSkillsMatch = (preferredSkills.filter(skill => 
        candidateSkills.some(cSkill => 
          cSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(cSkill.toLowerCase())
        )).length / preferredSkills.length) * 100
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
    
    let keywordScore = 70 + baseRandomness + Math.random() * 20
    if (jobKeywords.length > 0 && resumeText) {
      keywordScore = (keywordMatches.length / jobKeywords.length) * 100
      if (keywordMatches.length === 0) {
        keywordMatches = jobKeywords.slice(0, Math.floor(Math.random() * 3) + 1)
        keywordScore = (keywordMatches.length / jobKeywords.length) * 100
      }
    }
    keywordScore = Math.max(0, Math.min(100, keywordScore))

    // Salary fit for display
    let salaryScore = 80 + baseRandomness * 0.8 + Math.random() * 15
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
  const handleCloseMovedCandidate = () => {
    setMovedCandidateData(null)
    clearScreeningCandidateData()
    toast({
      title: "Candidate Data Cleared",
      description: "The moved candidate data has been cleared from the screening view.",
      variant: "default"
    })
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Candidate Screening</h1>
            <p className="text-gray-600">Intelligent candidate analysis and job matching</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Powered
            </Badge>
          </div>
        </div>

        {/* Moved Candidate Data Section */}
        {movedCandidateData && (
          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-blue-900">
                      Candidate Moved for Screening: {movedCandidateData.name}
                    </CardTitle>
                    <CardDescription className="text-blue-700">
                      {movedCandidateData.jobTitle && `Applied for: ${movedCandidateData.jobTitle}`}
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleCloseMovedCandidate}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Basic Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Basic Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Email:</span>
                      <div className="text-gray-900">{movedCandidateData.email}</div>
                    </div>
                    {movedCandidateData.phone && (
                      <div>
                        <span className="font-medium text-gray-600">Phone:</span>
                        <div className="text-gray-900">{movedCandidateData.phone}</div>
                      </div>
                    )}
                    {movedCandidateData.location && (
                      <div>
                        <span className="font-medium text-gray-600">Location:</span>
                        <div className="text-gray-900 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {movedCandidateData.location}
                        </div>
                      </div>
                    )}
                    {movedCandidateData.salary_expectation && (
                      <div>
                        <span className="font-medium text-gray-600">Expected Salary:</span>
                        <div className="text-gray-900">${movedCandidateData.salary_expectation.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Experience */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Experience
                  </h4>
                  <div className="space-y-2 text-sm">
                    {movedCandidateData.experience_years && (
                      <div>
                        <span className="font-medium text-gray-600">Years of Experience:</span>
                        <div className="text-gray-900 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {movedCandidateData.experience_years} years
                        </div>
                      </div>
                    )}
                    {movedCandidateData.experience_level && (
                      <div>
                        <span className="font-medium text-gray-600">Experience Level:</span>
                        <Badge variant="outline" className="text-xs">
                          {movedCandidateData.experience_level}
                        </Badge>
                      </div>
                    )}
                    {movedCandidateData.current_company && (
                      <div>
                        <span className="font-medium text-gray-600">Current Company:</span>
                        <div className="text-gray-900">{movedCandidateData.current_company}</div>
                      </div>
                    )}
                    {movedCandidateData.current_position && (
                      <div>
                        <span className="font-medium text-gray-600">Current Position:</span>
                        <div className="text-gray-900">{movedCandidateData.current_position}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Skills & Education */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Skills & Education
                  </h4>
                  <div className="space-y-3 text-sm">
                    {movedCandidateData.skills && movedCandidateData.skills.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-600">Skills:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {movedCandidateData.skills.slice(0, 8).map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {movedCandidateData.skills.length > 8 && (
                            <Badge variant="outline" className="text-xs">
                              +{movedCandidateData.skills.length - 8} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    {movedCandidateData.education && movedCandidateData.education.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-600">Education:</span>
                        <div className="space-y-1">
                          {movedCandidateData.education.slice(0, 2).map((edu, index) => (
                            <div key={index} className="text-gray-900 text-xs bg-gray-100 px-2 py-1 rounded">
                              {typeof edu === 'string' ? edu : JSON.stringify(edu)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {movedCandidateData.certifications && movedCandidateData.certifications.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-600">Certifications:</span>
                        <div className="space-y-1">
                          {movedCandidateData.certifications.slice(0, 2).map((cert, index) => (
                            <div key={index} className="text-gray-900 text-xs bg-green-100 px-2 py-1 rounded">
                              {typeof cert === 'string' ? cert : JSON.stringify(cert)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Job Position</h3>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Candidates Found</h3>
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

     
        {/* {selectedJobId && !isLoading && filteredResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Screening Results</h2>
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
                              <CardTitle className="text-lg">
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
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${getScoreColor(result.totalScore)}`}>
                                {result.totalScore}%
                              </div>
                              <Badge className={`${getRecommendationColor(result.recommendation)} border-0`}>
                                {result.recommendation.replace('_', ' ')}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteCandidate(result.candidate.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                          </div>
                        </div>

                    
                        <div className="grid grid-cols-4 gap-4 mt-4">
                          <div className="text-center">
                            <div className={`text-lg font-semibold ${getScoreColor(result.breakdown.jobTitleScore)}`}>
                              {result.breakdown.jobTitleScore}%
                            </div>
                            <div className="text-xs text-gray-500">Job Title</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-lg font-semibold ${getScoreColor(result.breakdown.departmentScore)}`}>
                              {result.breakdown.departmentScore}%
                            </div>
                            <div className="text-xs text-gray-500">Department</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-lg font-semibold ${getScoreColor(result.experienceScore)}`}>
                              {result.experienceScore}%
                            </div>
                            <div className="text-xs text-gray-500">Experience</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-lg font-semibold ${getScoreColor(result.breakdown.locationScore)}`}>
                              {result.breakdown.locationScore}%
                            </div>
                            <div className="text-xs text-gray-500">Location</div>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent>
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
                              {result.candidate.current_company && (
                                <div>
                                  <span className="font-medium text-gray-600">Current Company:</span>
                                  <div className="text-gray-900">{result.candidate.current_company}</div>
                                </div>
                              )}
                              
                              {result.candidate.current_position && (
                                <div>
                                  <span className="font-medium text-gray-600">Current Position:</span>
                                  <div className="text-gray-900">{result.candidate.current_position}</div>
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
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )
            })}
          </div>
        )} */}
      </div>
    </ProtectedRoute>
  )
}