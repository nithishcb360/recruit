interface Candidate {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  location: string
  resume_file?: string
  resume_text: string
  skills: string[]
  experience_years?: number
  experience_level: string
  education: string[]
  certifications: string[]
  current_company: string
  current_position: string
  salary_expectation?: number
  availability: string
  status: string
  source: string
  rating?: number
  created_at: string
  updated_at: string
}

interface CandidateListResponse {
  count: number
  next?: string
  previous?: string
  results: Candidate[]
}

interface CandidateFilters {
  status?: string
  experience_level?: string
  source?: string
  search?: string
  ordering?: string
  page?: number
}

const API_BASE_URL = 'http://localhost:8000/api'

export const fetchCandidates = async (filters: CandidateFilters = {}): Promise<CandidateListResponse> => {
  const searchParams = new URLSearchParams()
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })

  const url = `${API_BASE_URL}/candidates/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

export const createCandidate = async (candidateData: Partial<Candidate>): Promise<Candidate> => {
  const response = await fetch(`${API_BASE_URL}/candidates/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(candidateData),
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

export const updateCandidate = async (id: number, candidateData: Partial<Candidate>): Promise<Candidate> => {
  const response = await fetch(`${API_BASE_URL}/candidates/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(candidateData),
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

export const deleteCandidate = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/candidates/${id}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': '', // Empty CSRF token for exempted views
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Delete failed:', response.status, errorText)
    throw new Error(`Failed to delete candidate: ${response.status} - ${errorText}`)
  }
}

export const getCandidateStatistics = async () => {
  const response = await fetch(`${API_BASE_URL}/candidates/statistics/`)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

export type { Candidate, CandidateListResponse, CandidateFilters }