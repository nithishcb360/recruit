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
  console.log('Attempting to save response:', {
    formId: responseData.form_id,
    questionId: responseData.question_id,
    type: responseData.response_type,
    hasFile: !!responseData.response_file,
    fileSize: responseData.response_file?.length || 0
  })

  try {
    // Use longer timeout for file uploads
    const timeoutMs = responseData.response_file ? 15000 : 5000 // 15s for files, 5s for text
    const response = await fetchWithTimeout(`${API_BASE_URL}/form-responses/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responseData),
    }, timeoutMs)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('Response saved to backend successfully:', data.id)
    return data
  } catch (error) {
    // Fallback to localStorage if backend is not available
    console.warn('Backend unavailable for saving response, using localStorage. Error:', error instanceof Error ? error.message : 'Unknown error')
    
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
    try {
      const existingResponses = localStorage.getItem('individual-form-responses')
      let responses: FormResponse[] = []
      
      if (existingResponses) {
        const parsedResponses = JSON.parse(existingResponses)
        if (Array.isArray(parsedResponses)) {
          responses = parsedResponses
        } else {
          console.warn('Stored responses is not an array, starting fresh')
          responses = []
        }
      }
      
      // Update existing response or add new one
      const existingIndex = responses.findIndex((r: FormResponse) => 
        r.form_id === responseData.form_id && r.question_id === responseData.question_id
      )
      
      if (existingIndex !== -1) {
        responses[existingIndex] = mockResponse
        console.log(`Updated existing response at index ${existingIndex}`)
      } else {
        responses.push(mockResponse)
        console.log(`Added new response, total responses: ${responses.length}`)
      }
      
      localStorage.setItem('individual-form-responses', JSON.stringify(responses))
      console.log('Successfully saved response to localStorage')
      
    } catch (storageError) {
      console.error('Error handling localStorage save:', storageError)
      throw new Error('Failed to save response to storage')
    }
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
    
    try {
      const existingResponses = localStorage.getItem('individual-form-responses')
      if (!existingResponses) {
        console.log('No existing responses found in localStorage')
        return []
      }

      const parsedResponses = JSON.parse(existingResponses)
      console.log('Parsed responses from localStorage:', parsedResponses)

      // Validate that parsedResponses is an array
      if (!Array.isArray(parsedResponses)) {
        console.error('Stored responses is not an array:', typeof parsedResponses, parsedResponses)
        // Clear invalid data and return empty array
        localStorage.removeItem('individual-form-responses')
        return []
      }

      const filteredResponses = parsedResponses.filter((r: FormResponse) => r.form_id === formId)
      console.log(`Found ${filteredResponses.length} responses for form ${formId}`)
      return filteredResponses
      
    } catch (parseError) {
      console.error('Error parsing localStorage data:', parseError)
      // Clear corrupted data
      localStorage.removeItem('individual-form-responses')
      return []
    }
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
    
    try {
      const existingResponses = localStorage.getItem('individual-form-responses')
      let responses: FormResponse[] = []
      
      if (existingResponses) {
        const parsedResponses = JSON.parse(existingResponses)
        if (Array.isArray(parsedResponses)) {
          responses = parsedResponses
        } else {
          console.warn('Stored responses is not an array during delete')
          return // Nothing to delete
        }
      }
      
      const originalLength = responses.length
      const filteredResponses = responses.filter((r: FormResponse) => 
        !(r.form_id === formId && r.question_id === questionId)
      )
      
      console.log(`Deleted ${originalLength - filteredResponses.length} responses`)
      localStorage.setItem('individual-form-responses', JSON.stringify(filteredResponses))
      
    } catch (storageError) {
      console.error('Error handling localStorage delete:', storageError)
      throw new Error('Failed to delete response from storage')
    }
  }
}

// Utility function to clean up and validate localStorage data
export function cleanupFormResponsesStorage(): void {
  try {
    const existingResponses = localStorage.getItem('individual-form-responses')
    if (!existingResponses) {
      console.log('No form responses data to cleanup')
      return
    }

    const parsedResponses = JSON.parse(existingResponses)
    
    if (!Array.isArray(parsedResponses)) {
      console.warn('Form responses storage contains invalid data, clearing...')
      localStorage.removeItem('individual-form-responses')
      return
    }

    // Validate each response has required fields
    const validResponses = parsedResponses.filter((response: any) => {
      const isValid = response && 
        typeof response.form_id === 'number' && 
        typeof response.question_id === 'number' &&
        response.response_type &&
        (response.response_text || response.response_file)
      
      if (!isValid) {
        console.warn('Removing invalid response:', response)
      }
      
      return isValid
    })

    if (validResponses.length !== parsedResponses.length) {
      console.log(`Cleaned up ${parsedResponses.length - validResponses.length} invalid responses`)
      localStorage.setItem('individual-form-responses', JSON.stringify(validResponses))
    }

    console.log(`Form responses storage validated: ${validResponses.length} valid responses`)
    
  } catch (error) {
    console.error('Error during storage cleanup:', error)
    localStorage.removeItem('individual-form-responses')
  }
}