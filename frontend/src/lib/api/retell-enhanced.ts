export interface EnhancedRetellCallData {
  call_id: string
  call_status: string
  recording_url?: string
  transcript?: string
  duration_ms?: number
  metadata?: Record<string, any>
}

class EnhancedRetellAPI {
  private apiKey: string | null = null
  private baseUrl = 'https://api.retellai.com/v2'

  constructor() {
    // Try to get from environment variable first, then localStorage
    if (typeof window !== 'undefined') {
      this.apiKey = localStorage.getItem('retell_api_key')
    }

    // If not in localStorage, try to get from backend via environment
    if (!this.apiKey && typeof process !== 'undefined' && process.env) {
      this.apiKey = process.env.RETELL_API_KEY || null
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  setApiKey(key: string) {
    this.apiKey = key
    if (typeof window !== 'undefined') {
      localStorage.setItem('retell_api_key', key)
    }
  }

  // Method to use backend API key from environment
  private async getApiKey(): Promise<string | null> {
    // First check if we have it in memory or localStorage
    if (this.apiKey) return this.apiKey

    // Otherwise, use a backend endpoint to fetch call data
    // This prevents exposing API key in frontend
    return null
  }

  async getCallDetails(callId: string): Promise<EnhancedRetellCallData | null> {
    try {
      // Use backend API endpoint to fetch call data (keeps API key secure)
      const response = await fetch(`/api/retell-call/${callId}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to fetch call details:', errorData)
        throw new Error(errorData.message || `Failed to fetch call details: ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch call data')
      }

      return {
        call_id: result.data.call_id,
        call_status: result.data.call_status,
        recording_url: result.data.recording_url,
        transcript: result.data.transcript,
        duration_ms: result.data.duration_ms,
        metadata: result.data.metadata
      }
    } catch (error) {
      console.error('Error fetching call details:', error)
      throw error
    }
  }

  async getRecentCompletedCalls(limit: number = 50): Promise<EnhancedRetellCallData[]> {
    if (!this.apiKey) {
      throw new Error('Retell API key not configured')
    }

    try {
      const response = await fetch(`${this.baseUrl}/list-calls?limit=${limit}&filter_criteria.call_status=completed`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch recent calls: ${response.statusText}`)
      }

      const data = await response.json()
      return (data.calls || []).map((call: any) => ({
        call_id: call.call_id,
        call_status: call.call_status,
        recording_url: call.recording_url,
        transcript: call.transcript,
        duration_ms: call.duration_ms,
        metadata: call.metadata
      }))
    } catch (error) {
      console.error('Error fetching recent calls:', error)
      return []
    }
  }
}

export const enhancedRetellAPI = new EnhancedRetellAPI()