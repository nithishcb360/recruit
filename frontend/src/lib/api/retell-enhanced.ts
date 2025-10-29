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

  /**
   * Fetch call details from Retell AND save to backend database
   * This is the recommended method to use as it persists the data
   * Only sends essential data to backend (not full transcript/recording)
   */
  async getCallDetailsAndSave(callId: string, candidateId: number): Promise<any> {
    try {
      // Step 1: Fetch full call data from Retell (with retry logic for analysis)
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

      const fullCallData = result.data

      console.log('📞 Fetched call data from Retell:', {
        call_id: fullCallData.call_id,
        has_analysis: !!fullCallData.call_analysis,
        has_custom_data: !!(fullCallData.call_analysis?.custom_analysis_data),
        full_call_analysis: fullCallData.call_analysis
      })

      // Step 2: Extract only essential data to save (not full transcript/recording)
      const essentialData = {
        call_id: fullCallData.call_id,
        call_status: fullCallData.call_status,
        call_type: fullCallData.call_type,
        recording_url: fullCallData.recording_url, // URL only, not content
        duration_ms: fullCallData.duration_ms,
        start_timestamp: fullCallData.start_timestamp,
        end_timestamp: fullCallData.end_timestamp,
        metadata: fullCallData.metadata,
        public_log_url: fullCallData.public_log_url,
        // Only send analysis data, not full transcript
        call_analysis: fullCallData.call_analysis ? {
          call_summary: fullCallData.call_analysis.call_summary,
          user_sentiment: fullCallData.call_analysis.user_sentiment,
          call_successful: fullCallData.call_analysis.call_successful,
          in_voicemail: fullCallData.call_analysis.in_voicemail,
          custom_analysis_data: fullCallData.call_analysis.custom_analysis_data
        } : null
      }

      console.log('💾 Sending essential data to backend (excluding transcript):', {
        call_id: essentialData.call_id,
        has_custom_data: !!essentialData.call_analysis?.custom_analysis_data,
        custom_analysis_data: essentialData.call_analysis?.custom_analysis_data,
        data_size: JSON.stringify(essentialData).length + ' bytes'
      })

      // Step 3: Save to backend database
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const saveResponse = await fetch(`${backendUrl}/api/candidates/${candidateId}/save_retell_call_data/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(essentialData)
      })

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json()
        console.error('Failed to save call data to backend:', errorData)
        throw new Error(errorData.error || 'Failed to save call data to backend')
      }

      const saveResult = await saveResponse.json()

      console.log('✅ Call data saved to backend:', {
        candidate_id: candidateId,
        interview_scheduled: saveResult.candidate?.retell_interview_scheduled,
        scheduled_date: saveResult.candidate?.retell_scheduled_date,
        scheduled_time: saveResult.candidate?.retell_scheduled_time
      })

      return saveResult
    } catch (error) {
      console.error('Error in getCallDetailsAndSave:', error)
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