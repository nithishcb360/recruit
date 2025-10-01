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
    if (typeof window !== 'undefined') {
      this.apiKey = localStorage.getItem('retell_api_key')
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

  async getCallDetails(callId: string): Promise<EnhancedRetellCallData | null> {
    if (!this.apiKey) {
      throw new Error('Retell API key not configured')
    }

    try {
      const response = await fetch(`${this.baseUrl}/get-call/${callId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch call details: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        call_id: data.call_id,
        call_status: data.call_status,
        recording_url: data.recording_url,
        transcript: data.transcript,
        duration_ms: data.duration_ms,
        metadata: data.metadata
      }
    } catch (error) {
      console.error('Error fetching call details:', error)
      return null
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