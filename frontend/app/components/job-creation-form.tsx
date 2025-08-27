"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Send, Sparkles, RefreshCw, Loader2, Upload } from "lucide-react"
import { getDepartments, createJob, parseJD, generateJD, type Department, type JobCreateData, type GenerateJDRequest } from "@/lib/api/jobs"
import { useToast } from "@/hooks/use-toast"

interface JobCreationFormProps {
  onJobCreated?: () => void;
}

export default function JobCreationForm({ onJobCreated }: JobCreationFormProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("details")
  const [jobDetails, setJobDetails] = useState({
    title: "",
    department: "",
    level: "", // Experience Level
    location: "",
    workType: "", // Work Type
    minSalary: "",
    maxSalary: "",
    experienceRange: "", // Experience Range
  })
  const [jobDescription, setJobDescription] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // API Data
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch departments on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const departmentsResponse = await getDepartments()
        setDepartments(departmentsResponse.results)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "Error",
          description: "Failed to load form data. Please refresh the page.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setJobDetails((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: string, value: string) => {
    setJobDetails((prev) => ({ ...prev, [id]: value }))
  }

  const generateJobDescription = async () => {
    // Validate required fields
    if (!jobDetails.title) {
      toast({
        title: "Missing Information",
        description: "Please enter a job title before generating the description.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    
    try {
      // Get department name from ID
      const selectedDepartment = departments.find(d => d.id.toString() === jobDetails.department)
      const departmentName = selectedDepartment?.name || ''
      
      const generateRequest: GenerateJDRequest = {
        title: jobDetails.title,
        department: departmentName,
        level: jobDetails.level || 'mid',
        location: jobDetails.location || 'Remote',
        work_type: jobDetails.workType || 'remote'
      }

      const response = await generateJD(generateRequest)
      
      if (response.success && response.data) {
        // Update form fields with generated content
        setJobDescription(response.data.description)
        
        // Also set responsibilities in a separate field if you have one
        // For now, we'll include responsibilities in the main description
        if (response.data.responsibilities) {
          setJobDescription(prev => prev + '\n\n' + response.data.responsibilities)
        }
        
        toast({
          title: "Success!",
          description: response.ai_generated 
            ? "Job description generated successfully using AI." 
            : "Job description generated using templates.",
          variant: "default"
        })
      } else {
        throw new Error('Failed to generate job description')
      }
      
    } catch (error: any) {
      console.error('AI generation error:', error)
      
      let errorMessage = "Failed to generate job description. Please try again."
      
      // Handle specific error types
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error?.detail) {
        errorMessage = error.detail
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      // Check if it's an API key issue - fallback gracefully
      if (errorMessage.includes('API key') || errorMessage.includes('OpenAI')) {
        errorMessage = "AI service is temporarily unavailable. Template generation was used instead."
      }
      
      toast({
        title: "Generation Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleJDUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    const allowedTypes = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt, .pdf, .doc, or .docx file",
        variant: "destructive"
      })
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive"
      })
      return
    }

    try {
      setIsGenerating(true)
      
      // Use the API client to upload and parse the file
      const result = await parseJD(file)
      
      // Update the form fields with parsed content
      setJobDescription(result.description || '')
      
      toast({
        title: "Success",
        description: "Job description uploaded and parsed successfully",
        variant: "default"
      })
    } catch (error: any) {
      console.error('JD upload error:', error)
      toast({
        title: "Error",
        description: error.detail || error.message || "Failed to upload job description",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
      // Reset the input
      if (e.target) {
        e.target.value = ''
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!jobDetails.title || !jobDetails.department || !jobDescription) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Title, Department, Description).",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)
      
      const jobData: JobCreateData = {
        title: jobDetails.title,
        department: parseInt(jobDetails.department),
        description: jobDescription,
        requirements: "Requirements to be updated",
        responsibilities: "Responsibilities to be updated",
        job_type: "full_time",
        experience_level: jobDetails.level || "mid",
        location: jobDetails.location || "Remote",
        work_type: jobDetails.workType || "remote",
        is_remote: jobDetails.workType === "remote",
        salary_min: jobDetails.minSalary ? parseFloat(jobDetails.minSalary) : undefined,
        salary_max: jobDetails.maxSalary ? parseFloat(jobDetails.maxSalary) : undefined,
        salary_currency: "USD",
        show_salary: !!(jobDetails.minSalary || jobDetails.maxSalary),
        required_skills: [],
        preferred_skills: [],
        urgency: "medium",
        openings: 1,
        sla_days: 21,
        screening_questions: [],
        feedback_template: undefined,
        publish_internal: true,
        publish_external: false,
        publish_company_website: true,
      }

      const createdJob = await createJob(jobData)
      
      toast({
        title: "Success!",
        description: `Job "${createdJob.title}" has been created successfully.`,
        variant: "default"
      })

      // Reset form
      setJobDetails({
        title: "",
        department: "",
        level: "",
        location: "",
        workType: "",
        minSalary: "",
        maxSalary: "",
        experienceRange: "",
      })
      setJobDescription("")
      setActiveTab("details")
      
      // Notify parent component that a job was created
      if (onJobCreated) {
        onJobCreated();
      }
      
    } catch (error: any) {
      console.error('Error creating job:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create job. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Create New Job Posting</h2>
      <p className="text-gray-600">
        Define the details and description for your new job.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">1. Job Details</TabsTrigger>
          <TabsTrigger value="description">2. Job Description</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>Enter the basic information for your job posting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  value={jobDetails.title}
                  onChange={handleDetailChange}
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={jobDetails.department} onValueChange={(val) => handleSelectChange("department", val)}>
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoading ? (
                        <SelectItem value="loading" disabled>Loading departments...</SelectItem>
                      ) : (
                        departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Experience Level</Label>
                  <Select value={jobDetails.level} onValueChange={(val) => handleSelectChange("level", val)}>
                    <SelectTrigger id="level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="mid">Mid Level</SelectItem>
                      <SelectItem value="senior">Senior Level</SelectItem>
                      <SelectItem value="lead">Lead/Principal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={jobDetails.location}
                    onChange={handleDetailChange}
                    placeholder="e.g., Remote, New York, NY"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workType">Work Type</Label>
                  <Select value={jobDetails.workType} onValueChange={(val) => handleSelectChange("workType", val)}>
                    <SelectTrigger id="workType">
                      <SelectValue placeholder="Select work type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minSalary">Min Salary</Label>
                  <Input
                    id="minSalary"
                    type="number"
                    value={jobDetails.minSalary}
                    onChange={handleDetailChange}
                    placeholder="80000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxSalary">Max Salary</Label>
                  <Input
                    id="maxSalary"
                    type="number"
                    value={jobDetails.maxSalary}
                    onChange={handleDetailChange}
                    placeholder="120000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="experienceRange">Experience Range</Label>
                <Select
                  value={jobDetails.experienceRange}
                  onValueChange={(val) => handleSelectChange("experienceRange", val)}
                >
                  <SelectTrigger id="experienceRange">
                    <SelectValue placeholder="Select experience range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-1">0-1 Years</SelectItem>
                    <SelectItem value="1-3">1-3 Years</SelectItem>
                    <SelectItem value="3-5">3-5 Years</SelectItem>
                    <SelectItem value="5-8">5-8 Years</SelectItem>
                    <SelectItem value="8-10">8-10 Years</SelectItem>
                    <SelectItem value="10+">10+ Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setActiveTab("description")}>Next: Job Description</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="description" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span>Job Description</span>
              </CardTitle>
              <CardDescription>Create or generate a comprehensive job description.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4 mb-4">
                <label htmlFor="jd-upload" className="flex-1">
                  <Button variant="outline" className="w-full bg-transparent" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload JD
                    </span>
                  </Button>
                  <input
                    id="jd-upload"
                    type="file"
                    accept=".txt,.pdf,.doc,.docx"
                    onChange={handleJDUpload}
                    className="hidden"
                  />
                </label>
                <Button onClick={generateJobDescription} disabled={isGenerating} className="flex-1">
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Job Description</Label>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={12}
                  className="text-sm"
                  placeholder="Enter job description or generate with AI..."
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab("details")}>
                  Previous
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || isLoading}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Job...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Create Job
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}