"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Loader2, SortAsc, SortDesc, Search, X } from "lucide-react"
import CandidateCard from "./candidate-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import InterviewScheduler from "./interview-scheduler"
import BulkCandidateUpload from "./bulk-candidate-upload"
import CandidateNotes from "./candidate-notes"
import { UploadCloud } from "lucide-react"
import { getJobApplications, advanceApplicationStage, rejectApplication, type JobApplication, type ApplicationFilters } from "@/lib/api/candidates"
import { getJobs, type JobListItem } from "@/lib/api/jobs"
import { useToast } from "@/hooks/use-toast"

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
}

interface Job {
  id: number
  title: string
  department: string
}

interface CandidatePipelineProps {
  selectedJobId?: number | null
}

export default function CandidatePipeline({ selectedJobId = null }: CandidatePipelineProps) {
  const { toast } = useToast()
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

  // Load applications and jobs data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [applicationsResponse, jobsResponse] = await Promise.all([
          getJobApplications({ job: selectedJobId || undefined }),
          getJobs()
        ])
        
        setApplications(applicationsResponse.results)
        setJobs(jobsResponse.results)
        
        // Transform applications to candidate format for display
        const transformedCandidates = applicationsResponse.results.map(transformApplicationToCandidate)
        setCandidates(transformedCandidates)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "Error",
          description: "Failed to load candidate data. Please refresh the page.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedJobId, toast])

  // Transform JobApplication to Candidate format
  const transformApplicationToCandidate = (application: JobApplication): Candidate => {
    return {
      id: application.id,
      name: application.candidate_details?.full_name || `Candidate ${application.candidate}`,
      jobTitle: application.job_details?.title || 'Unknown Position',
      stage: mapStageToDisplayStage(application.stage),
      rating: application.overall_rating || 0,
      lastActivity: formatDate(application.stage_updated_at),
      avatar: "/placeholder.svg?height=32&width=32",
      email: application.candidate_details?.email || '',
      phone: '',
      location: '',
      totalExperience: 0,
      relevantExperience: 0,
      skillExperience: [],
      expectedSalary: '',
      noticePeriod: '',
      resumeLink: '#',
      linkedinProfile: '#',
      notes: '',
      interviewHistory: [],
      feedbackSummary: '',
      progress: getProgressFromStage(application.stage),
    }
  }

  // Map backend stage to frontend display stage
  const mapStageToDisplayStage = (stage: JobApplication['stage']): string => {
    const stageMap: Record<JobApplication['stage'], string> = {
      'applied': 'Applied',
      'screening': 'Screening',
      'phone_screen': 'Screening',
      'technical': 'Interview',
      'onsite': 'Interview',
      'final': 'Interview',
      'offer': 'Offer',
      'hired': 'Hired',
      'rejected': 'Rejected',
      'withdrawn': 'Rejected'
    }
    return stageMap[stage] || 'Applied'
  }

  // Get progress percentage based on stage
  const getProgressFromStage = (stage: JobApplication['stage']): number => {
    const progressMap: Record<JobApplication['stage'], number> = {
      'applied': 20,
      'screening': 30,
      'phone_screen': 40,
      'technical': 60,
      'onsite': 70,
      'final': 80,
      'offer': 90,
      'hired': 100,
      'rejected': 0,
      'withdrawn': 0
    }
    return progressMap[stage] || 20
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

  const stages = ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"]

  // Enhanced filtering and sorting
  const filteredAndSortedCandidates = candidates.filter((candidate) => {
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
    const matchesJob = filterJob && filterJob !== 'all'
      ? candidate.jobTitle === jobs.find((job) => String(job.id) === filterJob)?.title
      : true
    const matchesStage = filterStage && filterStage !== 'all' ? candidate.stage === filterStage : true
    const matchesRating = filterRating && filterRating !== 'all'
      ? (() => {
          const [min, max] = filterRating.split('-').map(Number)
          return candidate.rating >= min && candidate.rating <= max
        })()
      : true
    return matchesSearch && matchesJob && matchesStage && matchesRating
  }).sort((a, b) => {
    let aValue: any, bValue: any
    
    switch (sortBy) {
      case 'name':
        aValue = (a.name || '').toLowerCase()
        bValue = (b.name || '').toLowerCase()
        break
      case 'stage':
        const stageOrder = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']
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
    if (!candidate) return

    try {
      setIsActionLoading(candidateId)
      await advanceApplicationStage(candidateId)
      
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
    if (!candidate) return

    try {
      setIsActionLoading(candidateId)
      await rejectApplication(candidateId, 'Rejected by recruiter')
      
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

  const handleViewDetails = (candidateId: number) => {
    // In a real app, this would navigate to a detailed candidate profile page
    const candidate = candidates.find((c) => c.id === candidateId)
    toast({
      title: "View Details",
      description: `Opening profile for ${candidate?.name || 'candidate'}...`,
      variant: "default"
    })
  }

  const handleScheduleInterviewClick = (candidate: Candidate) => {
    setSelectedCandidateForSchedule(candidate)
    setIsSchedulerOpen(true)
  }

  const handleAddNoteClick = (candidate: Candidate) => {
    setSelectedCandidateForNotes(candidate)
    setIsNotesOpen(true)
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Candidate Pipeline</h1>
        <p className="text-muted-foreground">Manage and track candidates through your hiring process.</p>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </Button>
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
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="mr-2 h-4 w-4" /> 
              {showAdvancedFilters ? 'Hide' : 'More'} Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setFilterJob(selectedJobId ? String(selectedJobId) : null)
                setFilterStage(null)
                setFilterRating(null)
                setSortBy('lastActivity')
                setSortOrder('desc')
              }}
            >
              <X className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsBulkUploadOpen(true)}
            >
              <UploadCloud className="mr-2 h-4 w-4" /> Upload
            </Button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading candidates...</span>
          </div>
        ) : filteredAndSortedCandidates.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-8">
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
              onScheduleInterview={handleScheduleInterviewClick}
              onAddNote={handleAddNoteClick}
              onEditProfile={handleEditProfile}
            />
          ))
        )}
      </div>

      <Dialog open={isSchedulerOpen} onOpenChange={setIsSchedulerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
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
            <DialogTitle>Bulk Candidate Upload</DialogTitle>
          </DialogHeader>
          <BulkCandidateUpload onClose={() => setIsBulkUploadOpen(false)} />
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
    </div>
  )
}
