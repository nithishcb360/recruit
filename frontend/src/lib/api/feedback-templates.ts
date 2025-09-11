// Feedback Templates API types and functions

export interface Question {
  id: number
  text: string
  type: "text" | "number" | "rating" | "yes/no" | "multiple-choice" | "textarea" | "image" | "video" | "date" | "datetime" | "radio" | "time"
  options?: string[]
  required: boolean
}

export interface FeedbackTemplate {
  id: number
  name: string
  description: string
  questions: Question[]
  sections: any[]
  rating_criteria: any[]
  status: 'draft' | 'published' | 'archived'
  is_active: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}

// Mock API base URL - replace with your actual API endpoint
const API_BASE_URL = 'http://localhost:8000/api'

export async function getFeedbackTemplates(): Promise<{ results: FeedbackTemplate[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/feedback-templates/`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    // Django REST Framework returns an array directly, so wrap it in results
    return { results: data }
  } catch (error) {
    // Mock data for development if backend is not available
    console.warn('Using mock data for feedback templates:', error)
    return {
      results: [
        {
          id: 1,
          name: 'Technical Interview Feedback',
          description: 'Standard technical interview evaluation form',
          questions: [
            { id: 1, text: 'Rate technical skills', type: 'rating', required: true },
            { id: 2, text: 'Problem solving approach', type: 'textarea', required: true }
          ],
          sections: [],
          rating_criteria: [],
          status: 'published',
          is_active: true,
          is_default: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          name: 'Behavioral Interview Feedback',
          description: 'Behavioral and cultural fit assessment form',
          questions: [
            { id: 1, text: 'Communication skills', type: 'rating', required: true },
            { id: 2, text: 'Team collaboration', type: 'yes/no', required: true }
          ],
          sections: [],
          rating_criteria: [],
          status: 'published',
          is_active: true,
          is_default: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
    }
  }
}

export async function createFeedbackTemplate(data: Partial<FeedbackTemplate>): Promise<FeedbackTemplate> {
  const response = await fetch(`${API_BASE_URL}/feedback-templates/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`)
  }
  return await response.json()
}

export async function updateFeedbackTemplate(id: number, data: Partial<FeedbackTemplate>): Promise<FeedbackTemplate> {
  const response = await fetch(`${API_BASE_URL}/feedback-templates/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`)
  }
  return await response.json()
}

export async function deleteFeedbackTemplate(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/feedback-templates/${id}/`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`)
  }
}

export async function publishFeedbackTemplate(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/feedback-templates/${id}/publish/`, {
    method: 'POST',
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`)
  }
}

export async function unpublishFeedbackTemplate(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/feedback-templates/${id}/unpublish/`, {
    method: 'POST',
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`)
  }
}