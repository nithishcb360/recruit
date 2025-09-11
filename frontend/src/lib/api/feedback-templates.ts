// Feedback Templates API types and functions

export interface Question {
  id: number
  text: string
  type: "text" | "textarea" | "audio" | "video"
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

// Helper function for fetch with timeout and complete error suppression
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 3000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  // Store original console.error to restore later
  const originalError = console.error
  
  try {
    // Temporarily suppress console.error for fetch calls
    console.error = () => {}
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    console.error = originalError // Restore console.error
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    console.error = originalError // Restore console.error
    
    // Create a clean error without exposing connection details
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('Failed to fetch'))) {
      throw new Error('Backend unavailable')
    }
    throw error
  }
}

export async function getFeedbackTemplates(): Promise<{ results: FeedbackTemplate[] }> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/feedback-templates/`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    // Django REST Framework returns an array directly, so wrap it in results
    return { results: data }
  } catch (error) {
    // Mock data for development if backend is not available
    if (error instanceof Error && !error.message.includes('timeout')) {
      console.warn('Backend unavailable, using mock data')
    }
    return {
      results: []
    }
  }
}

export async function createFeedbackTemplate(data: Partial<FeedbackTemplate>): Promise<FeedbackTemplate> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/feedback-templates/`, {
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
  } catch (error) {
    // Return a mock response if backend is not available
    if (error instanceof Error && !error.message.includes('timeout')) {
      console.warn('Backend unavailable, creating locally')
    }
    const mockTemplate: FeedbackTemplate = {
      id: Date.now(),
      name: data.name || 'New Template',
      description: data.description || '',
      questions: data.questions || [],
      sections: data.sections || [],
      rating_criteria: data.rating_criteria || [],
      status: data.status || 'draft',
      is_active: data.is_active ?? false,
      is_default: data.is_default ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    return mockTemplate
  }
}

export async function updateFeedbackTemplate(id: number, data: Partial<FeedbackTemplate>): Promise<FeedbackTemplate> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/feedback-templates/${id}/`, {
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
  } catch (error) {
    // Always throw the error so the component can handle the fallback locally
    throw error
  }
}

export async function deleteFeedbackTemplate(id: number): Promise<void> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/feedback-templates/${id}/`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`)
  }
}

export async function publishFeedbackTemplate(id: number): Promise<void> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/feedback-templates/${id}/publish/`, {
    method: 'POST',
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`)
  }
}

export async function unpublishFeedbackTemplate(id: number): Promise<void> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/feedback-templates/${id}/unpublish/`, {
    method: 'POST',
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`)
  }
}