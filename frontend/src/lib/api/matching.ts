// Job-Candidate Matching API functions

export interface JobCandidateMatch {
  candidate: any
  match_score: number
  match_percentage: string
}

export interface CandidateJobMatch {
  job: any
  match_score: number
  match_percentage: string
}

export interface JobMatchResponse {
  job: any
  matches: JobCandidateMatch[]
  total_candidates: number
  returned_matches: number
}

export interface CandidateMatchResponse {
  candidate: any
  matches: CandidateJobMatch[]
  total_jobs: number
  returned_matches: number
}

export interface TopMatchesForJobResponse {
  job: any
  top_matches: JobCandidateMatch[]
  limit: number
  total_candidates_evaluated: number
}

export interface TopMatchesForCandidateResponse {
  candidate: any
  top_matches: CandidateJobMatch[]
  limit: number
  total_jobs_evaluated: number
}

// API base URL
const API_BASE_URL = 'http://localhost:8000/api'

// Helper function for fetch with timeout and error handling
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('Failed to fetch'))) {
      throw new Error('Backend unavailable or request timeout')
    }
    throw error
  }
}

/**
 * Match a job with all candidates and return similarity scores
 */
export async function matchJobWithCandidates(jobId: number, limit?: number): Promise<JobMatchResponse> {
  try {
    const requestBody: any = { job_id: jobId }
    if (limit) {
      requestBody.limit = limit
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}/match/job-candidates/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error matching job with candidates:', error)
    throw error
  }
}

/**
 * Match a candidate with all jobs and return similarity scores
 */
export async function matchCandidateWithJobs(candidateId: number, limit?: number): Promise<CandidateMatchResponse> {
  try {
    const requestBody: any = { candidate_id: candidateId }
    if (limit) {
      requestBody.limit = limit
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}/match/candidate-jobs/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error matching candidate with jobs:', error)
    throw error
  }
}

/**
 * Get top N candidate matches for a specific job
 */
export async function getTopMatchesForJob(jobId: number, limit: number = 5): Promise<TopMatchesForJobResponse> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/match/job/${jobId}/top-candidates/?limit=${limit}`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting top matches for job:', error)
    throw error
  }
}

/**
 * Get top N job matches for a specific candidate
 */
export async function getTopMatchesForCandidate(candidateId: number, limit: number = 5): Promise<TopMatchesForCandidateResponse> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/match/candidate/${candidateId}/top-jobs/?limit=${limit}`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting top matches for candidate:', error)
    throw error
  }
}

/**
 * Get match score color class based on percentage
 */
export function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-100'
  if (score >= 60) return 'text-yellow-600 bg-yellow-100'
  if (score >= 40) return 'text-orange-600 bg-orange-100'
  return 'text-red-600 bg-red-100'
}

/**
 * Get match score description based on percentage
 */
export function getMatchScoreDescription(score: number): string {
  if (score >= 90) return 'Excellent Match'
  if (score >= 80) return 'Very Good Match'
  if (score >= 70) return 'Good Match'
  if (score >= 60) return 'Fair Match'
  if (score >= 50) return 'Moderate Match'
  if (score >= 40) return 'Low Match'
  return 'Poor Match'
}