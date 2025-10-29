// Note: Anthropic SDK is now only used server-side for security
// Client-side code makes API calls to backend endpoints

export interface JobGenerationPrompt {
  jobTitle: string;
  department: string;
  experienceLevel: string;
  experienceRange: string;
  workType?: string;
  location?: string;
}

export interface GeneratedJobContent {
  description: string;
  requirements: string;
}

export interface AIConfig {
  provider: string;
  apiKey: string;
  customPrompt?: string;
}

// Backend API base URL
const API_BASE_URL = 'http://localhost:8000/api'

// Server-side AI generation - calls backend API endpoints
async function callServerAIEndpoint(
  endpoint: string,
  data: any
): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Server error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    throw error;
  }
}

// Main function that calls server-side API
export async function generateJobDescriptionWithAI(
  prompt: JobGenerationPrompt,
  aiConfig?: AIConfig
): Promise<GeneratedJobContent> {
  try {
    if (!aiConfig || !aiConfig.apiKey) {
      throw new Error('AI configuration not found. Please configure AI provider and API key in Organization Settings.');
    }

    // Call server-side endpoint
    const response = await callServerAIEndpoint('ai/generate-job-description/', {
      jobTitle: prompt.jobTitle,
      department: prompt.department,
      experienceLevel: prompt.experienceLevel,
      experienceRange: prompt.experienceRange,
      workType: prompt.workType,
      location: prompt.location,
      aiProvider: aiConfig.provider,
      aiApiKey: aiConfig.apiKey,
      customPrompt: aiConfig.customPrompt
    });

    return {
      description: response.description || '',
      requirements: response.requirements || ''
    };

  } catch (error) {
    console.error('AI Generation Error:', error);
    throw new Error(`Failed to generate job description: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Deprecated: This function has been removed in favor of server-side API calls
// Use generateJobDescriptionWithAI instead
export async function generateJobDescriptionWithClaude(
  prompt: JobGenerationPrompt
): Promise<GeneratedJobContent> {
  throw new Error('This function is deprecated. Please use generateJobDescriptionWithAI with proper AI configuration from settings.');
}