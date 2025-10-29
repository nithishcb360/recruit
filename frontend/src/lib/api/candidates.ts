// Candidates API types and functions

const API_BASE_URL = 'http://localhost:8000/api'

export interface CandidateDetails {
  full_name?: string
  email?: string
  phone?: string
  location?: string
}

export interface JobDetails {
  title?: string
  department?: string
}

export interface JobApplication {
  id: number
  candidate: number
  job: number
  stage: 'applied' | 'screening' | 'phone_screen' | 'technical' | 'onsite' | 'final' | 'offer' | 'hired' | 'rejected' | 'withdrawn'
  overall_rating?: number
  stage_updated_at: string
  candidate_details?: CandidateDetails
  job_details?: JobDetails
}

export interface ApplicationFilters {
  job?: number
  stage?: string
  rating?: number
}

export interface ApplicationsResponse {
  results: JobApplication[]
  count: number
}

// API functions
export async function getJobApplications(filters?: ApplicationFilters): Promise<ApplicationsResponse> {
  try {
    const params = new URLSearchParams()
    if (filters?.job) params.append('job', filters.job.toString())
    if (filters?.stage) params.append('stage', filters.stage)
    if (filters?.rating) params.append('rating', filters.rating.toString())

    const response = await fetch(`${API_BASE_URL}/applications/?${params.toString()}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    
    // Handle both paginated and direct array responses
    let results = []
    if (Array.isArray(data)) {
      results = data
    } else if (data.results) {
      results = data.results
    } else {
      throw new Error('Unexpected response format')
    }

    // If no data from backend, use mock data
    if (results.length === 0) {
      console.log('No data from backend, using mock data')
      const mockApplications: JobApplication[] = [
        {
          id: 1,
          candidate: 1,
          job: 1,
          stage: 'screening',
          overall_rating: 4,
          stage_updated_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          candidate_details: {
            full_name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            location: 'San Francisco, CA'
          },
          job_details: {
            title: 'Senior Software Engineer',
            department: 'Engineering'
          }
        },
        {
          id: 2,
          candidate: 2,
          job: 1,
          stage: 'technical',
          overall_rating: 5,
          stage_updated_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          candidate_details: {
            full_name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phone: '+1234567891',
            location: 'New York, NY'
          },
          job_details: {
            title: 'Senior Software Engineer',
            department: 'Engineering'
          }
        },
        {
          id: 3,
          candidate: 3,
          job: 2,
          stage: 'applied',
          overall_rating: 3,
          stage_updated_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
          candidate_details: {
            full_name: 'Mike Johnson',
            email: 'mike.johnson@example.com',
            phone: '+1234567892',
            location: 'Austin, TX'
          },
          job_details: {
            title: 'Product Manager',
            department: 'Product'
          }
        }
      ]
      
      // Filter mock data if filters are provided
      let filteredResults = mockApplications
      if (filters?.job) {
        filteredResults = filteredResults.filter(app => app.job === filters.job)
      }
      if (filters?.stage) {
        filteredResults = filteredResults.filter(app => app.stage === filters.stage)
      }
      
      return { results: filteredResults, count: filteredResults.length }
    }

    return { results, count: results.length }
  } catch (error) {
    // Mock data for development
    console.log('Error fetching applications, using mock data:', error)
    const mockApplications: JobApplication[] = [
      {
        id: 1,
        candidate: 1,
        job: 1,
        stage: 'screening',
        overall_rating: 4,
        stage_updated_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        candidate_details: {
          full_name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          location: 'San Francisco, CA'
        },
        job_details: {
          title: 'Senior Software Engineer',
          department: 'Engineering'
        }
      },
      {
        id: 2,
        candidate: 2,
        job: 1,
        stage: 'technical',
        overall_rating: 5,
        stage_updated_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        candidate_details: {
          full_name: 'Jane Smith',
          email: 'jane.smith@example.com',
          phone: '+1234567891',
          location: 'New York, NY'
        },
        job_details: {
          title: 'Senior Software Engineer',
          department: 'Engineering'
        }
      },
      {
        id: 3,
        candidate: 3,
        job: 2,
        stage: 'applied',
        overall_rating: 3,
        stage_updated_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        candidate_details: {
          full_name: 'Mike Johnson',
          email: 'mike.johnson@example.com',
          phone: '+1234567892',
          location: 'Austin, TX'
        },
        job_details: {
          title: 'Product Manager',
          department: 'Product'
        }
      }
    ]
    
    // Filter mock data if filters are provided
    let filteredResults = mockApplications
    if (filters?.job) {
      filteredResults = filteredResults.filter(app => app.job === filters.job)
    }
    if (filters?.stage) {
      filteredResults = filteredResults.filter(app => app.stage === filters.stage)
    }
    
    return { results: filteredResults, count: filteredResults.length }
  }
}

export async function advanceApplicationStage(applicationId: number): Promise<JobApplication> {
  try {
    const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/advance/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    // Mock response for development
    console.log('Advancing application stage for ID:', applicationId)
    throw error
  }
}

export async function rejectApplication(applicationId: number, reason?: string): Promise<JobApplication> {
  try {
    const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/reject/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    // Mock response for development
    console.log('Rejecting application ID:', applicationId, 'Reason:', reason)
    throw error
  }
}