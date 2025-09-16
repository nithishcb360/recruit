"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
  Star,
  MapPin,
  Mail,
  Phone,
  Clock,
  Briefcase,
  GraduationCap,
  Calendar,
  DollarSign,
  Building,
  User
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
  // Additional candidate data
  first_name?: string
  last_name?: string
  skills?: string[]
  experience_years?: number
  experience_level?: string
  current_position?: string
}

interface CandidateDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  candidate: Candidate | null
}

const getStageColor = (stage: string) => {
  const colors = {
    'Applied': 'bg-blue-100 text-blue-800',
    'Screening': 'bg-yellow-100 text-yellow-800',
    'Interview': 'bg-purple-100 text-purple-800',
    'Offer': 'bg-green-100 text-green-800',
    'Hired': 'bg-emerald-100 text-emerald-800',
    'Rejected': 'bg-red-100 text-red-800',
    'Available': 'bg-gray-100 text-gray-800'
  }
  return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className={`h-4 w-4 ${
        i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
      }`}
    />
  ))
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function CandidateDetailsModal({ isOpen, onClose, candidate }: CandidateDetailsModalProps) {
  if (!candidate) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Candidate Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-start gap-6 p-6 bg-gray-50 rounded-lg">
            <Avatar className="w-20 h-20">
              {candidate.avatar && 
               typeof candidate.avatar === 'string' && 
               candidate.avatar.startsWith('http') && 
               !candidate.avatar.includes('placeholder') ? (
                <AvatarImage src={candidate.avatar} alt={candidate.name} />
              ) : null}
              <AvatarFallback className="text-lg font-semibold bg-blue-600 text-white">
                {getInitials(candidate.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{candidate.name}</h2>
              <div className="flex items-center gap-4 mb-4">
                <Badge className={getStageColor(candidate.stage)}>{candidate.stage}</Badge>
                <div className="flex items-center gap-1">
                  {renderStars(candidate.rating)}
                  <span className="ml-2 text-sm text-gray-600">({candidate.rating}/5)</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="text-gray-900">{candidate.email || 'No email provided'}</span>
                </div>
                {candidate.phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-600" />
                    <span className="text-gray-900">{candidate.phone}</span>
                  </div>
                )}
                {candidate.location && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-gray-600" />
                    <span className="text-gray-900">{candidate.location}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="text-gray-900">Last activity: {candidate.lastActivity}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Experience & Professional Information */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Briefcase className="w-5 h-5 mr-2" />
                Professional Experience
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Total Experience:</span>
                  <span className="font-medium text-gray-900">{candidate.totalExperience || candidate.experience_years || 0} years</span>
                </div>
                {candidate.experience_level && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Experience Level:</span>
                    <span className="font-medium capitalize text-gray-900">{candidate.experience_level}</span>
                  </div>
                )}
                {candidate.current_position && (
                  <div>
                    <span className="text-gray-700">Current Position:</span>
                    <p className="font-medium mt-1 text-gray-900">{candidate.current_position}</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Skills & Qualifications */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <GraduationCap className="w-5 h-5 mr-2" />
                Skills & Qualifications
              </h3>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Job Matching */}
          {candidate.bestJobMatch && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Job Matching Analysis
              </h3>
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Best Match: {candidate.bestJobMatch.jobTitle}</span>
                    <span className="text-2xl font-bold text-green-600">
                      {candidate.bestJobMatch.matchPercentage}%
                    </span>
                  </div>
                  <Progress value={candidate.bestJobMatch.matchPercentage} className="h-3" />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {candidate.bestJobMatch.jobMatchDetails.jobTitleScore}%
                      </div>
                      <div className="text-sm text-gray-600">Job Title</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {candidate.bestJobMatch.jobMatchDetails.departmentScore}%
                      </div>
                      <div className="text-sm text-gray-600">Department</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {candidate.bestJobMatch.jobMatchDetails.experienceScore}%
                      </div>
                      <div className="text-sm text-gray-600">Experience</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {candidate.bestJobMatch.jobMatchDetails.locationScore}%
                      </div>
                      <div className="text-sm text-gray-600">Location</div>
                    </div>
                  </div>
                </div>

                {/* Other Job Matches */}
                {candidate.allJobMatches && candidate.allJobMatches.length > 1 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Other Job Matches:</h4>
                    <div className="space-y-2">
                      {candidate.allJobMatches.slice(1, 4).map((match, index) => (
                        <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                          <span className="text-sm">{match.jobTitle}</span>
                          <span className="text-sm font-medium">{match.matchPercentage}%</span>
                        </div>
                      ))}
                      {candidate.allJobMatches.length > 4 && (
                        <div className="text-sm text-gray-600 text-center">
                          +{candidate.allJobMatches.length - 4} more matches
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interview History */}
          {candidate.interviewHistory && candidate.interviewHistory.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Interview History
              </h3>
              <div className="space-y-3">
                {candidate.interviewHistory.map((interview, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{interview.type}</div>
                      <div className="text-sm text-gray-600">{interview.date}</div>
                    </div>
                    <Badge 
                      className={
                        interview.outcome === 'passed' ? 'bg-green-100 text-green-800' :
                        interview.outcome === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {interview.outcome}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes & Feedback */}
          {(candidate.notes || candidate.feedbackSummary) && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Notes & Feedback
              </h3>
              {candidate.notes && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Notes:</h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded">{candidate.notes}</p>
                </div>
              )}
              {candidate.feedbackSummary && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Feedback Summary:</h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded">{candidate.feedbackSummary}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}