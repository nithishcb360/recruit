from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User


class DashboardStats(models.Model):
    total_users = models.IntegerField(default=0)
    active_users = models.IntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    orders_today = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Dashboard Statistics"
        verbose_name_plural = "Dashboard Statistics"
        ordering = ['-updated_at']

    def __str__(self):
        return f"Dashboard Stats - {self.updated_at.strftime('%Y-%m-%d %H:%M')}"


class Task(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Created'),
        ('update', 'Updated'),
        ('delete', 'Deleted'),
        ('login', 'Logged In'),
        ('logout', 'Logged Out'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.CharField(max_length=500)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.action} - {self.timestamp.strftime('%Y-%m-%d %H:%M')}"


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Job(models.Model):
    JOB_TYPE_CHOICES = [
        ('full_time', 'Full Time'),
        ('part_time', 'Part Time'),
        ('contract', 'Contract'),
        ('freelance', 'Freelance'),
        ('internship', 'Internship'),
        ('temporary', 'Temporary'),
    ]
    
    EXPERIENCE_LEVEL_CHOICES = [
        ('entry', 'Entry Level'),
        ('junior', 'Junior'),
        ('mid', 'Mid Level'),
        ('senior', 'Senior'),
        ('lead', 'Lead'),
        ('principal', 'Principal'),
        ('director', 'Director'),
        ('vp', 'VP'),
    ]
    
    WORK_TYPE_CHOICES = [
        ('remote', 'Remote'),
        ('onsite', 'On-site'),
        ('hybrid', 'Hybrid'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('closed', 'Closed'),
        ('archived', 'Archived'),
    ]
    
    URGENCY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    # Basic job information
    job_id = models.CharField(max_length=100, blank=True, null=True, unique=True, help_text='Custom job ID (e.g., JOB-2024-001)')
    title = models.CharField(max_length=200)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='jobs')
    description = models.TextField()
    requirements = models.TextField()
    responsibilities = models.TextField(blank=True)
    
    # Job details
    job_type = models.CharField(max_length=20, choices=JOB_TYPE_CHOICES, default='full_time')
    experience_level = models.CharField(max_length=20, choices=EXPERIENCE_LEVEL_CHOICES, default='mid')
    experience_range = models.CharField(max_length=50, blank=True, help_text='Experience range (e.g., "3-5", "5-7")')
    min_experience_years = models.PositiveIntegerField(null=True, blank=True, help_text='Minimum years of experience required')
    max_experience_years = models.PositiveIntegerField(null=True, blank=True, help_text='Maximum years of experience required')
    location = models.CharField(max_length=200, default='Remote')
    work_type = models.CharField(max_length=20, choices=WORK_TYPE_CHOICES, default='remote')
    is_remote = models.BooleanField(default=True)
    
    # Salary information
    salary_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    salary_currency = models.CharField(max_length=3, default='USD')
    show_salary = models.BooleanField(default=False)
    
    # Skills and requirements
    required_skills = models.JSONField(default=list, blank=True)
    preferred_skills = models.JSONField(default=list, blank=True)
    
    # Job management
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES, default='medium')
    openings = models.PositiveIntegerField(default=1)
    sla_days = models.PositiveIntegerField(default=30)
    
    # Publishing options
    publish_internal = models.BooleanField(default=True)
    publish_external = models.BooleanField(default=False)
    publish_company_website = models.BooleanField(default=True)
    
    # Screening questions
    screening_questions = models.JSONField(default=list, blank=True)

    # Interview stages configuration
    interview_stages = models.JSONField(default=list, blank=True, help_text='Interview process configuration with stages')

    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_jobs', null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['department']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.department.name}"

    @property
    def is_active(self):
        return self.status == 'active'
    
    @property
    def salary_range_display(self):
        if self.salary_min and self.salary_max:
            return f"{self.salary_currency} {self.salary_min:,.0f} - {self.salary_max:,.0f}"
        elif self.salary_min:
            return f"{self.salary_currency} {self.salary_min:,.0f}+"
        elif self.salary_max:
            return f"Up to {self.salary_currency} {self.salary_max:,.0f}"
        return None


class Candidate(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('screening', 'Screening'),
        ('interviewing', 'Interviewing'),
        ('offered', 'Offered'),
        ('hired', 'Hired'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Withdrawn'),
    ]
    
    EXPERIENCE_LEVEL_CHOICES = [
        ('entry', 'Entry Level'),
        ('junior', 'Junior'),
        ('mid', 'Mid Level'),
        ('senior', 'Senior'),
        ('lead', 'Lead'),
        ('principal', 'Principal'),
    ]

    # Personal information
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=200, blank=True)
    
    # Resume information
    resume_file = models.FileField(upload_to='resumes/', null=True, blank=True)
    resume_text = models.TextField(blank=True)
    
    # Parsed resume data
    skills = models.JSONField(default=list, blank=True)
    experience_years = models.PositiveIntegerField(null=True, blank=True)
    experience_level = models.CharField(max_length=20, choices=EXPERIENCE_LEVEL_CHOICES, default='mid')
    education = models.JSONField(default=list, blank=True)
    certifications = models.JSONField(default=list, blank=True)
    
    # Work information
    current_company = models.CharField(max_length=200, blank=True)
    current_position = models.CharField(max_length=200, blank=True)
    salary_expectation = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    availability = models.CharField(max_length=100, blank=True)
    
    # Comprehensive resume data from enhanced parser
    summary = models.TextField(blank=True, help_text='Professional summary from resume')
    projects = models.JSONField(default=list, blank=True, help_text='List of projects with details')
    work_experience = models.JSONField(default=list, blank=True, help_text='Detailed work experience history')
    languages = models.JSONField(default=list, blank=True, help_text='Programming/spoken languages')
    achievements = models.JSONField(default=list, blank=True, help_text='Notable achievements and awards')
    linkedin_url = models.URLField(blank=True, help_text='LinkedIn profile URL')
    github_url = models.URLField(blank=True, help_text='GitHub profile URL')
    portfolio_url = models.URLField(blank=True, help_text='Portfolio website URL')
    visa_status = models.CharField(max_length=100, blank=True, help_text='Work authorization status')
    preferred_location = models.CharField(max_length=200, blank=True, help_text='Preferred work location')
    notice_period = models.CharField(max_length=100, blank=True, help_text='Notice period for current job')

    # Status and tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    source = models.CharField(max_length=100, default='Direct Application')
    rating = models.PositiveIntegerField(null=True, blank=True)

    # Assessment fields
    assessment_url = models.URLField(blank=True, help_text='WebDesk assessment URL')
    assessment_username = models.CharField(max_length=100, blank=True, help_text='Unique username for assessment login')
    assessment_password = models.CharField(max_length=100, blank=True, help_text='Password for assessment login')
    assessment_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text='Assessment score percentage')
    assessment_completed = models.BooleanField(default=False, help_text='Whether assessment is completed')
    assessment_time_taken = models.IntegerField(null=True, blank=True, help_text='Time taken in seconds')
    assessment_tab_switches = models.IntegerField(default=0, help_text='Number of tab switches detected')
    assessment_disqualified = models.BooleanField(default=False, help_text='Whether candidate was disqualified for cheating')
    assessment_recording = models.FileField(upload_to='assessment_recordings/', null=True, blank=True, help_text='Video/audio recording of assessment')
    assessment_video_recording = models.FileField(upload_to='assessment_videos/', null=True, blank=True, help_text='Camera video recording of assessment')
    assessment_screen_recording = models.FileField(upload_to='assessment_screens/', null=True, blank=True, help_text='Screen recording of assessment')
    assessment_video_url = models.URLField(blank=True, help_text='Video recording URL from WebDesk assessment')
    assessment_audio_url = models.URLField(blank=True, help_text='Audio recording URL from WebDesk assessment')
    assessment_screen_url = models.URLField(blank=True, help_text='Screen recording URL from WebDesk assessment')
    assessment_responses = models.JSONField(default=dict, blank=True, help_text='Full assessment question responses with answers')

    # Retell AI Call fields
    retell_call_id = models.CharField(max_length=100, blank=True, help_text='Retell AI call ID')
    retell_call_status = models.CharField(max_length=20, blank=True, help_text='Call status: registered, ongoing, ended, error')
    retell_call_type = models.CharField(max_length=20, blank=True, help_text='Call type: phone_call or web_call')
    retell_recording_url = models.URLField(blank=True, help_text='Retell call recording URL')
    retell_transcript = models.TextField(blank=True, help_text='Full call transcript from Retell')
    retell_transcript_object = models.JSONField(default=list, blank=True, help_text='Detailed transcript with timestamps')
    retell_call_duration_ms = models.IntegerField(null=True, blank=True, help_text='Call duration in milliseconds')
    retell_call_summary = models.TextField(blank=True, help_text='AI-generated call summary')
    retell_call_analysis = models.JSONField(default=dict, blank=True, help_text='Full call analysis from Retell AI')
    retell_user_sentiment = models.CharField(max_length=20, blank=True, help_text='Candidate sentiment: Positive/Neutral/Negative')
    retell_call_successful = models.BooleanField(default=False, help_text='Whether call was successful')
    retell_in_voicemail = models.BooleanField(default=False, help_text='Whether call went to voicemail')

    # Retell AI - Interview Scheduling Data
    retell_interview_scheduled = models.BooleanField(default=False, help_text='Was interview time confirmed?')
    retell_scheduled_date = models.CharField(max_length=50, blank=True, help_text='Interview date YYYY-MM-DD')
    retell_scheduled_time = models.CharField(max_length=50, blank=True, help_text='Interview time HH:MM AM/PM')
    retell_scheduled_timezone = models.CharField(max_length=100, blank=True, help_text='Interview timezone')
    retell_scheduled_datetime_iso = models.CharField(max_length=100, blank=True, help_text='ISO 8601 datetime string')
    retell_candidate_timezone = models.CharField(max_length=100, blank=True, help_text='Candidate timezone')
    retell_availability_preference = models.CharField(max_length=200, blank=True, help_text='Candidate availability preference')
    retell_unavailable_dates = models.TextField(blank=True, help_text='Dates candidate is NOT available')

    # Retell AI - Screening Data
    retell_is_qualified = models.BooleanField(default=False, help_text='Does candidate meet basic qualifications?')
    retell_interest_level = models.CharField(max_length=20, blank=True, help_text='Candidate interest: High/Medium/Low/Not Interested')
    retell_technical_skills = models.JSONField(default=list, blank=True, help_text='Technical skills mentioned in call')
    retell_questions_asked = models.JSONField(default=list, blank=True, help_text='Questions asked by candidate')
    retell_call_outcome = models.CharField(max_length=50, blank=True, help_text='Call outcome: Interview Scheduled/Callback Requested/Not Interested/Voicemail')
    retell_rejection_reason = models.TextField(blank=True, help_text='Reason if candidate rejected')

    # Retell AI - Metadata
    retell_metadata = models.JSONField(default=dict, blank=True, help_text='Custom metadata from call')
    retell_start_timestamp = models.BigIntegerField(null=True, blank=True, help_text='Call start timestamp (ms)')
    retell_end_timestamp = models.BigIntegerField(null=True, blank=True, help_text='Call end timestamp (ms)')
    retell_public_log_url = models.URLField(blank=True, help_text='Public URL for call logs')
    retell_additional_notes = models.TextField(blank=True, help_text='Additional notes from call analysis')

    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class JobApplication(models.Model):
    STATUS_CHOICES = [
        ('applied', 'Applied'),
        ('screening', 'Screening'),
        ('interviewing', 'Interviewing'),
        ('offered', 'Offered'),
        ('hired', 'Hired'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Withdrawn'),
    ]

    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='applications')
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='applied')
    rating = models.PositiveIntegerField(null=True, blank=True, help_text="Rating from 1-5")
    cover_letter = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    
    # Interview scheduling
    interview_date = models.DateTimeField(null=True, blank=True)
    interviewer = models.CharField(max_length=200, blank=True)
    
    # Timestamps
    applied_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['candidate', 'job']
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.candidate.full_name} - {self.job.title}"


class FeedbackTemplate(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    questions = models.JSONField(default=list, blank=True)
    sections = models.JSONField(default=list, blank=True)
    rating_criteria = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_feedback_templates', null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['is_active']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return self.name


class InterviewFlow(models.Model):
    """Model for storing interview flow configurations"""
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)
    job_types = models.JSONField(default=list, blank=True)  # List of job types this flow applies to
    total_estimated_time = models.IntegerField(default=0)  # Total time in minutes
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['is_default']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Ensure only one default flow exists
        if self.is_default:
            InterviewFlow.objects.filter(is_default=True).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)


class InterviewRound(models.Model):
    """Model for storing individual interview rounds"""
    ROUND_TYPE_CHOICES = [
        ('telephonic', 'Telephonic'),
        ('video', 'Video'),
        ('technical', 'Technical'),
        ('hr', 'HR'),
        ('panel', 'Panel'),
        ('assignment', 'Assignment'),
        ('onsite', 'Onsite'),
        ('cultural', 'Cultural'),
    ]

    INTERVIEW_TYPE_CHOICES = [
        ('AI Assisted', 'AI Assisted'),
        ('Human Only', 'Human Only'),
        ('Hybrid', 'Hybrid'),
    ]

    flow = models.ForeignKey(InterviewFlow, on_delete=models.CASCADE, related_name='rounds')
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=ROUND_TYPE_CHOICES, default='video')
    description = models.TextField(blank=True)
    duration = models.IntegerField(default=30)  # Duration in minutes
    is_required = models.BooleanField(default=True)
    order = models.IntegerField(default=1)

    # Interview type and feedback configuration
    interview_type = models.CharField(max_length=20, choices=INTERVIEW_TYPE_CHOICES, blank=True, null=True)
    feedback_form_id = models.CharField(max_length=50, blank=True, null=True)
    feedback_form_name = models.CharField(max_length=200, blank=True, null=True)

    # Additional fields for interview round configuration
    interviewers = models.JSONField(default=list, blank=True)  # List of interviewer names/roles
    skills = models.JSONField(default=list, blank=True)  # Skills to assess in this round
    passing_criteria = models.JSONField(default=dict, blank=True)  # Criteria for passing
    auto_advance = models.BooleanField(default=False)
    email_template = models.CharField(max_length=100, blank=True)
    instructions = models.TextField(blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['flow', 'order']
        unique_together = ['flow', 'order']
        indexes = [
            models.Index(fields=['flow', 'order']),
            models.Index(fields=['type']),
        ]

    def __str__(self):
        return f"{self.flow.name} - {self.name}"