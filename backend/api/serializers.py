from rest_framework import serializers
from django.contrib.auth.models import User
from .models import DashboardStats, Task, ActivityLog, Department, Job, Candidate, JobApplication, FeedbackTemplate


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class DashboardStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardStats
        fields = ['id', 'total_users', 'active_users', 'total_revenue', 'orders_today', 'created_at', 'updated_at']


class TaskSerializer(serializers.ModelSerializer):
    assigned_to = UserSerializer(read_only=True)
    
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'status', 'priority', 'assigned_to', 'due_date', 'created_at', 'updated_at']


class TaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['title', 'description', 'status', 'priority', 'assigned_to', 'due_date']


class ActivityLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'action', 'description', 'ip_address', 'timestamp']


class DashboardOverviewSerializer(serializers.Serializer):
    stats = DashboardStatsSerializer()
    recent_tasks = TaskSerializer(many=True)
    recent_activities = ActivityLogSerializer(many=True)
    task_status_counts = serializers.DictField()
    priority_counts = serializers.DictField()


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']


class JobSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    salary_range_display = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()
    
    class Meta:
        model = Job
        fields = [
            'id', 'title', 'department', 'description', 'requirements', 'responsibilities',
            'job_type', 'experience_level', 'location', 'work_type', 'is_remote',
            'salary_min', 'salary_max', 'salary_currency', 'show_salary', 'salary_range_display',
            'required_skills', 'preferred_skills',
            'status', 'urgency', 'openings', 'sla_days',
            'publish_internal', 'publish_external', 'publish_company_website',
            'screening_questions', 'created_by', 'is_active',
            'created_at', 'updated_at', 'published_at', 'closed_at'
        ]


class JobCreateSerializer(serializers.ModelSerializer):
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all())
    
    class Meta:
        model = Job
        fields = [
            'title', 'department', 'description', 'requirements', 'responsibilities',
            'job_type', 'experience_level', 'location', 'work_type', 'is_remote',
            'salary_min', 'salary_max', 'salary_currency', 'show_salary',
            'required_skills', 'preferred_skills',
            'status', 'urgency', 'openings', 'sla_days',
            'publish_internal', 'publish_external', 'publish_company_website',
            'screening_questions'
        ]
    
    def validate(self, data):
        """Validate job data"""
        if data.get('salary_min') and data.get('salary_max'):
            if data['salary_min'] > data['salary_max']:
                raise serializers.ValidationError("Minimum salary cannot be greater than maximum salary")
        
        if data.get('openings', 0) <= 0:
            raise serializers.ValidationError("Number of openings must be greater than 0")
            
        return data


class JobUpdateSerializer(serializers.ModelSerializer):
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False)
    
    class Meta:
        model = Job
        fields = [
            'title', 'department', 'description', 'requirements', 'responsibilities',
            'job_type', 'experience_level', 'location', 'work_type', 'is_remote',
            'salary_min', 'salary_max', 'salary_currency', 'show_salary',
            'required_skills', 'preferred_skills',
            'status', 'urgency', 'openings', 'sla_days',
            'publish_internal', 'publish_external', 'publish_company_website',
            'screening_questions'
        ]
    
    def validate(self, data):
        """Validate job data"""
        instance = self.instance
        
        # Get current values if not provided in update
        salary_min = data.get('salary_min', instance.salary_min if instance else None)
        salary_max = data.get('salary_max', instance.salary_max if instance else None)
        
        if salary_min and salary_max and salary_min > salary_max:
            raise serializers.ValidationError("Minimum salary cannot be greater than maximum salary")
        
        openings = data.get('openings', instance.openings if instance else 1)
        if openings <= 0:
            raise serializers.ValidationError("Number of openings must be greater than 0")
            
        return data


class JobListSerializer(serializers.ModelSerializer):
    """Lighter serializer for job listings"""
    department = DepartmentSerializer(read_only=True)
    salary_range_display = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()
    
    class Meta:
        model = Job
        fields = [
            'id', 'title', 'department', 'job_type', 'experience_level', 
            'location', 'work_type', 'salary_range_display', 'status', 
            'urgency', 'openings', 'is_active', 'created_at', 'updated_at'
        ]


class CandidateSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    name = serializers.SerializerMethodField()  # For frontend compatibility

    class Meta:
        model = Candidate
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'name', 'email', 'phone', 'location',
            'resume_file', 'resume_text', 'skills', 'experience_years', 'experience_level',
            'education', 'certifications', 'current_company', 'current_position',
            'salary_expectation', 'availability', 'status', 'source', 'rating',
            'summary', 'projects', 'work_experience', 'languages', 'achievements',
            'linkedin_url', 'github_url', 'portfolio_url', 'visa_status',
            'preferred_location', 'notice_period',
            'created_at', 'updated_at'
        ]

    def get_name(self, obj):
        """Return full name for frontend compatibility"""
        return f"{obj.first_name} {obj.last_name}".strip()


class CandidateCreateSerializer(serializers.ModelSerializer):
    # Make email optional and allow blank values and null
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)

    # Comprehensive fields with defaults
    summary = serializers.CharField(required=False, allow_blank=True, default='')
    projects = serializers.ListField(required=False, default=list)
    work_experience = serializers.ListField(required=False, default=list)
    languages = serializers.ListField(required=False, default=list)
    achievements = serializers.ListField(required=False, default=list)
    linkedin_url = serializers.URLField(required=False, allow_blank=True, default='')
    github_url = serializers.URLField(required=False, allow_blank=True, default='')
    portfolio_url = serializers.URLField(required=False, allow_blank=True, default='')
    visa_status = serializers.CharField(required=False, allow_blank=True, default='')
    preferred_location = serializers.CharField(required=False, allow_blank=True, default='')
    notice_period = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = Candidate
        fields = [
            'first_name', 'last_name', 'email', 'phone', 'location',
            'resume_file', 'skills', 'experience_years', 'experience_level',
            'education', 'certifications', 'current_company', 'current_position',
            'salary_expectation', 'availability', 'source',
            'summary', 'projects', 'work_experience', 'languages', 'achievements',
            'linkedin_url', 'github_url', 'portfolio_url', 'visa_status',
            'preferred_location', 'notice_period'
        ]

    def validate_email(self, value):
        """Handle empty email validation"""
        if value == '' or value is None:
            return None  # Convert empty string or None to None
        return value

    def create(self, validated_data):
        """Create candidate with proper default values"""
        # Ensure all list fields have default values
        list_fields = ['skills', 'education', 'certifications', 'projects', 'work_experience', 'languages', 'achievements']
        for field in list_fields:
            if field not in validated_data or validated_data[field] is None:
                validated_data[field] = []

        # Ensure string fields have default values
        string_fields = ['summary', 'linkedin_url', 'github_url', 'portfolio_url', 'visa_status', 'preferred_location', 'notice_period']
        for field in string_fields:
            if field not in validated_data or validated_data[field] is None:
                validated_data[field] = ''

        return super().create(validated_data)


class CandidateListSerializer(serializers.ModelSerializer):
    """Enhanced serializer for candidate listings with parsed resume data"""
    full_name = serializers.ReadOnlyField()
    name = serializers.SerializerMethodField()  # For frontend compatibility
    
    class Meta:
        model = Candidate
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'name', 'email', 'phone',
            'location', 'experience_years', 'experience_level', 'current_company', 
            'current_position', 'skills', 'education', 'certifications',
            'status', 'rating', 'created_at', 'updated_at'
        ]
    
    def get_name(self, obj):
        """Return full name for frontend compatibility"""
        return f"{obj.first_name} {obj.last_name}".strip()


class JobApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating job applications"""
    
    class Meta:
        model = JobApplication
        fields = [
            'candidate', 'job', 'status', 'cover_letter', 'notes',
            'interview_date', 'interviewer'
        ]


class JobApplicationSerializer(serializers.ModelSerializer):
    stage = serializers.CharField(source='status')
    stage_updated_at = serializers.CharField(source='updated_at')
    overall_rating = serializers.IntegerField(source='rating', default=0)
    candidate_details = serializers.SerializerMethodField()
    job_details = serializers.SerializerMethodField()
    
    class Meta:
        model = JobApplication
        fields = [
            'id', 'candidate', 'job', 'stage', 'overall_rating', 'stage_updated_at',
            'candidate_details', 'job_details'
        ]
    
    def get_candidate_details(self, obj):
        if obj.candidate:
            return {
                'full_name': f"{obj.candidate.first_name} {obj.candidate.last_name}".strip(),
                'email': obj.candidate.email,
                'phone': obj.candidate.phone,
                'location': obj.candidate.location,
            }
        return None
    
    def get_job_details(self, obj):
        if obj.job:
            return {
                'title': obj.job.title,
                'department': obj.job.department.name if obj.job.department else None,
            }
        return None


class ResumeParseSerializer(serializers.Serializer):
    """Comprehensive serializer for resume parsing results"""
    # Basic information
    name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)

    # Professional information
    summary = serializers.CharField(required=False, allow_blank=True)
    current_position = serializers.CharField(required=False, allow_blank=True)
    current_company = serializers.CharField(required=False, allow_blank=True)
    experience_years = serializers.IntegerField(required=False, allow_null=True)

    # Skills and qualifications
    skills = serializers.ListField(child=serializers.CharField(), required=False)
    education = serializers.ListField(required=False)
    certifications = serializers.ListField(child=serializers.CharField(), required=False)
    languages = serializers.ListField(child=serializers.CharField(), required=False)

    # Detailed experience and projects
    work_experience = serializers.ListField(required=False)
    projects = serializers.ListField(required=False)
    achievements = serializers.ListField(child=serializers.CharField(), required=False)

    # Social profiles and links
    linkedin_url = serializers.URLField(required=False, allow_blank=True)
    github_url = serializers.URLField(required=False, allow_blank=True)
    portfolio_url = serializers.URLField(required=False, allow_blank=True)

    # Work authorization and availability
    visa_status = serializers.CharField(required=False, allow_blank=True)
    notice_period = serializers.CharField(required=False, allow_blank=True)

    # Raw data
    text = serializers.CharField(required=False, allow_blank=True)

    # Backward compatibility
    experience = serializers.DictField(required=False)


class FeedbackTemplateSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = FeedbackTemplate
        fields = [
            'id', 'name', 'description', 'questions', 'sections', 'rating_criteria',
            'status', 'is_active', 'is_default', 'created_by', 'created_at', 'updated_at'
        ]


class FeedbackTemplateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackTemplate
        fields = [
            'name', 'description', 'questions', 'sections', 'rating_criteria',
            'status', 'is_active', 'is_default'
        ]


class FeedbackTemplateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackTemplate
        fields = [
            'name', 'description', 'questions', 'sections', 'rating_criteria',
            'status', 'is_active', 'is_default'
        ]