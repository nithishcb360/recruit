import Anthropic from '@anthropic-ai/sdk';

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
}

// AI Provider interfaces
interface AIProvider {
  generateJobDescription(prompt: JobGenerationPrompt): Promise<GeneratedJobContent>;
}

class AnthropicProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Note: In production, this should be handled server-side
    });
  }

  async generateJobDescription(prompt: JobGenerationPrompt): Promise<GeneratedJobContent> {
    const { jobTitle, department, experienceLevel, experienceRange, workType, location } = prompt;

    const systemPrompt = `You are an expert HR professional and job description writer. Create professional, engaging, and comprehensive job descriptions that attract qualified candidates.

Your task is to generate:
1. A detailed job description (3-4 paragraphs)
2. Comprehensive requirements list (both required and preferred qualifications)

Make the content:
- Professional yet engaging
- Specific to the role and industry
- Include relevant technologies and skills for the position
- Follow modern job posting best practices
- Be inclusive and welcoming

Format the response as JSON with two fields: "description" and "requirements".
For the requirements field, format it as a clean, readable text with sections like:
Required Qualifications:
• Item 1
• Item 2

Technical Skills:
• Skill 1
• Skill 2

Preferred Qualifications:
• Item 1
• Item 2

Make sure the requirements field contains properly formatted text, not JSON structure.`;

    const userPrompt = `Generate a job description and requirements for the following position:

Job Title: ${jobTitle}
Department: ${department}
Experience Level: ${experienceLevel}
Experience Range: ${experienceRange}
${workType ? `Work Type: ${workType}` : ''}
${location ? `Location: ${location}` : ''}

Please create:
1. Job Description: A compelling 3-4 paragraph description that includes:
   - Brief company/role introduction
   - Key responsibilities and duties
   - What the candidate will achieve/impact
   - Work environment and culture fit

2. Requirements: A comprehensive requirements section that includes:
   - Required qualifications (education, experience, skills)
   - Preferred qualifications
   - Technical skills specific to this role
   - Soft skills and personal qualities

Make sure the content is tailored specifically to a ${jobTitle} role in ${department} at ${experienceLevel} level with ${experienceRange} years of experience.

For the requirements field, format it as clean text with clear sections and bullet points, for example:
Required Qualifications:
• Bachelor's degree in Computer Science or related field
• ${experienceRange} years of experience in relevant technologies

Technical Skills:
• Programming languages: JavaScript, Python, etc.
• Frameworks and tools: React, Node.js, etc.

Preferred Qualifications:
• Master's degree preferred
• Experience with cloud platforms

Please respond with valid JSON in this exact format:
{
  "description": "Your detailed job description here...",
  "requirements": "Your comprehensive requirements formatted as readable text with sections and bullet points..."
}`;

    const message = await this.client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    const response = message.content[0];

    if (response.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return this.parseAIResponse(response.text);
  }

  private parseAIResponse(responseText: string): GeneratedJobContent {
    if (!responseText) {
      throw new Error('No response from Claude');
    }

    try {
      const parsedResponse = JSON.parse(responseText);
      return {
        description: parsedResponse.description || '',
        requirements: parsedResponse.requirements || ''
      };
    } catch (parseError) {
      // If JSON parsing fails, try to extract content manually
      const descMatch = responseText.match(/"description":\s*"([^"]*(?:\\.[^"]*)*)"/);
      const reqMatch = responseText.match(/"requirements":\s*"([^"]*(?:\\.[^"]*)*)"/);

      if (descMatch && reqMatch) {
        return {
          description: descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
          requirements: reqMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
        };
      }

      // Fallback: try to extract from markdown-like format
      const lines = responseText.split('\n');
      let description = '';
      let requirements = '';
      let currentSection = '';

      for (const line of lines) {
        if (line.toLowerCase().includes('description') && line.includes(':')) {
          currentSection = 'description';
          continue;
        }
        if (line.toLowerCase().includes('requirements') && line.includes(':')) {
          currentSection = 'requirements';
          continue;
        }

        if (currentSection === 'description' && line.trim()) {
          description += line.trim() + '\n';
        } else if (currentSection === 'requirements' && line.trim()) {
          requirements += line.trim() + '\n';
        }
      }

      if (description || requirements) {
        return {
          description: description.trim() || 'Unable to generate description',
          requirements: requirements.trim() || 'Unable to generate requirements'
        };
      }

      // Final fallback: split the response
      const parts = responseText.split('\n\n');
      return {
        description: parts[0] || 'Unable to generate description',
        requirements: parts[1] || 'Unable to generate requirements'
      };
    }
  }
}

class OpenAIProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateJobDescription(prompt: JobGenerationPrompt): Promise<GeneratedJobContent> {
    const { jobTitle, department, experienceLevel, experienceRange, workType, location } = prompt;

    const systemPrompt = `You are an expert HR professional and job description writer. Create professional, engaging, and comprehensive job descriptions that attract qualified candidates. Respond with valid JSON containing "description" and "requirements" fields.`;

    const userPrompt = `Generate a job description and requirements for: ${jobTitle} in ${department}, ${experienceLevel} level, ${experienceRange} years experience${workType ? `, ${workType}` : ''}${location ? `, located in ${location}` : ''}.

Format as JSON: {"description": "...", "requirements": "..."}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    try {
      return JSON.parse(content);
    } catch {
      return {
        description: content,
        requirements: 'Please specify requirements based on the job description above.'
      };
    }
  }
}

class GoogleProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateJobDescription(prompt: JobGenerationPrompt): Promise<GeneratedJobContent> {
    // Placeholder for Google Gemini API implementation
    throw new Error('Google Gemini integration coming soon. Please use Anthropic (Claude) or OpenAI for now.');
  }
}

function createAIProvider(config: AIConfig): AIProvider {
  if (!config.apiKey) {
    throw new Error(`API key is required for ${config.provider}. Please configure it in Organization Settings.`);
  }

  switch (config.provider.toLowerCase()) {
    case 'anthropic':
      return new AnthropicProvider(config.apiKey);
    case 'openai':
      return new OpenAIProvider(config.apiKey);
    case 'google':
      return new GoogleProvider(config.apiKey);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}. Supported providers: anthropic, openai, google`);
  }
}

function getClaudeClient(): Anthropic {
  const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('Anthropic API key is not configured. Please set NEXT_PUBLIC_ANTHROPIC_API_KEY in your environment variables.');
  }

  return new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Note: In production, this should be handled server-side
  });
}

// Main function that uses organization settings
export async function generateJobDescriptionWithAI(
  prompt: JobGenerationPrompt,
  aiConfig?: AIConfig
): Promise<GeneratedJobContent> {
  try {
    // If AI config is provided, use it (from organization settings)
    if (aiConfig && aiConfig.provider && aiConfig.apiKey) {
      const provider = createAIProvider(aiConfig);
      return await provider.generateJobDescription(prompt);
    }

    // Fallback to environment variable (for backwards compatibility)
    const envApiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    if (envApiKey) {
      const provider = new AnthropicProvider(envApiKey);
      return await provider.generateJobDescription(prompt);
    }

    // No configuration found
    throw new Error('AI configuration not found. Please configure AI provider and API key in Organization Settings.');

  } catch (error) {
    console.error('AI Generation Error:', error);
    throw new Error(`Failed to generate job description: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Legacy function for backwards compatibility (will be removed in future)
export async function generateJobDescriptionWithClaude(
  prompt: JobGenerationPrompt
): Promise<GeneratedJobContent> {
  const { jobTitle, department, experienceLevel, experienceRange, workType, location } = prompt;

  const systemPrompt = `You are an expert HR professional and job description writer. Create professional, engaging, and comprehensive job descriptions that attract qualified candidates.

Your task is to generate:
1. A detailed job description (3-4 paragraphs)
2. Comprehensive requirements list (both required and preferred qualifications)

Make the content:
- Professional yet engaging
- Specific to the role and industry
- Include relevant technologies and skills for the position
- Follow modern job posting best practices
- Be inclusive and welcoming

Format the response as JSON with two fields: "description" and "requirements".
For the requirements field, format it as a clean, readable text with sections like:
Required Qualifications:
• Item 1
• Item 2

Technical Skills:
• Skill 1
• Skill 2

Preferred Qualifications:
• Item 1
• Item 2

Make sure the requirements field contains properly formatted text, not JSON structure.`;

  const userPrompt = `Generate a job description and requirements for the following position:

Job Title: ${jobTitle}
Department: ${department}
Experience Level: ${experienceLevel}
Experience Range: ${experienceRange}
${workType ? `Work Type: ${workType}` : ''}
${location ? `Location: ${location}` : ''}

Please create:
1. Job Description: A compelling 3-4 paragraph description that includes:
   - Brief company/role introduction
   - Key responsibilities and duties
   - What the candidate will achieve/impact
   - Work environment and culture fit

2. Requirements: A comprehensive requirements section that includes:
   - Required qualifications (education, experience, skills)
   - Preferred qualifications
   - Technical skills specific to this role
   - Soft skills and personal qualities

Make sure the content is tailored specifically to a ${jobTitle} role in ${department} at ${experienceLevel} level with ${experienceRange} years of experience.

For the requirements field, format it as clean text with clear sections and bullet points, for example:
Required Qualifications:
• Bachelor's degree in Computer Science or related field
• ${experienceRange} years of experience in relevant technologies

Technical Skills:
• Programming languages: JavaScript, Python, etc.
• Frameworks and tools: React, Node.js, etc.

Preferred Qualifications:
• Master's degree preferred
• Experience with cloud platforms

Please respond with valid JSON in this exact format:
{
  "description": "Your detailed job description here...",
  "requirements": "Your comprehensive requirements formatted as readable text with sections and bullet points..."
}`;

  try {
    const claude = getClaudeClient();
    const message = await claude.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    const response = message.content[0];

    if (response.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const responseText = response.text;

    if (!responseText) {
      throw new Error('No response from Claude');
    }

    try {
      const parsedResponse = JSON.parse(responseText);
      return {
        description: parsedResponse.description || '',
        requirements: parsedResponse.requirements || ''
      };
    } catch (parseError) {
      // If JSON parsing fails, try to extract content manually
      const descMatch = responseText.match(/"description":\s*"([^"]*(?:\\.[^"]*)*)"/);
      const reqMatch = responseText.match(/"requirements":\s*"([^"]*(?:\\.[^"]*)*)"/);

      if (descMatch && reqMatch) {
        return {
          description: descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
          requirements: reqMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
        };
      }

      // Fallback: try to extract from markdown-like format
      const lines = responseText.split('\n');
      let description = '';
      let requirements = '';
      let currentSection = '';

      for (const line of lines) {
        if (line.toLowerCase().includes('description') && line.includes(':')) {
          currentSection = 'description';
          continue;
        }
        if (line.toLowerCase().includes('requirements') && line.includes(':')) {
          currentSection = 'requirements';
          continue;
        }

        if (currentSection === 'description' && line.trim()) {
          description += line.trim() + '\n';
        } else if (currentSection === 'requirements' && line.trim()) {
          requirements += line.trim() + '\n';
        }
      }

      if (description || requirements) {
        return {
          description: description.trim() || 'Unable to generate description',
          requirements: requirements.trim() || 'Unable to generate requirements'
        };
      }

      // Final fallback: split the response
      const parts = responseText.split('\n\n');
      return {
        description: parts[0] || 'Unable to generate description',
        requirements: parts[1] || 'Unable to generate requirements'
      };
    }
  } catch (error) {
    console.error('Claude API Error:', error);
    throw new Error(`Failed to generate job description: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}