# Retell AI Integration Guide

## Overview
This guide explains how to integrate Retell AI call data with your recruitment system.

## Table of Contents
1. [Agent Prompt Configuration](#agent-prompt-configuration)
2. [Post-Call Analysis Setup](#post-call-analysis-setup)
3. [Webhook Integration](#webhook-integration)
4. [API Endpoint Usage](#api-endpoint-usage)
5. [Database Schema](#database-schema)

---

## 1. Agent Prompt Configuration

### Copy the Retell Agent Prompt
Use the complete agent prompt provided in this repository to configure your Retell AI agent. The prompt ensures:
- Exact date and time extraction (no vague "Monday" or "afternoon")
- Timezone confirmation
- Structured data extraction
- Natural conversation flow

See the full prompt in the main documentation.

---

## 2. Post-Call Analysis Setup

### Configure Custom Analysis Fields in Retell Dashboard

Go to your Retell dashboard → Post-Call Analysis → Add Custom Fields:

```json
{
  "interview_scheduled": {
    "type": "boolean",
    "description": "Was a specific interview date and time confirmed?"
  },
  "scheduled_date": {
    "type": "text",
    "description": "Interview date in YYYY-MM-DD format (e.g., 2025-10-08)"
  },
  "scheduled_time": {
    "type": "text",
    "description": "Interview time in HH:MM AM/PM format (e.g., 10:00 AM)"
  },
  "scheduled_timezone": {
    "type": "text",
    "description": "Full timezone name (e.g., Pacific Time (PT), Eastern Time (ET))"
  },
  "scheduled_datetime_iso": {
    "type": "text",
    "description": "Complete ISO 8601 datetime string (e.g., 2025-10-08T10:00:00-07:00)"
  },
  "candidate_timezone": {
    "type": "text",
    "description": "Candidate's timezone"
  },
  "unavailable_dates": {
    "type": "text",
    "description": "Dates the candidate is NOT available"
  },
  "is_qualified_candidate": {
    "type": "boolean",
    "description": "Does candidate meet basic qualifications?"
  },
  "candidate_interest_level": {
    "type": "selector",
    "options": ["High", "Medium", "Low", "Not Interested"],
    "description": "Candidate's interest level"
  },
  "years_of_experience": {
    "type": "number",
    "description": "Years of relevant experience"
  },
  "salary_expectation": {
    "type": "number",
    "description": "Candidate's salary expectation in dollars"
  },
  "technical_skills_mentioned": {
    "type": "text",
    "description": "List of technical skills mentioned (comma-separated)"
  },
  "outcome": {
    "type": "selector",
    "options": ["Interview Scheduled", "Callback Requested", "Not Interested", "Voicemail Left"],
    "description": "Call outcome"
  }
}
```

---

## 3. Webhook Integration

### Set Up Retell Webhook

1. Go to Retell Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/retell`
3. Subscribe to event: `call_analyzed`

### Webhook Handler (Create this file)

Create `backend/api/views.py` webhook handler:

```python
@csrf_exempt
@api_view(['POST'])
def retell_webhook(request):
    """
    Webhook receiver for Retell AI call_analyzed events
    """
    try:
        event_type = request.data.get('event')

        if event_type == 'call_analyzed':
            call_data = request.data.get('call', {})
            call_id = call_data.get('call_id')
            metadata = call_data.get('metadata', {})

            # Get candidate_id from metadata (passed when creating the call)
            candidate_id = metadata.get('candidate_id')

            if not candidate_id:
                logger.warning(f"No candidate_id in metadata for call {call_id}")
                return Response({'status': 'no_candidate_id'}, status=200)

            # Find the candidate
            try:
                candidate = Candidate.objects.get(id=candidate_id)
            except Candidate.DoesNotExist:
                logger.error(f"Candidate {candidate_id} not found for call {call_id}")
                return Response({'status': 'candidate_not_found'}, status=200)

            # Save call data to candidate
            save_retell_data_to_candidate(candidate, call_data)

            return Response({'status': 'success'}, status=200)

        return Response({'status': 'ignored'}, status=200)

    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return Response({'status': 'error', 'message': str(e)}, status=500)


def save_retell_data_to_candidate(candidate, call_data):
    """Helper function to save Retell call data to candidate"""
    # Basic call info
    candidate.retell_call_id = call_data.get('call_id', '')
    candidate.retell_call_status = call_data.get('call_status', '')
    candidate.retell_call_type = call_data.get('call_type', '')
    candidate.retell_recording_url = call_data.get('recording_url', '')
    candidate.retell_transcript = call_data.get('transcript', '')
    candidate.retell_transcript_object = call_data.get('transcript_object', [])
    candidate.retell_call_duration_ms = call_data.get('duration_ms')
    candidate.retell_start_timestamp = call_data.get('start_timestamp')
    candidate.retell_end_timestamp = call_data.get('end_timestamp')
    candidate.retell_metadata = call_data.get('metadata', {})
    candidate.retell_public_log_url = call_data.get('public_log_url', '')

    # Call analysis
    call_analysis = call_data.get('call_analysis', {})
    if call_analysis:
        candidate.retell_call_analysis = call_analysis
        candidate.retell_call_summary = call_analysis.get('call_summary', '')
        candidate.retell_user_sentiment = call_analysis.get('user_sentiment', '')
        candidate.retell_call_successful = call_analysis.get('call_successful', False)
        candidate.retell_in_voicemail = call_analysis.get('in_voicemail', False)

        # Custom analysis data
        custom_data = call_analysis.get('custom_analysis_data', {})
        if custom_data:
            candidate.retell_interview_scheduled = custom_data.get('interview_scheduled', False)
            candidate.retell_scheduled_date = custom_data.get('scheduled_date', '')
            candidate.retell_scheduled_time = custom_data.get('scheduled_time', '')
            candidate.retell_scheduled_timezone = custom_data.get('scheduled_timezone', '')
            candidate.retell_scheduled_datetime_iso = custom_data.get('scheduled_datetime_iso', '')
            candidate.retell_candidate_timezone = custom_data.get('candidate_timezone', '')
            candidate.retell_availability_preference = custom_data.get('availability_preference', '')
            candidate.retell_unavailable_dates = custom_data.get('unavailable_dates', '')
            candidate.retell_is_qualified = custom_data.get('is_qualified_candidate', False)
            candidate.retell_interest_level = custom_data.get('candidate_interest_level', '')

            # Convert technical_skills from string to list if needed
            tech_skills = custom_data.get('technical_skills_mentioned', [])
            if isinstance(tech_skills, str):
                tech_skills = [s.strip() for s in tech_skills.split(',')]
            candidate.retell_technical_skills = tech_skills

            candidate.retell_questions_asked = custom_data.get('questions_asked', [])
            candidate.retell_call_outcome = custom_data.get('outcome', '')
            candidate.retell_rejection_reason = custom_data.get('rejection_reason', '')
            candidate.retell_additional_notes = custom_data.get('additional_notes', '')

            # Update candidate status
            if candidate.retell_interview_scheduled:
                candidate.status = 'interviewing'
            elif candidate.retell_call_outcome == 'Not Interested':
                candidate.status = 'rejected'

    candidate.save()
    logger.info(f"Saved Retell call data for candidate {candidate.id}")
```

Add to `backend/api/urls.py`:
```python
urlpatterns = [
    # ... existing urls
    path('webhooks/retell', views.retell_webhook, name='retell-webhook'),
]
```

---

## 4. API Endpoint Usage

### Manual Call Data Save

**Endpoint:** `POST /api/candidates/{id}/save_retell_call_data/`

**Example Request:**
```bash
curl -X POST http://localhost:8000/api/candidates/199/save_retell_call_data/ \
  -H "Content-Type: application/json" \
  -d '{
    "call_id": "call_abc123xyz789",
    "call_status": "ended",
    "call_type": "phone_call",
    "recording_url": "https://retell-recordings.s3.amazonaws.com/call_abc123xyz789.mp3",
    "transcript": "Agent: Hello, this is Emma from TechCorp...",
    "transcript_object": [
      {
        "role": "agent",
        "content": "Hello, this is Emma from TechCorp. How are you today?",
        "words": []
      },
      {
        "role": "user",
        "content": "I am doing well, thank you.",
        "words": []
      }
    ],
    "call_analysis": {
      "call_summary": "Conducted phone screening for Senior Python Developer. Candidate is qualified with 5 years experience. Scheduled technical interview for Tuesday, October 8th at 3 PM EST.",
      "user_sentiment": "Positive",
      "call_successful": true,
      "in_voicemail": false,
      "custom_analysis_data": {
        "interview_scheduled": true,
        "scheduled_date": "2025-10-08",
        "scheduled_time": "3:00 PM",
        "scheduled_timezone": "Eastern Time (ET)",
        "scheduled_datetime_iso": "2025-10-08T15:00:00-04:00",
        "candidate_timezone": "Eastern Time",
        "unavailable_dates": "October 15-17 (vacation)",
        "is_qualified_candidate": true,
        "candidate_interest_level": "High",
        "years_of_experience": 5,
        "salary_expectation": 120000,
        "technical_skills_mentioned": ["Python", "Django", "AWS", "Docker"],
        "questions_asked": ["What is the team size?", "Is remote work supported?"],
        "outcome": "Interview Scheduled"
      }
    },
    "duration_ms": 600000,
    "start_timestamp": 1704067200000,
    "end_timestamp": 1704067800000,
    "metadata": {
      "candidate_id": "199",
      "job_id": "45",
      "recruiter": "Emma Johnson"
    },
    "public_log_url": "https://logs.retellai.com/call/abc123xyz789"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Retell call data saved successfully",
  "candidate": {
    "id": 199,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "retell_call_id": "call_abc123xyz789",
    "retell_call_status": "ended",
    "retell_interview_scheduled": true,
    "retell_scheduled_date": "2025-10-08",
    "retell_scheduled_time": "3:00 PM",
    "retell_scheduled_timezone": "Eastern Time (ET)",
    "retell_call_summary": "Conducted phone screening for Senior Python Developer...",
    "retell_user_sentiment": "Positive",
    "retell_is_qualified": true,
    "retell_interest_level": "High",
    "status": "interviewing"
  }
}
```

---

## 5. Database Schema

### Candidate Model - Retell AI Fields

```python
# Basic Call Info
retell_call_id = CharField(max_length=100)
retell_call_status = CharField(max_length=20)  # ended, ongoing, error
retell_call_type = CharField(max_length=20)  # phone_call, web_call
retell_recording_url = URLField()
retell_transcript = TextField()
retell_transcript_object = JSONField()  # Detailed transcript with timestamps
retell_call_duration_ms = IntegerField()
retell_call_summary = TextField()
retell_call_analysis = JSONField()  # Full analysis object
retell_user_sentiment = CharField(max_length=20)  # Positive/Neutral/Negative
retell_call_successful = BooleanField()
retell_in_voicemail = BooleanField()

# Interview Scheduling
retell_interview_scheduled = BooleanField()
retell_scheduled_date = CharField(max_length=50)  # YYYY-MM-DD
retell_scheduled_time = CharField(max_length=50)  # HH:MM AM/PM
retell_scheduled_timezone = CharField(max_length=100)
retell_scheduled_datetime_iso = CharField(max_length=100)  # ISO 8601
retell_candidate_timezone = CharField(max_length=100)
retell_availability_preference = CharField(max_length=200)
retell_unavailable_dates = TextField()

# Screening Data
retell_is_qualified = BooleanField()
retell_interest_level = CharField(max_length=20)  # High/Medium/Low
retell_technical_skills = JSONField()  # Array of skills
retell_questions_asked = JSONField()  # Array of questions
retell_call_outcome = CharField(max_length=50)
retell_rejection_reason = TextField()

# Metadata
retell_metadata = JSONField()
retell_start_timestamp = BigIntegerField()
retell_end_timestamp = BigIntegerField()
retell_public_log_url = URLField()
retell_additional_notes = TextField()
```

---

## Example Usage Flow

### 1. Create Retell Call with Metadata
```javascript
// When initiating a call from your frontend
const response = await fetch('https://api.retellai.com/v2/create-phone-call', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RETELL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from_number: '+1234567890',
    to_number: candidate.phone,
    agent_id: 'your_agent_id',
    metadata: {
      candidate_id: candidate.id,
      job_id: job.id,
      recruiter: currentUser.name
    }
  })
});
```

### 2. Retell AI Makes Call
- Agent follows the prompt
- Conducts screening
- Schedules interview
- Extracts structured data

### 3. Call Ends → Webhook Fired
- Retell sends `call_analyzed` event to your webhook
- Webhook automatically saves data to candidate record

### 4. View in Frontend
```javascript
// Fetch candidate with Retell data
const candidate = await fetch(`/api/candidates/${id}`).then(r => r.json());

console.log(candidate.retell_interview_scheduled);  // true
console.log(candidate.retell_scheduled_date);  // "2025-10-08"
console.log(candidate.retell_scheduled_time);  // "3:00 PM"
console.log(candidate.retell_call_summary);  // Full summary
```

---

## Testing

### Test with cURL
```bash
# Get candidate before
curl http://localhost:8000/api/candidates/199/ | jq '.retell_call_id'

# Save call data
curl -X POST http://localhost:8000/api/candidates/199/save_retell_call_data/ \
  -H "Content-Type: application/json" \
  -d @test_call_data.json

# Get candidate after
curl http://localhost:8000/api/candidates/199/ | jq '.retell_interview_scheduled'
```

---

## Next Steps

1. ✅ Configure Retell agent with the provided prompt
2. ✅ Set up custom analysis fields in Retell dashboard
3. ✅ Add webhook endpoint to your application
4. ✅ Test with manual API calls
5. ✅ Deploy and configure webhook URL in Retell dashboard
6. Create frontend UI to display call data
7. Set up calendar integration for scheduled interviews

---

## Troubleshooting

### Webhook not receiving data
- Check webhook URL is publicly accessible
- Verify webhook is enabled in Retell dashboard
- Check server logs for errors

### Data not saving correctly
- Verify field names match between Retell custom fields and API
- Check that candidate_id is passed in metadata
- Review Django logs for database errors

### Call analysis fields are empty
- Ensure custom analysis fields are properly configured in Retell dashboard
- Verify agent prompt instructs extraction of these fields
- Check that call was successful (not voicemail)

---

## Support

For issues with:
- **Retell AI**: Contact support@retellai.com or check docs.retellai.com
- **This Integration**: Check server logs and database migrations
