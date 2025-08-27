# AI Job Description Generation Setup

This guide explains how to set up AI-powered job description generation using OpenAI's GPT API.

## Features

- **Real AI Generation**: Uses OpenAI GPT-3.5-turbo to create compelling, role-specific job descriptions
- **Smart Fallback**: Automatically falls back to template generation if AI service is unavailable
- **Enhanced Prompting**: Creates detailed, contextual prompts for better AI output
- **Error Handling**: Graceful error handling with user-friendly messages

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install openai==1.12.0
```

### 2. Get OpenAI API Key

1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`)

### 3. Configure Environment

Create a `.env` file in the `backend/` directory:

```env
# Add to your existing .env file
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Important**: Never commit your actual API key to version control!

### 4. Test the Integration

1. Start the backend server:
```bash
cd backend
python manage.py runserver
```

2. Start the frontend:
```bash
cd frontend
pnpm dev
```

3. Navigate to job creation form
4. Fill in job title and basic details
5. Click "Generate with AI" button

## How It Works

### Backend Implementation

**AI Service** (`backend/jobs/ai_service.py`):
- Handles OpenAI API communication
- Creates detailed prompts based on job parameters
- Parses AI responses into structured sections
- Provides template fallback when AI is unavailable

**API Endpoint** (`/api/jobs/generate_jd/`):
- Accepts job parameters (title, department, level, etc.)
- Calls AI service for generation
- Returns structured response with success indicators

### Frontend Integration

**Enhanced API Response**:
```typescript
interface GenerateJDResponse {
  success: boolean;
  data: {
    description: string;
    responsibilities: string;
    requirements: string;
  };
  ai_generated: boolean; // Indicates if AI or templates were used
}
```

**Smart Error Handling**:
- Detects API key issues
- Shows appropriate user messages
- Continues with template generation on AI failures

## Customization

### Prompt Engineering

Edit the prompt in `backend/jobs/ai_service.py` to customize:
- Writing style and tone
- Specific sections and format
- Industry-specific requirements
- Company culture integration

### Model Configuration

Change the AI model in `ai_service.py`:
```python
self.model = "gpt-4"  # For higher quality (more expensive)
self.model = "gpt-3.5-turbo"  # Default (cost-effective)
```

### Template Fallback

The system automatically falls back to templates when:
- OpenAI API key is missing or invalid
- API rate limits are exceeded
- Network connectivity issues occur
- OpenAI service is down

## Cost Considerations

**Typical Usage**:
- ~1,500 tokens per job description
- GPT-3.5-turbo: ~$0.002 per generation
- GPT-4: ~$0.03 per generation

**Cost Optimization**:
- Use GPT-3.5-turbo for most cases
- Implement caching for similar job types
- Set usage limits if needed

## Security Best Practices

1. **Environment Variables**: Store API key in `.env` file
2. **Rate Limiting**: Implement request rate limiting
3. **Input Validation**: Validate all input parameters
4. **Error Handling**: Don't expose API errors to users
5. **Monitoring**: Log API usage and costs

## Troubleshooting

### Common Issues

**"API key not configured"**:
- Check `.env` file exists in backend directory
- Verify `OPENAI_API_KEY` is set correctly
- Restart Django server after adding key

**"Rate limit exceeded"**:
- Wait a few minutes and try again
- Consider upgrading OpenAI plan
- Implement request queuing

**"Generated content is poor quality"**:
- Review and improve the prompt
- Add more context about company/role
- Consider using GPT-4 for better output

### Testing Without API Key

The system works without an OpenAI API key by falling back to templates:
1. Don't set `OPENAI_API_KEY` in `.env`
2. Generation will use enhanced templates
3. User will see "template generation" message

## Future Enhancements

- **Multiple AI Providers**: Support Anthropic Claude, Google Gemini
- **Custom Prompts**: Allow per-organization prompt customization
- **Content Caching**: Cache generated content for similar roles
- **A/B Testing**: Compare AI vs template effectiveness
- **Batch Generation**: Generate multiple job descriptions at once