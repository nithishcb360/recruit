// Form Responses API for storing individual question responses
const API_BASE_URL = 'http://localhost:8000/api'

export interface FormResponse {
  id?: number
  form_id: number
  question_id: number
  response_text?: string
  response_file?: string // base64 or file path
  response_type: 'text' | 'textarea' | 'audio' | 'video'
  file_name?: string
  file_type?: string
  created_at?: string
  updated_at?: string
}

export interface FormResponseSubmission {
  form_id: number
  question_id: number
  response_text?: string
  response_file?: string
  response_type: 'text' | 'textarea' | 'audio' | 'video'
  file_name?: string
  file_type?: string
}

// Helper function for fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 3000): Promise<Response> {
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
      throw new Error('Backend unavailable')
    }
    throw error
  }
}

export async function saveFormResponse(responseData: FormResponseSubmission): Promise<FormResponse> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/form-responses/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responseData),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    // Fallback to localStorage if backend is not available
    console.warn('Backend unavailable for saving response, using localStorage')
    
    const mockResponse: FormResponse = {
      id: Date.now(),
      form_id: responseData.form_id,
      question_id: responseData.question_id,
      response_text: responseData.response_text,
      response_file: responseData.response_file,
      response_type: responseData.response_type,
      file_name: responseData.file_name,
      file_type: responseData.file_type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Store in localStorage as fallback
    const existingResponses = localStorage.getItem('individual-form-responses')
    const responses = existingResponses ? JSON.parse(existingResponses) : []
    
    // Update existing response or add new one
    const existingIndex = responses.findIndex((r: FormResponse) => 
      r.form_id === responseData.form_id && r.question_id === responseData.question_id
    )
    
    if (existingIndex !== -1) {
      responses[existingIndex] = mockResponse
    } else {
      responses.push(mockResponse)
    }
    
    localStorage.setItem('individual-form-responses', JSON.stringify(responses))
    return mockResponse
  }
}

export async function getFormResponses(formId: number): Promise<FormResponse[]> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/form-responses/?form_id=${formId}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data.results || data || []
  } catch (error) {
    // Fallback to localStorage if backend is not available
    console.warn('Backend unavailable for loading responses, using localStorage')
    
    const existingResponses = localStorage.getItem('individual-form-responses')
    const allResponses = existingResponses ? JSON.parse(existingResponses) : []
    
    return allResponses.filter((r: FormResponse) => r.form_id === formId)
  }
}

export async function deleteFormResponse(formId: number, questionId: number): Promise<void> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/form-responses/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ form_id: formId, question_id: questionId }),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  } catch (error) {
    // Fallback to localStorage if backend is not available
    console.warn('Backend unavailable for deleting response, using localStorage')
    
    const existingResponses = localStorage.getItem('individual-form-responses')
    const responses = existingResponses ? JSON.parse(existingResponses) : []
    
    const filteredResponses = responses.filter((r: FormResponse) => 
      !(r.form_id === formId && r.question_id === questionId)
    )
    
    localStorage.setItem('individual-form-responses', JSON.stringify(filteredResponses))
  }
}