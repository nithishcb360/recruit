/**
 * Utility functions for handling screening candidate data transfer via sessionStorage
 * Updated: 2025-10-07
 */

export interface ScreeningCandidateData {
  assessment_time_taken: any
  assigned_to: any
  retell_interview_scheduled: any
  retell_call_status: any
  retell_call_summary: any
  retell_scheduled_date: any
  retell_scheduled_time: any
  retell_scheduled_timezone: any
  retell_scheduled_datetime_iso: any
  retell_call_outcome: any
  retell_interest_level: any
  retell_is_qualified: any
  retell_call_duration_ms: any
  retell_technical_skills: boolean
  retell_questions_asked: boolean
  retell_user_sentiment: any
  retell_recording_url: any
  retell_public_log_url: any
  retell_availability_preference: any
  retell_additional_notes: any
  assessment_responses: any
  id: number
  name: string
  email: string
  phone?: string
  location?: string
  experience_years?: number
  experience_level?: string
  current_company?: string
  current_position?: string
  skills?: string[]
  education?: any[]
  certifications?: any[]
  salary_expectation?: number
  jobId?: number
  jobTitle?: string
  assessment_url?: string
  assessment_username?: string
  assessment_password?: string
  assessment_completed?: boolean
  assessment_score?: number
  assessment_tab_switches?: number
  assessment_disqualified?: boolean
  assessment_recording_url?: string
  assessment_video_recording?: any
  assessment_screen_recording?: any
  webdesk_feedback_form_id?: string
  status?: string
}

/**
 * Store candidate data for screening page
 */
export function setScreeningCandidateData(data: ScreeningCandidateData): void {
  try {
    sessionStorage.setItem('screeningCandidateData', JSON.stringify(data))
  } catch (error) {
    console.error('Error storing screening candidate data:', error)
  }
}

/**
 * Retrieve candidate data from sessionStorage
 */
export function getScreeningCandidateData(): ScreeningCandidateData | null {
  try {
    const data = sessionStorage.getItem('screeningCandidateData')
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Error retrieving screening candidate data:', error)
    return null
  }
}

/**
 * Add candidate to screening list (supports multiple candidates)
 */
export function addToScreeningList(data: ScreeningCandidateData): void {
  try {
    const existingData = getScreeningCandidatesList()

    // Check if candidate is already in the list
    const isAlreadyAdded = existingData.some(candidate => candidate.id === data.id)

    if (!isAlreadyAdded) {
      const updatedList = [...existingData, data]
      sessionStorage.setItem('screeningCandidatesList', JSON.stringify(updatedList))
    }
  } catch (error) {
    console.error('Error adding candidate to screening list:', error)
  }
}

/**
 * Get all candidates in screening list
 */
export function getScreeningCandidatesList(): ScreeningCandidateData[] {
  try {
    const data = sessionStorage.getItem('screeningCandidatesList')
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error retrieving screening candidates list:', error)
    return []
  }
}

/**
 * Remove candidate from screening list
 */
export function removeFromScreeningList(candidateId: number): void {
  try {
    const existingData = getScreeningCandidatesList()
    const updatedList = existingData.filter(candidate => candidate.id !== candidateId)
    sessionStorage.setItem('screeningCandidatesList', JSON.stringify(updatedList))
  } catch (error) {
    console.error('Error removing candidate from screening list:', error)
  }
}

/**
 * Clear screening candidate data from sessionStorage
 */
export function clearScreeningCandidateData(): void {
  try {
    sessionStorage.removeItem('screeningCandidateData')
    sessionStorage.removeItem('screeningCandidatesList')
  } catch (error) {
    console.error('Error clearing screening candidate data:', error)
  }
}

/**
 * Check if screening candidate data exists
 */
export function hasScreeningCandidateData(): boolean {
  try {
    return sessionStorage.getItem('screeningCandidateData') !== null
  } catch (error) {
    console.error('Error checking screening candidate data:', error)
    return false
  }
}