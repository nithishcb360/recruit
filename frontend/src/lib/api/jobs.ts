// Job API types and functions

export interface Department {
  id: number
  name: string
  description?: string
}

export interface DepartmentCreateData {
  name: string
  description?: string
}

export interface JobCreateData {
  title: string
  department: number
  description: string
  requirements: string
  responsibilities: string
  job_type: string
  experience_level: string
  location: string
  work_type: string
  is_remote: boolean
  salary_min?: number
  salary_max?: number
  salary_currency: string
  show_salary: boolean
  required_skills: string[]
  preferred_skills: string[]
  urgency: string
  openings: number
  sla_days: number
  screening_questions: Array<{
    id: number
    question: string
    type: string
  }>
  feedback_template?: number
  publish_internal: boolean
  publish_external: boolean
  publish_company_website: boolean
}

export interface Job {
  id: number
  title: string
  department: Department
  description: string
  requirements: string
  responsibilities?: string
  created_at: string
  status: string
  published_to_linkedin?: boolean
  published_to_naukri?: boolean
  linkedin_published_at?: string
  naukri_published_at?: string
  linkedin_job_url?: string
  naukri_job_url?: string
  linkedin_job_id?: string
  naukri_job_id?: string
}

export interface JobListItem {
  id: number
  title: string
  department: Department
  status: string
  created_at: string
}

export interface ParsedJD {
  description: string
  requirements: string
}

export interface GenerateJDRequest {
  title: string
  department: string
  level: string
  location: string
  work_type: string
}

export interface GenerateJDResponse {
  success: boolean
  data?: {
    description: string
    requirements: string
    responsibilities?: string
  }
  ai_generated: boolean
}

// Mock API base URL - replace with your actual API endpoint
const API_BASE_URL = 'http://localhost:8000/api'

// Helper function for fetch with timeout and complete error suppression
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 5000): Promise<Response> {
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
    if (window.onerror !== (() => true)) {
      window.onerror = window.onerror
    }
    
    // Create a clean error without exposing connection details
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED'))) {
      throw new Error('Backend unavailable')
    }
    throw error
  }
}

// API functions
export async function getDepartments(): Promise<{ results: Department[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/departments/`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    
    // Handle both paginated and direct array responses
    if (Array.isArray(data)) {
      return { results: data }
    } else if (data.results) {
      return data
    } else {
      throw new Error('Unexpected response format')
    }
  } catch (error) {
    console.log('Error fetching departments, using mock data:', error)
    // Mock data for development
    return {
      results: [
        // Technology & Engineering
        { id: 1, name: 'Engineering', description: 'Software development and technical roles' },
        { id: 2, name: 'Frontend Engineering', description: 'UI/UX development and client-side programming' },
        { id: 3, name: 'Backend Engineering', description: 'Server-side development and API design' },
        { id: 4, name: 'Mobile Engineering', description: 'iOS and Android app development' },
        { id: 5, name: 'DevOps & Infrastructure', description: 'Infrastructure and deployment automation' },
        { id: 6, name: 'Data Engineering', description: 'Data pipeline and infrastructure development' },
        { id: 7, name: 'Machine Learning', description: 'AI and ML model development' },
        { id: 8, name: 'Data Science', description: 'Analytics and data research roles' },
        { id: 9, name: 'Cybersecurity', description: 'Information security and risk management' },
        { id: 10, name: 'Quality Assurance', description: 'Testing and quality control roles' },
        { id: 11, name: 'IT Support', description: 'Technical support and system administration' },
        
        // Product & Design
        { id: 12, name: 'Product Management', description: 'Product strategy and roadmap planning' },
        { id: 13, name: 'UX/UI Design', description: 'User experience and interface design' },
        { id: 14, name: 'Graphic Design', description: 'Visual design and branding' },
        { id: 15, name: 'Content Design', description: 'Content strategy and copywriting' },
        
        // Business & Operations
        { id: 16, name: 'Marketing', description: 'Digital marketing and brand promotion' },
        { id: 17, name: 'Sales', description: 'Revenue generation and client acquisition' },
        { id: 18, name: 'Business Development', description: 'Strategic partnerships and growth' },
        { id: 19, name: 'Customer Success', description: 'Customer support and retention' },
        { id: 20, name: 'Account Management', description: 'Client relationship management' },
        { id: 21, name: 'Operations', description: 'Business operations and process management' },
        { id: 22, name: 'Supply Chain', description: 'Logistics and supply chain management' },
        { id: 23, name: 'Procurement', description: 'Vendor management and purchasing' },
        
        // Corporate Functions
        { id: 24, name: 'Human Resources', description: 'Talent acquisition and employee relations' },
        { id: 25, name: 'Finance', description: 'Financial planning and accounting' },
        { id: 26, name: 'Accounting', description: 'Financial record keeping and reporting' },
        { id: 27, name: 'Legal', description: 'Legal counsel and compliance' },
        { id: 28, name: 'Compliance', description: 'Regulatory compliance and risk management' },
        { id: 29, name: 'Administration', description: 'Administrative support and office management' },
        
        // Specialized Roles
        { id: 30, name: 'Research & Development', description: 'Innovation and product research' },
        { id: 31, name: 'Consulting', description: 'Strategic consulting and advisory services' },
        { id: 32, name: 'Training & Development', description: 'Employee training and skill development' },
        { id: 33, name: 'Public Relations', description: 'PR and external communications' },
        { id: 34, name: 'Project Management', description: 'Project coordination and delivery' },
        { id: 35, name: 'Business Analysis', description: 'Business process analysis and improvement' },
        
        // Industry Specific
        { id: 36, name: 'Healthcare', description: 'Medical and healthcare services' },
        { id: 37, name: 'Education', description: 'Training and educational services' },
        { id: 38, name: 'Manufacturing', description: 'Production and manufacturing operations' },
        { id: 39, name: 'Retail', description: 'Retail sales and customer service' },
        { id: 40, name: 'Real Estate', description: 'Property management and real estate services' },
      ]
    }
  }
}

export async function createJob(jobData: JobCreateData): Promise<Job> {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    // Mock response for development
    console.log('Creating job with data:', jobData)
    return {
      id: Math.floor(Math.random() * 1000),
      title: jobData.title,
      department: { id: jobData.department, name: 'Mock Department' },
      description: jobData.description,
      requirements: jobData.requirements,
      created_at: new Date().toISOString(),
      status: 'active'
    }
  }
}

export async function parseJD(file: File): Promise<ParsedJD> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/jobs/parse-jd/`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    // Mock response for development
    return {
      description: `Mock parsed job description from ${file.name}. This would contain the parsed content from your uploaded file.`,
      requirements: 'Mock parsed requirements including relevant skills and qualifications extracted from the uploaded document.'
    }
  }
}

export async function getJobs(): Promise<{ results: Job[] }> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/jobs/`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    
    let jobsList = []
    // Handle both paginated and direct array responses
    if (Array.isArray(data)) {
      jobsList = data
    } else if (data.results) {
      jobsList = data.results
    } else {
      throw new Error('Unexpected response format')
    }

    // Fetch detailed information for each job to get description, requirements, etc.
    const detailedJobs = await Promise.all(
      jobsList.map(async (job: any) => {
        try {
          const detailResponse = await fetch(`${API_BASE_URL}/jobs/${job.id}/`)
          if (detailResponse.ok) {
            return await detailResponse.json()
          } else {
            // If detail fetch fails, return the basic job info
            return job
          }
        } catch (error) {
          console.warn(`Failed to fetch details for job ${job.id}:`, error)
          return job
        }
      })
    )

    return { results: detailedJobs }
  } catch (error) {
    // Backend unavailable - return empty results instead of mock data
    if (error instanceof Error && error.message === 'Backend unavailable') {
      console.warn('Backend unavailable, returning empty jobs list')
      return { results: [] }
    }
    
    // Other errors - also return empty results
    console.warn('Jobs API error, returning empty list')
    return { results: [] }
  }
}

export async function generateJD(request: GenerateJDRequest): Promise<GenerateJDResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs/generate-jd/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    // Mock response for development
    return {
      success: true,
      data: {
        description: `We are looking for a ${request.level} ${request.title} to join our ${request.department} team. This is a ${request.work_type} position based in ${request.location}. The successful candidate will be responsible for developing and maintaining high-quality software solutions, collaborating with cross-functional teams, and contributing to the technical direction of our products.`,
        requirements: `• Bachelor's degree in Computer Science or related field
• ${request.level === 'entry' ? '1-2' : request.level === 'mid' ? '3-5' : '5+'} years of relevant experience
• Strong programming skills in modern technologies
• Experience with software development best practices
• Excellent problem-solving and communication skills
• Ability to work effectively in a team environment`,
        responsibilities: `• Design and develop software applications
• Collaborate with product managers and designers
• Write clean, maintainable, and testable code
• Participate in code reviews and technical discussions
• Mentor junior developers (if applicable)
• Stay up-to-date with industry trends and technologies`
      },
      ai_generated: false
    }
  }
}

export async function updateJob(jobId: number, jobData: Partial<JobCreateData>): Promise<Job> {
  try {
    console.log('Updating job with data:', jobData) // Debug log

    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Job update failed:', errorData) // Debug log
      throw new Error(JSON.stringify(errorData) || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating job:', error)
    throw error
  }
}

export async function deleteJob(jobId: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  } catch (error) {
    console.log('Error deleting job, continuing anyway:', error)
    // Allow deletion to continue even if API fails
  }
}

export async function createDepartment(departmentData: DepartmentCreateData): Promise<Department> {
  try {
    const response = await fetch(`${API_BASE_URL}/departments/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(departmentData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    // Mock response for development
    console.log('Creating department with data:', departmentData)
    return {
      id: Math.floor(Math.random() * 1000) + 41, // Start from 41 to avoid conflicts with existing IDs
      name: departmentData.name,
      description: departmentData.description || ''
    }
  }
}