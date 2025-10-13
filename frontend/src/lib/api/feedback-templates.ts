// Feedback Templates API types and functions

export interface Question {
  id: number
  text: string
  type: "text" | "textarea" | "audio" | "video" | "multiple_choice" | "code"
  options?: string[]
  required: boolean
  answer?: string // Optional answer field for question-with-answer forms
  ai_generated?: boolean // Flag to indicate if question was AI-generated
  language?: string // For program type questions (e.g., "javascript", "python")
}

export type FormType = 'question_only' | 'question_with_answer' | 'ai_question_only' | 'ai_question_with_answer'

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
  form_type?: FormType // New field for form type
  ai_config?: {
    provider: string
    topic?: string
    num_questions?: number
    custom_prompt?: string
  }
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

// AI Question Generation Interface
export interface QuestionGenerationRequest {
  topic: string
  num_questions: number
  question_types?: Array<'text' | 'textarea' | 'audio' | 'video' | 'multiple_choice' | 'code'>
  include_answers?: boolean
}

// AI Question Generation function - calls server-side API
export async function generateAIQuestions(
  request: QuestionGenerationRequest,
  aiConfig?: { provider: string; apiKey: string; customPrompt?: string }
): Promise<Question[]> {
  try {
    // Check if we have a valid API key
    if (!aiConfig?.apiKey || aiConfig.apiKey === 'demo-key') {
      console.warn('No valid API key provided, using demo mode with predefined questions');
      return generateDemoQuestions(request);
    }

    // Call server-side API endpoint
    const response = await fetch(`${API_BASE_URL}/ai/generate-questions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: request.topic,
        num_questions: request.num_questions,
        question_types: request.question_types || ['text', 'textarea'],
        include_answers: request.include_answers || false,
        aiProvider: aiConfig.provider,
        aiApiKey: aiConfig.apiKey,
        systemPrompt: aiConfig.customPrompt
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Server error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.questions && Array.isArray(data.questions)) {
      return data.questions;
    }

    throw new Error('Invalid response format from server');

  } catch (error) {
    console.error('AI question generation failed:', error);

    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes('authentication_error')) {
      console.warn('Authentication failed, falling back to demo questions');
      return generateDemoQuestions(request);
    }

    // For other errors, also fallback to demo questions
    console.warn('AI generation failed, falling back to demo questions');
    return generateDemoQuestions(request);
  }
}

// Demo question generation function
function generateDemoQuestions(request: QuestionGenerationRequest): Question[] {
  const demoQuestionTemplates = {
    'Technical Interview': [
      'What programming languages are you most comfortable with and why?',
      'Describe a challenging technical problem you solved recently.',
      'How do you stay updated with new technologies?',
      'What is your experience with version control systems?',
      'How do you approach debugging a complex issue?'
    ],
    'Leadership Skills': [
      'Describe a time when you had to lead a team through a difficult situation.',
      'How do you handle conflicts within your team?',
      'What strategies do you use to motivate team members?',
      'How do you prioritize tasks when everything seems urgent?',
      'Describe your approach to giving feedback to team members.'
    ],
    'Communication': [
      'How do you ensure clear communication in a remote team?',
      'Describe a time when you had to explain a complex concept to a non-technical audience.',
      'How do you handle disagreements with colleagues?',
      'What methods do you use to keep stakeholders informed about project progress?',
      'How do you adapt your communication style for different audiences?'
    ],
    'default': [
      'What are your main strengths in this area?',
      'Describe a challenging situation you faced and how you handled it.',
      'How do you continue to develop your skills?',
      'What motivates you in your work?',
      'How do you handle feedback and criticism?'
    ]
  };

  // Find the most relevant template
  let template = demoQuestionTemplates.default;
  const topic = request.topic.toLowerCase();

  if (topic.includes('technical') || topic.includes('programming') || topic.includes('development')) {
    template = demoQuestionTemplates['Technical Interview'];
  } else if (topic.includes('leadership') || topic.includes('management') || topic.includes('lead')) {
    template = demoQuestionTemplates['Leadership Skills'];
  } else if (topic.includes('communication') || topic.includes('presentation') || topic.includes('speaking')) {
    template = demoQuestionTemplates['Communication'];
  }

  // Generate questions based on request
  const selectedQuestions = template.slice(0, request.num_questions);

  return selectedQuestions.map((questionText, index) => ({
    id: index + 1,
    text: questionText,
    type: request.question_types?.[index % request.question_types.length] || 'text',
    required: true,
    answer: request.include_answers ? `Sample answer for: ${questionText}` : undefined,
    ai_generated: true
  }));
}