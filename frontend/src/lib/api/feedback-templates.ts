// Feedback Templates API types and functions

export interface FeedbackTemplate {
  id: number
  name: string
  description?: string
  status: 'draft' | 'published' | 'archived'
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
    return data
  } catch (error) {
    // Mock data for development
    return {
      results: [
        {
          id: 1,
          name: 'Technical Interview Feedback',
          description: 'Standard technical interview evaluation form',
          status: 'published',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          name: 'Behavioral Interview Feedback',
          description: 'Behavioral and cultural fit assessment form',
          status: 'published',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 3,
          name: 'Manager Interview Feedback',
          description: 'Leadership and management skills evaluation',
          status: 'published',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 4,
          name: 'Code Review Feedback',
          description: 'Technical code review and assessment form',
          status: 'draft',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
    }
  }
}