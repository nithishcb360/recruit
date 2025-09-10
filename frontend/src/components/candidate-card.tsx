"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { 
  MapPin,
  Mail,
  Phone,
  Clock,
  Briefcase,
  Target,
  TrendingUp,
  Trash2,
  MoreVertical
} from "lucide-react"

interface Candidate {
  id: number
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

interface CandidateCardProps {
  candidate: Candidate
  onViewDetails: (candidateId: number) => void
  onAdvanceStage: (candidateId: number) => void
  onRejectCandidate: (candidateId: number) => void
  onDeleteCandidate: (candidateId: number) => void
  onScheduleInterview: (candidate: Candidate) => void
  onAddNote: (candidate: Candidate) => void
  onEditProfile: (candidate: Candidate) => void
  onViewResume: (candidate: Candidate) => void
  onEditCandidate: (candidate: Candidate) => void
  onMoveToScreening: (candidate: Candidate) => void
  onMoveToScreeningForJob: (candidate: Candidate, jobId: number) => void
  showJobMatch?: boolean
  jobs?: Array<{id: number, title: string}>
}


export default function CandidateCard({
  candidate,
  onViewDetails,
  onAdvanceStage,
  onRejectCandidate,
  onDeleteCandidate,
  onScheduleInterview,
  onAddNote,
  onEditProfile,
  onViewResume,
  onEditCandidate,
  onMoveToScreening,
  onMoveToScreeningForJob,
  showJobMatch = false,
  jobs = []
}: CandidateCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Function to format experience in years and months
  const formatExperience = (totalMonths: number) => {
    if (!totalMonths || totalMonths === 0) return "0 months"
    
    const years = Math.floor(totalMonths / 12)
    const months = totalMonths % 12
    
    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`
    } else if (months === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`
    } else {
      return `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`
    }
  }


  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card className="h-full hover:shadow-md transition-shadow duration-200 flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <Avatar className="w-12 h-12">
            {candidate.avatar && 
             typeof candidate.avatar === 'string' && 
             candidate.avatar.startsWith('http') && 
             !candidate.avatar.includes('placeholder') ? (
              <AvatarImage src={candidate.avatar} alt={candidate.name} />
            ) : null}
            <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
              {getInitials(candidate.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-xl text-gray-900 truncate">{candidate.name}</h3>
            {(candidate as any).current_position && (
              <p className="text-sm text-gray-600 truncate">{(candidate as any).current_position}</p>
            )}
          </div>
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 rounded-full transition-all duration-200 group"
                >
                  <MoreVertical className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 bg-white border border-gray-200 rounded-xl shadow-lg animate-in slide-in-from-top-2 duration-300"
                sideOffset={8}
              >
                <div className="p-2 space-y-1">
                  <DropdownMenuItem 
                    onClick={() => onDeleteCandidate(candidate.id)}
                    className="flex items-center px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg cursor-pointer transition-all duration-200 group"
                  >
                    <div className="w-8 h-8 bg-red-100 group-hover:bg-red-200 rounded-lg flex items-center justify-center mr-3 transition-colors duration-200">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <span>Delete Candidate</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        {/* Contact Information */}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-700">
            <Mail className="mr-2 h-4 w-4 text-gray-500" />
            <span className="truncate">{candidate.email || 'No email provided'}</span>
          </div>
          {candidate.phone && (
            <div className="flex items-center text-sm text-gray-700">
              <Phone className="mr-2 h-4 w-4 text-gray-500" />
              <span className="truncate">{candidate.phone}</span>
            </div>
          )}
          {candidate.location && (
            <div className="flex items-center text-sm text-gray-700">
              <MapPin className="mr-2 h-4 w-4 text-gray-500" />
              <span className="truncate">{candidate.location}</span>
            </div>
          )}
        </div>

        {/* Experience Information */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
          <div className="flex items-center mb-2">
            <Briefcase className="w-4 h-4 text-blue-600 mr-2" />
            <span className="font-medium text-blue-900">Experience</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-blue-800">Total:</span>
              <span className="text-sm font-medium text-blue-900">
                {formatExperience((candidate.experience_years || candidate.totalExperience || 0) * 12)}
              </span>
            </div>
            {(candidate as any).experience_level && (
              <div className="flex justify-between">
                <span className="text-sm text-blue-800">Level:</span>
                <span className="text-sm font-medium text-blue-900 capitalize">
                  {(candidate as any).experience_level}
                </span>
              </div>
            )}
            {(candidate as any).current_company && (
              <div className="text-sm text-blue-800">
                <span className="font-medium">Company:</span> {(candidate as any).current_company}
              </div>
            )}
          </div>
        </div>

        {/* Skills */}
        {(candidate as any).skills && (candidate as any).skills.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg">
            <div className="font-medium text-green-900 mb-2">Skills</div>
            <div className="flex flex-wrap gap-1">
              {(candidate as any).skills.slice(0, 4).map((skill: string, index: number) => (
                <span key={index} className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  {skill}
                </span>
              ))}
              {(candidate as any).skills.length > 4 && (
                <span className="text-green-700 text-xs font-medium px-2 py-1">
                  +{(candidate as any).skills.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Job Match Score - Only show when a specific job is selected */}
        {candidate.selectedJobMatch && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center mb-3">
              <Target className="w-4 h-4 text-purple-600 mr-2" />
              <span className="font-medium text-purple-900">Job Match Score</span>
              <TrendingUp className="w-4 h-4 text-purple-600 ml-auto" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-purple-800">Overall Match</span>
                <span className="text-2xl font-bold text-purple-600">
                  {candidate.selectedJobMatch.matchPercentage}%
                </span>
              </div>
              
              <Progress 
                value={candidate.selectedJobMatch.matchPercentage} 
                className="h-3 bg-purple-100"
              />
              
              <div className="text-xs text-purple-800 font-medium mb-2">
                📋 {candidate.selectedJobMatch.jobTitle}
              </div>
              
              {/* Detailed Match Breakdown */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white bg-opacity-60 p-2 rounded">
                  <div className="flex justify-between">
                    <span className="text-purple-700">Job Title:</span>
                    <span className="font-bold text-purple-800">
                      {candidate.selectedJobMatch.jobMatchDetails.jobTitleScore}%
                    </span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-60 p-2 rounded">
                  <div className="flex justify-between">
                    <span className="text-purple-700">Department:</span>
                    <span className="font-bold text-purple-800">
                      {candidate.selectedJobMatch.jobMatchDetails.departmentScore}%
                    </span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-60 p-2 rounded">
                  <div className="flex justify-between">
                    <span className="text-purple-700">Experience:</span>
                    <span className="font-bold text-purple-800">
                      {candidate.selectedJobMatch.jobMatchDetails.experienceScore}%
                    </span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-60 p-2 rounded">
                  <div className="flex justify-between">
                    <span className="text-purple-700">Location:</span>
                    <span className="font-bold text-purple-800">
                      {candidate.selectedJobMatch.jobMatchDetails.locationScore}%
                    </span>
                  </div>
                </div>
              </div>
              
              
              {/* Move to Screening Button */}
              <div className="mt-4 pt-3 border-t border-white border-opacity-30">
                <Button
                  onClick={() => onMoveToScreeningForJob(candidate, candidate.selectedJobMatch.jobId)}
                  className="w-full bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30 text-purple-800 hover:text-purple-900 border border-white border-opacity-30 hover:border-opacity-50 font-medium py-2 px-4 rounded-lg transition-all duration-200 text-sm"
                >
                  🎯 Move to Screening
                </Button>
              </div>
            </div>
          </div>
        )}

      </CardContent>

      <CardFooter className="pt-4">
        <Button
          onClick={() => onViewResume(candidate)}
          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200 hover:border-blue-300 font-medium py-2 px-4 rounded-lg transition-all duration-200 text-sm"
        >
          📄 View Resume
        </Button>
      </CardFooter>

    </Card>
  )
}