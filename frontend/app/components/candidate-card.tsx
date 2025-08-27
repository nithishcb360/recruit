"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Star,
  Calendar,
  DollarSign,
  FileText,
  MessageSquare,
  Video,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Edit,
  Trash,
  Link,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import CandidateProfileEdit from "./candidate-profile-edit"

// Updated Candidate interface to include new fields
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
  totalExperience: number // New: Total years of experience
  relevantExperience: number // New: Relevant years of experience
  skillExperience: { skill: string; years: number }[] // New: Experience per skill
  expectedSalary: string
  noticePeriod: string
  resumeLink: string
  linkedinProfile: string
  notes: string
  interviewHistory: { date: string; type: string; outcome: string }[]
  feedbackSummary: string
  progress: number // 0-100
}

interface CandidateCardProps {
  candidate: Candidate
  onViewDetails: (candidateId: number) => void
  onAdvanceStage: (candidateId: number) => void
  onRejectCandidate: (candidateId: number) => void
  onScheduleInterview?: (candidate: Candidate) => void
  onAddNote?: (candidate: Candidate) => void
  onEditProfile?: (candidate: Candidate) => void
}

export default function CandidateCard({
  candidate,
  onViewDetails,
  onAdvanceStage,
  onRejectCandidate,
  onScheduleInterview,
  onAddNote,
  onEditProfile,
}: CandidateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  // Safety check for candidate object
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "Applied":
        return "bg-blue-100 text-blue-700"
      case "Screening":
        return "bg-yellow-100 text-yellow-700"
      case "Interview":
        return "bg-purple-100 text-purple-700"
      case "Offer":
        return "bg-green-100 text-green-700"
      case "Hired":
        return "bg-emerald-100 text-emerald-700"
      case "Rejected":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={candidate.avatar || "/placeholder.svg"} />
              <AvatarFallback>
                {(candidate.name || 'Unknown')
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold">{candidate.name || 'Unknown'}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">{candidate.jobTitle || 'Unknown Position'}</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`${getStageColor(candidate.stage || 'Unknown')} text-xs`}>{candidate.stage || 'Unknown'}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails(candidate.id)}>
                  <FileText className="mr-2 h-4 w-4" /> View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAdvanceStage(candidate.id)}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Advance Stage
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRejectCandidate(candidate.id)} className="text-red-600">
                  <XCircle className="mr-2 h-4 w-4" /> Reject
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>{typeof candidate.rating === 'number' ? candidate.rating.toFixed(1) : '0.0'} Rating</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>Last Activity: {candidate.lastActivity || 'Unknown'}</span>
          </div>
        </div>

        <Progress value={typeof candidate.progress === 'number' ? candidate.progress : 0} className="w-full h-2" />
        <p className="text-sm text-muted-foreground text-right">{typeof candidate.progress === 'number' ? candidate.progress : 0}% Complete</p>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{candidate.email}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{candidate.phone}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{candidate.location}</span>
          </div>
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>{candidate.expectedSalary}</span>
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full text-blue-600 hover:text-blue-700"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              Show Less <ChevronUp className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Show More <ChevronDown className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        {isExpanded && (
          <div className="border-t pt-4 mt-4 space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-md">Experience & Skills</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>Total Experience: {typeof candidate.totalExperience === 'number' ? candidate.totalExperience : 0} years</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>Relevant Experience: {typeof candidate.relevantExperience === 'number' ? candidate.relevantExperience : 0} years</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Skill Breakdown:</p>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(candidate.skillExperience) && candidate.skillExperience.length > 0 ? (
                    candidate.skillExperience.map((skill, index) => {
                      if (!skill || typeof skill !== 'object') {
                        return null;
                      }
                      return (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill.skill || 'Unknown skill'} ({skill.years || 0} yrs)
                        </Badge>
                      );
                    }).filter(Boolean)
                  ) : (
                    <span className="text-sm text-muted-foreground">No skill data available</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-md">Additional Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center space-x-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span>Notice Period: {candidate.noticePeriod}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Link className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={candidate.resumeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Resume
                  </a>
                </div>
                <div className="flex items-center space-x-2">
                  <Link className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={candidate.linkedinProfile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    LinkedIn Profile
                  </a>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-md">Notes & Feedback</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{candidate.notes || 'No notes available'}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{candidate.feedbackSummary || 'No feedback summary available'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-md">Interview History</h3>
              {Array.isArray(candidate.interviewHistory) && candidate.interviewHistory.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {candidate.interviewHistory.map((interview, index) => {
                    if (!interview || typeof interview !== 'object') {
                      return null;
                    }
                    return (
                      <li key={index}>
                        {interview.date || 'Unknown date'}: {interview.type || 'Unknown type'} - Outcome: {interview.outcome || 'Unknown outcome'}
                      </li>
                    );
                  }).filter(Boolean)}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No interview history available.</p>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditOpen(true)}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onAddNote?.(candidate)}
              >
                <MessageSquare className="mr-2 h-4 w-4" /> Add Note
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onScheduleInterview?.(candidate)}
              >
                <Video className="mr-2 h-4 w-4" /> Schedule Interview
              </Button>
              <Button variant="destructive" size="sm">
                <Trash className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      
      <CandidateProfileEdit
        candidate={candidate}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={(updatedCandidate) => {
          onEditProfile?.(updatedCandidate)
          setIsEditOpen(false)
        }}
      />
    </Card>
  )
}
