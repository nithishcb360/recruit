from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from django_filters.rest_framework import DjangoFilterBackend
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import DashboardStats, Task, ActivityLog, Department, Job, Candidate, JobApplication, FeedbackTemplate
from .serializers import (
    DashboardStatsSerializer, TaskSerializer, TaskCreateSerializer,
    ActivityLogSerializer, DashboardOverviewSerializer,
    DepartmentSerializer, JobSerializer, JobCreateSerializer, 
    JobUpdateSerializer, JobListSerializer, CandidateSerializer,
    CandidateCreateSerializer, CandidateListSerializer, ResumeParseSerializer,
    JobApplicationSerializer, JobApplicationCreateSerializer,
    FeedbackTemplateSerializer, FeedbackTemplateCreateSerializer, FeedbackTemplateUpdateSerializer
)
from .utils.enhanced_resume_parser import EnhancedResumeParser
from .utils.resume_parser import ResumeParser
import logging

logger = logging.getLogger(__name__)

# Safe import for semantic matcher with fallback
try:
    from .utils.semantic_matcher import get_semantic_matcher
    SEMANTIC_MATCHING_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Semantic matching not available: {e}")
    SEMANTIC_MATCHING_AVAILABLE = False
    
    # Create a dummy function to prevent errors
    def get_semantic_matcher():
        class DummyMatcher:
            def calculate_job_match_score(self, candidate_data, job_data):
                return 0.0
            def find_best_matching_jobs(self, candidate_data, jobs, top_k=5):
                return []
            def find_matching_candidates(self, job_data, candidates, threshold=30.0):
                return []
        return DummyMatcher()
import os
import re
import tempfile
import logging
from django.http import HttpResponse, Http404
from django.core.files.storage import default_storage
import datetime

logger = logging.getLogger(__name__)


@api_view(['GET'])
def api_root(request):
    """
    API root endpoint
    """
    return Response({
        'message': 'Welcome to the Django REST API',
        'version': '1.0.0',
        'endpoints': {
            'admin': '/admin/',
            'api': '/api/',
            'dashboard': '/api/dashboard/',
            'tasks': '/api/tasks/',
            'activities': '/api/activities/',
            'departments': '/api/departments/',
            'jobs': '/api/jobs/',
        }
    })


@api_view(['GET'])
def dashboard_overview(request):
    """
    Dashboard overview endpoint with statistics and recent data
    """
    # Get or create dashboard stats
    stats, created = DashboardStats.objects.get_or_create(
        id=1,
        defaults={
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(last_login__gte=timezone.now() - timedelta(days=30)).count(),
            'total_revenue': 125600.50,
            'orders_today': 42,
        }
    )
    
    if not created:
        # Update stats
        stats.total_users = User.objects.count()
        stats.active_users = User.objects.filter(last_login__gte=timezone.now() - timedelta(days=30)).count()
        stats.save()

    # Get recent tasks
    recent_tasks = Task.objects.all()[:5]
    
    # Get recent activities
    recent_activities = ActivityLog.objects.all()[:10]
    
    # Get task counts by status
    task_status_counts = Task.objects.values('status').annotate(count=Count('status'))
    status_dict = {item['status']: item['count'] for item in task_status_counts}
    
    # Get task counts by priority
    priority_counts = Task.objects.values('priority').annotate(count=Count('priority'))
    priority_dict = {item['priority']: item['count'] for item in priority_counts}

    data = {
        'stats': DashboardStatsSerializer(stats).data,
        'recent_tasks': TaskSerializer(recent_tasks, many=True).data,
        'recent_activities': ActivityLogSerializer(recent_activities, many=True).data,
        'task_status_counts': status_dict,
        'priority_counts': priority_dict,
    }
    
    return Response(data)


@method_decorator(csrf_exempt, name='dispatch')
class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return TaskCreateSerializer
        return TaskSerializer

    @action(detail=False, methods=['get'])
    def by_status(self, request):
        status_param = request.query_params.get('status', None)
        if status_param:
            tasks = Task.objects.filter(status=status_param)
        else:
            tasks = Task.objects.all()
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        total_tasks = Task.objects.count()
        completed_tasks = Task.objects.filter(status='completed').count()
        pending_tasks = Task.objects.filter(status='pending').count()
        in_progress_tasks = Task.objects.filter(status='in_progress').count()
        
        return Response({
            'total': total_tasks,
            'completed': completed_tasks,
            'pending': pending_tasks,
            'in_progress': in_progress_tasks,
            'completion_rate': (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        })


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer

    @action(detail=False, methods=['get'])
    def recent(self, request):
        limit = int(request.query_params.get('limit', 20))
        activities = ActivityLog.objects.all()[:limit]
        serializer = self.get_serializer(activities, many=True)
        return Response(serializer.data)


@method_decorator(csrf_exempt, name='dispatch')
class DepartmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing departments
    """
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    
    @action(detail=True, methods=['get'])
    def jobs(self, request, pk=None):
        """Get all jobs for a specific department"""
        department = self.get_object()
        jobs = department.jobs.all()
        serializer = JobListSerializer(jobs, many=True)
        return Response(serializer.data)


@method_decorator(csrf_exempt, name='dispatch')
class JobViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing jobs with full CRUD operations
    """
    queryset = Job.objects.select_related('department', 'created_by').all()
    serializer_class = JobSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'department', 'job_type', 'experience_level', 'work_type', 'urgency']
    search_fields = ['title', 'description', 'requirements', 'location']
    ordering_fields = ['created_at', 'updated_at', 'title', 'status']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return JobCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return JobUpdateSerializer
        elif self.action == 'list':
            return JobListSerializer
        return JobSerializer
    
    def perform_create(self, serializer):
        """Set created_by when creating a job"""
        serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)

    def update(self, request, *args, **kwargs):
        """Custom update method with detailed error logging"""
        try:
            print(f"Job update request data: {request.data}")
            return super().update(request, *args, **kwargs)
        except Exception as e:
            print(f"Job update error: {str(e)}")
            print(f"Job update exception type: {type(e)}")
            if hasattr(e, 'detail'):
                print(f"Job update error detail: {e.detail}")
            raise

    def partial_update(self, request, *args, **kwargs):
        """Custom partial update method with detailed error logging"""
        try:
            print(f"Job partial update request data: {request.data}")
            instance = self.get_object()
            print(f"Job being updated: ID={instance.id}, Title={instance.title}")
            print(f"Current job data: salary_min={instance.salary_min}, salary_max={instance.salary_max}, openings={instance.openings}")

            serializer = self.get_serializer(instance, data=request.data, partial=True)
            if not serializer.is_valid():
                print(f"Job validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            self.perform_update(serializer)
            return Response(serializer.data)
        except Exception as e:
            print(f"Job partial update error: {str(e)}")
            print(f"Job partial update exception type: {type(e)}")
            if hasattr(e, 'detail'):
                print(f"Job partial update error detail: {e.detail}")
            raise
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active jobs"""
        active_jobs = self.queryset.filter(status='active')
        page = self.paginate_queryset(active_jobs)
        if page is not None:
            serializer = JobListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = JobListSerializer(active_jobs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def drafts(self, request):
        """Get all draft jobs"""
        draft_jobs = self.queryset.filter(status='draft')
        page = self.paginate_queryset(draft_jobs)
        if page is not None:
            serializer = JobListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = JobListSerializer(draft_jobs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a job (change status to active)"""
        job = self.get_object()
        if job.status != 'draft':
            return Response(
                {'error': 'Only draft jobs can be published'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        job.status = 'active'
        job.published_at = timezone.now()
        job.save()
        
        serializer = self.get_serializer(job)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Pause an active job"""
        job = self.get_object()
        if job.status != 'active':
            return Response(
                {'error': 'Only active jobs can be paused'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        job.status = 'paused'
        job.save()
        
        serializer = self.get_serializer(job)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close a job"""
        job = self.get_object()
        if job.status in ['closed', 'archived']:
            return Response(
                {'error': 'Job is already closed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        job.status = 'closed'
        job.closed_at = timezone.now()
        job.save()
        
        serializer = self.get_serializer(job)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get job statistics"""
        stats = {
            'total': self.queryset.count(),
            'active': self.queryset.filter(status='active').count(),
            'draft': self.queryset.filter(status='draft').count(),
            'paused': self.queryset.filter(status='paused').count(),
            'closed': self.queryset.filter(status='closed').count(),
        }
        
        # Add department breakdown
        department_stats = self.queryset.values('department__name').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Add urgency breakdown
        urgency_stats = self.queryset.values('urgency').annotate(
            count=Count('id')
        ).order_by('-count')
        
        stats['by_department'] = list(department_stats)
        stats['by_urgency'] = list(urgency_stats)
        
        return Response(stats)


class CandidateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing candidates with full CRUD operations
    """
    queryset = Candidate.objects.all()
    serializer_class = CandidateSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'experience_level', 'source']
    search_fields = ['first_name', 'last_name', 'email', 'current_company', 'skills']
    ordering_fields = ['created_at', 'updated_at', 'first_name', 'last_name']
    ordering = ['-created_at']

    def destroy(self, request, *args, **kwargs):
        """Delete a candidate"""
        return super().destroy(request, *args, **kwargs)

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return CandidateCreateSerializer
        elif self.action == 'list':
            return CandidateListSerializer
        return CandidateSerializer
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get candidate statistics"""
        stats = {
            'total': self.queryset.count(),
            'new': self.queryset.filter(status='new').count(),
            'screening': self.queryset.filter(status='screening').count(),
            'interviewing': self.queryset.filter(status='interviewing').count(),
            'offered': self.queryset.filter(status='offered').count(),
            'hired': self.queryset.filter(status='hired').count(),
            'rejected': self.queryset.filter(status='rejected').count(),
        }
        
        # Add experience level breakdown
        experience_stats = self.queryset.values('experience_level').annotate(
            count=Count('id')
        ).order_by('-count')
        
        stats['by_experience'] = list(experience_stats)
        
        return Response(stats)
    
    @action(detail=True, methods=['get'])
    def matching_jobs(self, request, pk=None):
        """
        Get semantically matching jobs for a specific candidate.
        Uses sentence-transformers all-MiniLM-L6-v2 for semantic similarity.
        """
        try:
            candidate = self.get_object()
            limit = int(request.query_params.get('limit', 10))
            min_score = float(request.query_params.get('min_score', 25.0))
            
            # Get active jobs
            active_jobs = Job.objects.select_related('department').filter(status='active')
            
            # Prepare candidate data
            candidate_data = {
                'id': candidate.id,
                'skills': candidate.skills or [],
                'current_position': candidate.current_position or '',
                'current_company': candidate.current_company or '',
                'experience_years': candidate.experience_years or 0,
                'education': candidate.education or []
            }
            
            # Prepare jobs data
            jobs_data = []
            for job in active_jobs:
                job_data = {
                    'id': job.id,
                    'title': job.title,
                    'description': job.description or '',
                    'requirements': job.requirements or '',
                    'experience_level': job.experience_level or '',
                    'department': {
                        'name': job.department.name if job.department else '',
                        'id': job.department.id if job.department else None
                    },
                    'job_type': job.job_type or '',
                    'work_type': getattr(job, 'work_type', ''),
                    'location': getattr(job, 'location', ''),
                    'salary_min': getattr(job, 'salary_min', None),
                    'salary_max': getattr(job, 'salary_max', None)
                }
                jobs_data.append(job_data)
            
            # Find matching jobs using semantic analysis
            matcher = get_semantic_matcher()
            job_matches = matcher.find_best_matching_jobs(candidate_data, jobs_data, top_k=limit)
            
            # Filter by minimum score and prepare response
            matching_jobs = []
            for job_data, score in job_matches:
                if score >= min_score:
                    matching_jobs.append({
                        'id': job_data['id'],
                        'title': job_data['title'],
                        'department': job_data['department']['name'],
                        'experience_level': job_data['experience_level'],
                        'job_type': job_data['job_type'],
                        'location': job_data.get('location', ''),
                        'salary_min': job_data.get('salary_min'),
                        'salary_max': job_data.get('salary_max'),
                        'match_score': score,
                        'match_level': 'high' if score >= 75 else 'medium' if score >= 50 else 'low'
                    })
            
            return Response({
                'candidate_id': candidate.id,
                'candidate_name': candidate.full_name,
                'matching_jobs': matching_jobs,
                'total_matches': len(matching_jobs),
                'algorithm': 'semantic_similarity_all_minilm_l6_v2'
            })
            
        except Exception as e:
            logger.error(f"Error in candidate matching jobs: {e}")
            return Response(
                {'error': f'Failed to find matching jobs: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@csrf_exempt
@api_view(['POST'])
def parse_resume(request):
    """
    Parse uploaded resume file and extract information
    """
    if 'file' not in request.FILES:
        return Response(
            {'error': 'No file provided'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    uploaded_file = request.FILES['file']
    
    # Check file extension
    if not uploaded_file.name.lower().endswith(('.pdf', '.docx', '.doc')):
        return Response(
            {'error': 'Only PDF and DOCX files are supported'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Save file temporarily for parsing
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(uploaded_file.name)[1]) as temp_file:
            for chunk in uploaded_file.chunks():
                temp_file.write(chunk)
            temp_file_path = temp_file.name
        
        # Parse the resume using comprehensive parser (lightweight, no ML dependencies)
        try:
            from .utils.simple_comprehensive_parser import SimpleComprehensiveParser
            parser = SimpleComprehensiveParser()
            parsed_data = parser.parse_resume(temp_file_path, uploaded_file.name)
            print(f"Using comprehensive parser for: {uploaded_file.name}")
        except Exception as e:
            print(f"Comprehensive parser error, falling back to enhanced parser: {e}")
            # Fallback to enhanced parser
            try:
                from .utils.enhanced_resume_parser import EnhancedResumeParser
                parser = EnhancedResumeParser()
                parsed_data = parser.parse_resume(temp_file_path, uploaded_file.name)
                print(f"Using enhanced parser for: {uploaded_file.name}")
            except Exception as e2:
                print(f"Enhanced parser error, falling back to basic parser: {e2}")
                # Final fallback to basic parser
                from .utils.resume_parser import ResumeParser
                parser = ResumeParser()
                parsed_data = parser.parse_resume(temp_file_path)
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        if 'error' in parsed_data:
            return Response(
                {'error': parsed_data['error']}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Store the uploaded file for future access
        import uuid
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        
        # Generate unique filename
        file_extension = os.path.splitext(uploaded_file.name)[1]
        unique_filename = f"resume_{uuid.uuid4().hex}{file_extension}"
        
        # Reset file pointer to beginning
        uploaded_file.seek(0)
        
        # Save file to media storage
        file_path = default_storage.save(f'resumes/{unique_filename}', ContentFile(uploaded_file.read()))
        file_url = default_storage.url(file_path)
        
        # Clean parsed data to remove null characters that cause serializer issues
        def clean_null_chars(obj):
            if isinstance(obj, str):
                return obj.replace('\x00', '').replace('\0', '')
            elif isinstance(obj, list):
                return [clean_null_chars(item) for item in obj]
            elif isinstance(obj, dict):
                return {key: clean_null_chars(value) for key, value in obj.items()}
            return obj

        parsed_data = clean_null_chars(parsed_data)

        # Add file information to parsed data
        parsed_data['resume_file_url'] = file_url
        parsed_data['resume_file_path'] = file_path
        parsed_data['original_filename'] = uploaded_file.name
        
        # Serialize the response
        serializer = ResumeParseSerializer(data=parsed_data)
        if serializer.is_valid():
            response_data = serializer.validated_data
            # Add file info to response
            response_data['resume_file_url'] = file_url
            response_data['resume_file_path'] = file_path
            response_data['original_filename'] = uploaded_file.name
            return Response(response_data)
        else:
            print(f"Serializer validation failed for {uploaded_file.name}: {serializer.errors}")
            print(f"Parsed data: {parsed_data}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response(
            {'error': f'Failed to parse resume: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt
@api_view(['POST'])
def bulk_create_candidates(request):
    """
    Create multiple candidates from parsed resume data
    """
    candidates_data = request.data.get('candidates', [])
    
    if not candidates_data:
        return Response(
            {'error': 'No candidate data provided'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    created_candidates = []
    errors = []
    
    for i, candidate_data in enumerate(candidates_data):
        try:
            # Parse name into first_name and last_name
            name = candidate_data.get('name', '').strip()
            original_filename = candidate_data.get('original_filename', '')

            if name:
                name_parts = name.split()
                candidate_data['first_name'] = name_parts[0] if name_parts else ''
                candidate_data['last_name'] = ' '.join(name_parts[1:]) if len(name_parts) > 1 else 'Unknown'
            else:
                # Try to extract name from filename as fallback
                if original_filename:
                    # Extract name from filename (e.g., "John_Doe_Resume.pdf" -> "John Doe")
                    filename_base = os.path.splitext(original_filename)[0]
                    # Remove common resume-related words and experience indicators
                    cleanup_words = ['_Resume', '_CV', '_react', '_React', '_months', '_Months', '_years', '_Years', '_yrs', '_experience', '_exp']
                    for word in cleanup_words:
                        filename_base = filename_base.replace(word, '')

                    # Remove numbers followed by time units (e.g., "_7Months", "_24months", "_3Years")
                    filename_base = re.sub(r'_\d+(?:months?|years?|yrs?|mos?)', '', filename_base, flags=re.IGNORECASE)
                    name_from_file = filename_base.replace('_', ' ').strip()

                    if name_from_file:
                        name_parts = name_from_file.split()
                        # Filter out tech terms that aren't names
                        name_parts = [part for part in name_parts if part.lower() not in ['react', 'python', 'java', 'js', 'node', 'angular', 'vue']]
                        candidate_data['first_name'] = name_parts[0] if name_parts else 'Unknown'
                        candidate_data['last_name'] = ' '.join(name_parts[1:]) if len(name_parts) > 1 else 'Candidate'
                    else:
                        candidate_data['first_name'] = 'Unknown'
                        candidate_data['last_name'] = 'Candidate'
                else:
                    candidate_data['first_name'] = 'Unknown'
                    candidate_data['last_name'] = 'Candidate'

            # Ensure we have valid first_name and last_name after parsing
            first_name = candidate_data.get('first_name', '').strip()
            last_name = candidate_data.get('last_name', '').strip()

            if not first_name:
                candidate_data['first_name'] = 'Unknown'
                first_name = 'Unknown'
            if not last_name:
                candidate_data['last_name'] = 'Candidate'
                last_name = 'Candidate'
            
            # Map experience data and ensure integer conversion
            experience_data = candidate_data.get('experience', {})
            experience_years = candidate_data.get('experience_years')
            if experience_years is not None:
                try:
                    # Convert to integer (round up for partial years)
                    candidate_data['experience_years'] = max(1, int(round(float(experience_years))))
                except (ValueError, TypeError):
                    candidate_data['experience_years'] = None
            if isinstance(experience_data, dict):
                candidate_data['experience_years'] = experience_data.get('years')
            
            # Extract and truncate current_position and current_company to prevent validation errors
            if 'current_position' in candidate_data and candidate_data['current_position']:
                current_position = str(candidate_data['current_position']).strip()
                if len(current_position) > 200:
                    candidate_data['current_position'] = current_position[:197] + '...'
                else:
                    candidate_data['current_position'] = current_position

            if 'current_company' in candidate_data and candidate_data['current_company']:
                current_company = str(candidate_data['current_company']).strip()
                if len(current_company) > 200:
                    candidate_data['current_company'] = current_company[:197] + '...'
                else:
                    candidate_data['current_company'] = current_company

            # Also truncate location if present
            if 'location' in candidate_data and candidate_data['location']:
                location = str(candidate_data['location']).strip()
                if len(location) > 200:
                    candidate_data['location'] = location[:197] + '...'
                else:
                    candidate_data['location'] = location
            
            # Clean up data
            candidate_data.pop('name', None)
            candidate_data.pop('experience', None)
            candidate_data.pop('text', None)
            
            # Check for duplicates before creating
            email = candidate_data.get('email', '').strip()
            first_name = candidate_data.get('first_name', '').strip()
            last_name = candidate_data.get('last_name', '').strip()

            
            # Handle empty email - convert to None for database storage
            if not email:
                candidate_data['email'] = None
            else:
                # Clean email - remove non-printable characters and extra whitespace
                email = ''.join(char for char in email if char.isprintable()).strip()
                candidate_data['email'] = email

                # Validate email format before proceeding
                from django.core.validators import validate_email
                from django.core.exceptions import ValidationError
                try:
                    validate_email(email)
                except ValidationError:
                    errors.append(f"Candidate {i+1}: Invalid email format '{email}'")
                    continue

                # Check for email duplicates only if email is provided
                existing_candidate = Candidate.objects.filter(email__iexact=email).first()
                if existing_candidate:
                    # Update existing candidate instead of rejecting
                    resume_file_path = candidate_data.get('resume_file_path')
                    serializer = CandidateCreateSerializer(existing_candidate, data=candidate_data, partial=True)
                    if serializer.is_valid():
                        candidate = serializer.save()
                        # Set resume file path after candidate update if available
                        if resume_file_path:
                            candidate.resume_file = resume_file_path
                            candidate.save()
                        created_candidates.append(candidate)
                        continue
                    else:
                        errors.append(f"Candidate {i+1}: Error updating existing candidate with email '{email}': {serializer.errors}")
                        continue

            # Check for name duplicates only if no email provided
            if not email and first_name and last_name:
                existing_candidate = Candidate.objects.filter(
                    first_name__iexact=first_name,
                    last_name__iexact=last_name
                ).first()
                if existing_candidate:
                    # Update existing candidate instead of rejecting
                    resume_file_path = candidate_data.get('resume_file_path')
                    serializer = CandidateCreateSerializer(existing_candidate, data=candidate_data, partial=True)
                    if serializer.is_valid():
                        candidate = serializer.save()
                        # Set resume file path after candidate update if available
                        if resume_file_path:
                            candidate.resume_file = resume_file_path
                            candidate.save()
                        created_candidates.append(candidate)
                        continue
                    else:
                        errors.append(f"Candidate {i+1}: Error updating existing candidate '{first_name} {last_name}': {serializer.errors}")
                        continue
            
            # Handle resume file path if present
            resume_file_path = candidate_data.get('resume_file_path')
            if resume_file_path:
                # Remove file-related fields from candidate_data as we'll set them after creation
                candidate_data.pop('resume_file_path', None)
                candidate_data.pop('resume_file_url', None)
                candidate_data.pop('original_filename', None)
            
            serializer = CandidateCreateSerializer(data=candidate_data)
            if serializer.is_valid():
                candidate = serializer.save()
                
                # Set resume file path after candidate creation if available
                if resume_file_path:
                    candidate.resume_file.name = resume_file_path
                    candidate.save(update_fields=['resume_file'])
                
                # Note: current_position should come directly from parsed resume data
                # No longer auto-generating job titles from skills and experience
                
                created_candidates.append(CandidateListSerializer(candidate).data)
            else:
                errors.append(f"Candidate {i+1}: {serializer.errors}")
                
        except Exception as e:
            errors.append(f"Candidate {i+1}: {str(e)}")
    
    return Response({
        'success': len(created_candidates),
        'failed': len(errors),
        'total': len(candidates_data),
        'candidates': created_candidates,
        'errors': errors
    })


@api_view(['GET', 'HEAD'])
def view_resume(request, candidate_id):
    """
    Serve resume file for viewing/download
    """
    try:
        candidate = Candidate.objects.get(id=candidate_id)
        
        # Handle HEAD request
        if request.method == 'HEAD':
            if not candidate.resume_file or not default_storage.exists(candidate.resume_file.name):
                return HttpResponse(status=404)
            else:
                response = HttpResponse(status=200)
                # Set content type for HEAD request
                file_name = candidate.resume_file.name.lower()
                if file_name.endswith('.pdf'):
                    response['Content-Type'] = 'application/pdf'
                elif file_name.endswith('.docx'):
                    response['Content-Type'] = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                elif file_name.endswith('.doc'):
                    response['Content-Type'] = 'application/msword'
                return response
        
        if not candidate.resume_file:
            # Return HTML page for better user experience
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Resume Not Available</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 50px; text-align: center; }}
                    .container {{ max-width: 500px; margin: 0 auto; }}
                    h1 {{ color: #666; }}
                    .message {{ background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Resume Not Available</h1>
                    <div class="message">
                        <p>No resume file has been uploaded for <strong>{candidate.first_name} {candidate.last_name}</strong>.</p>
                        <p>Only extracted text may be available in the candidate profile.</p>
                    </div>
                    <p><a href="javascript:window.close()">Close this tab</a></p>
                </div>
            </body>
            </html>
            """
            return HttpResponse(html_content, content_type='text/html')
        
        # Check if file exists in storage
        if not default_storage.exists(candidate.resume_file.name):
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Resume File Missing</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 50px; text-align: center; }}
                    .container {{ max-width: 500px; margin: 0 auto; }}
                    h1 {{ color: #666; }}
                    .message {{ background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeaa7; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Resume File Missing</h1>
                    <div class="message">
                        <p>The resume file for <strong>{candidate.first_name} {candidate.last_name}</strong> could not be found in storage.</p>
                        <p>The file may have been moved or deleted. Please contact support if this persists.</p>
                    </div>
                    <p><a href="javascript:window.close()">Close this tab</a></p>
                </div>
            </body>
            </html>
            """
            return HttpResponse(html_content, content_type='text/html')
        
        # Get file content
        file_content = default_storage.open(candidate.resume_file.name).read()
        
        # Determine content type
        file_name = candidate.resume_file.name.lower()
        if file_name.endswith('.pdf'):
            content_type = 'application/pdf'
        elif file_name.endswith('.docx'):
            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        elif file_name.endswith('.doc'):
            content_type = 'application/msword'
        else:
            content_type = 'application/octet-stream'
        
        # Create response with file content
        response = HttpResponse(file_content, content_type=content_type)
        
        # Set filename for download
        original_name = os.path.basename(candidate.resume_file.name)
        candidate_name = f"{candidate.first_name}_{candidate.last_name}".replace(' ', '_')
        filename = f"{candidate_name}_resume{os.path.splitext(original_name)[1]}"
        
        # Add headers for inline viewing (not download)
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        
        return response
        
    except Candidate.DoesNotExist:
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Candidate Not Found</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 50px; text-align: center; }
                .container { max-width: 500px; margin: 0 auto; }
                h1 { color: #d63031; }
                .message { background: #ffe0e0; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #ff7675; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Candidate Not Found</h1>
                <div class="message">
                    <p>The requested candidate could not be found.</p>
                </div>
                <p><a href="javascript:window.close()">Close this tab</a></p>
            </div>
        </body>
        </html>
        """
        return HttpResponse(html_content, content_type='text/html')
    except Exception as e:
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Error Loading Resume</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 50px; text-align: center; }}
                .container {{ max-width: 500px; margin: 0 auto; }}
                h1 {{ color: #d63031; }}
                .message {{ background: #ffe0e0; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #ff7675; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Error Loading Resume</h1>
                <div class="message">
                    <p>An error occurred while trying to load the resume:</p>
                    <p><em>{str(e)}</em></p>
                </div>
                <p><a href="javascript:window.close()">Close this tab</a></p>
            </div>
        </body>
        </html>
        """
        return HttpResponse(html_content, content_type='text/html')


def generate_job_title_for_candidate(candidate):
    """
    DEPRECATED: Generate a job title for a single candidate based on their skills and experience
    This function is no longer used as job titles now come directly from parsed resume data.
    """
    if not candidate.skills:
        return None
    
    # Skill-based job title mapping (same as in API endpoint)
    skill_to_job_mapping = {
        # Frontend Development
        'react': 'Frontend Developer',
        'angular': 'Frontend Developer', 
        'vue': 'Frontend Developer',
        'html': 'Frontend Developer',
        'css': 'Frontend Developer',
        'javascript': 'Frontend Developer',
        'typescript': 'Frontend Developer',
        
        # Backend Development
        'python': 'Backend Developer',
        'java': 'Backend Developer',
        'node.js': 'Backend Developer',
        'php': 'Backend Developer',
        'c#': 'Backend Developer',
        'go': 'Backend Developer',
        'ruby': 'Backend Developer',
        'express': 'Backend Developer',
        'django': 'Backend Developer',
        'flask': 'Backend Developer',
        'spring': 'Backend Developer',
        
        # Full Stack
        'full stack': 'Full Stack Developer',
        'fullstack': 'Full Stack Developer',
        
        # Mobile Development
        'ios': 'Mobile Developer',
        'android': 'Mobile Developer',
        'react native': 'Mobile Developer',
        'flutter': 'Mobile Developer',
        'swift': 'iOS Developer',
        'kotlin': 'Android Developer',
        
        # DevOps/Cloud
        'aws': 'Cloud Engineer',
        'azure': 'Cloud Engineer',
        'docker': 'DevOps Engineer',
        'kubernetes': 'DevOps Engineer',
        'jenkins': 'DevOps Engineer',
        'terraform': 'DevOps Engineer',
        'ci/cd': 'DevOps Engineer',
        
        # Data Science/Analytics
        'machine learning': 'Data Scientist',
        'data science': 'Data Scientist',
        'pandas': 'Data Analyst',
        'numpy': 'Data Analyst',
        'tensorflow': 'Machine Learning Engineer',
        'pytorch': 'Machine Learning Engineer',
        'tableau': 'Data Analyst',
        'power bi': 'Business Analyst',
        
        # Database/Data
        'sql': 'Database Developer',
        'mysql': 'Database Developer',
        'postgresql': 'Database Developer',
        'mongodb': 'Database Developer',
        'oracle': 'Database Administrator',
        
        # Quality Assurance
        'qa': 'QA Engineer',
        'testing': 'QA Engineer',
        'selenium': 'Test Automation Engineer',
        
        # UI/UX
        'ui': 'UI Designer',
        'ux': 'UX Designer',
        'figma': 'UI/UX Designer',
        'adobe': 'Graphic Designer',
        
        # Security
        'security': 'Security Engineer',
        'cybersecurity': 'Security Analyst',
        
        # General
        'project management': 'Project Manager',
        'agile': 'Scrum Master',
        'scrum': 'Scrum Master',
    }
    
    # Experience level mapping
    experience_prefixes = {
        0: '', 1: 'Junior ', 2: 'Junior ', 3: '', 4: '',
        5: 'Senior ', 6: 'Senior ', 7: 'Senior ', 8: 'Lead ',
        9: 'Lead ', 10: 'Principal '
    }
    
    # Convert skills to lowercase for matching
    candidate_skills = [skill.lower() for skill in candidate.skills]
    
    # Score different job titles based on skills
    job_scores = {}
    
    for skill in candidate_skills:
        for skill_keyword, job_title in skill_to_job_mapping.items():
            if skill_keyword in skill:
                if job_title not in job_scores:
                    job_scores[job_title] = 0
                job_scores[job_title] += 1
    
    # Special logic for full stack detection
    has_frontend = any(skill in candidate_skills for skill in ['react', 'angular', 'vue', 'html', 'css', 'javascript'])
    has_backend = any(skill in candidate_skills for skill in ['python', 'java', 'node.js', 'php', 'django', 'flask', 'spring'])
    
    if has_frontend and has_backend:
        job_scores['Full Stack Developer'] = job_scores.get('Full Stack Developer', 0) + 5
    
    # Get the best matching job title
    if job_scores:
        best_job_title = max(job_scores.keys(), key=lambda k: job_scores[k])
        
        # Add experience level prefix
        experience_years = candidate.experience_years or 0
        experience_years = min(experience_years, 10)  # Cap at 10 for mapping
        
        prefix = experience_prefixes.get(experience_years, '')
        return f"{prefix}{best_job_title}".strip()
    
    return None


@api_view(['POST'])
def generate_job_titles(request):
    """
    DEPRECATED: Generate job titles for candidates based on their skills and experience
    This endpoint is deprecated as job titles now come directly from parsed resume data.
    """
    try:
        # Skill-based job title mapping
        skill_to_job_mapping = {
            # Frontend Development
            'react': 'Frontend Developer',
            'angular': 'Frontend Developer', 
            'vue': 'Frontend Developer',
            'html': 'Frontend Developer',
            'css': 'Frontend Developer',
            'javascript': 'Frontend Developer',
            'typescript': 'Frontend Developer',
            
            # Backend Development
            'python': 'Backend Developer',
            'java': 'Backend Developer',
            'node.js': 'Backend Developer',
            'php': 'Backend Developer',
            'c#': 'Backend Developer',
            'go': 'Backend Developer',
            'ruby': 'Backend Developer',
            'express': 'Backend Developer',
            'django': 'Backend Developer',
            'flask': 'Backend Developer',
            'spring': 'Backend Developer',
            
            # Full Stack
            'full stack': 'Full Stack Developer',
            'fullstack': 'Full Stack Developer',
            
            # Mobile Development
            'ios': 'Mobile Developer',
            'android': 'Mobile Developer',
            'react native': 'Mobile Developer',
            'flutter': 'Mobile Developer',
            'swift': 'iOS Developer',
            'kotlin': 'Android Developer',
            
            # DevOps/Cloud
            'aws': 'Cloud Engineer',
            'azure': 'Cloud Engineer',
            'docker': 'DevOps Engineer',
            'kubernetes': 'DevOps Engineer',
            'jenkins': 'DevOps Engineer',
            'terraform': 'DevOps Engineer',
            'ci/cd': 'DevOps Engineer',
            
            # Data Science/Analytics
            'machine learning': 'Data Scientist',
            'data science': 'Data Scientist',
            'pandas': 'Data Analyst',
            'numpy': 'Data Analyst',
            'tensorflow': 'Machine Learning Engineer',
            'pytorch': 'Machine Learning Engineer',
            'tableau': 'Data Analyst',
            'power bi': 'Business Analyst',
            
            # Database/Data
            'sql': 'Database Developer',
            'mysql': 'Database Developer',
            'postgresql': 'Database Developer',
            'mongodb': 'Database Developer',
            'oracle': 'Database Administrator',
            
            # Quality Assurance
            'qa': 'QA Engineer',
            'testing': 'QA Engineer',
            'selenium': 'Test Automation Engineer',
            
            # UI/UX
            'ui': 'UI Designer',
            'ux': 'UX Designer',
            'figma': 'UI/UX Designer',
            'adobe': 'Graphic Designer',
            
            # Security
            'security': 'Security Engineer',
            'cybersecurity': 'Security Analyst',
            
            # General
            'project management': 'Project Manager',
            'agile': 'Scrum Master',
            'scrum': 'Scrum Master',
        }
        
        # Experience level mapping
        experience_prefixes = {
            0: '',
            1: 'Junior ',
            2: 'Junior ',
            3: '',
            4: '',
            5: 'Senior ',
            6: 'Senior ',
            7: 'Senior ',
            8: 'Lead ',
            9: 'Lead ',
            10: 'Principal '
        }
        
        # Find candidates with missing job titles
        candidates_to_update = Candidate.objects.filter(
            current_position__in=['', None]
        ).exclude(skills__exact=[])
        
        updated_candidates = []
        
        for candidate in candidates_to_update:
            if not candidate.skills:
                continue
                
            # Convert skills to lowercase for matching
            candidate_skills = [skill.lower() for skill in candidate.skills]
            
            # Score different job titles based on skills
            job_scores = {}
            
            for skill in candidate_skills:
                for skill_keyword, job_title in skill_to_job_mapping.items():
                    if skill_keyword in skill:
                        if job_title not in job_scores:
                            job_scores[job_title] = 0
                        job_scores[job_title] += 1
            
            # Special logic for full stack detection
            has_frontend = any(skill in candidate_skills for skill in ['react', 'angular', 'vue', 'html', 'css', 'javascript'])
            has_backend = any(skill in candidate_skills for skill in ['python', 'java', 'node.js', 'php', 'django', 'flask', 'spring'])
            
            if has_frontend and has_backend:
                job_scores['Full Stack Developer'] = job_scores.get('Full Stack Developer', 0) + 5
            
            # Get the best matching job title
            if job_scores:
                best_job_title = max(job_scores.keys(), key=lambda k: job_scores[k])
                
                # Add experience level prefix
                experience_years = candidate.experience_years or 0
                experience_years = min(experience_years, 10)  # Cap at 10 for mapping
                
                prefix = experience_prefixes.get(experience_years, '')
                final_job_title = f"{prefix}{best_job_title}".strip()
                
                # Update candidate
                candidate.current_position = final_job_title
                candidate.save(update_fields=['current_position'])
                
                updated_candidates.append({
                    'id': candidate.id,
                    'name': candidate.full_name,
                    'generated_title': final_job_title,
                    'skills': candidate.skills,
                    'experience_years': candidate.experience_years
                })
        
        return Response({
            'message': f'Generated job titles for {len(updated_candidates)} candidates',
            'updated_candidates': updated_candidates,
            'total_processed': candidates_to_update.count()
        })
        
    except Exception as e:
        return Response(
            {'error': f'Error generating job titles: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def update_candidate_experience(request):
    """
    Update experience years for candidates who have null experience_years
    """
    try:
        # Find candidates with null experience_years
        candidates_to_update = Candidate.objects.filter(experience_years__isnull=True)
        
        parser = EnhancedResumeParser()
        parser = ResumeParser()
        updated_count = 0
        current_year = datetime.datetime.now().year
        
        for candidate in candidates_to_update:
            experience_years = None
            
            # Try to estimate from education data if available
            if candidate.education:
                for edu_item in candidate.education:
                    if isinstance(edu_item, str):
                        # Look for graduation year patterns
                        import re
                        year_matches = re.findall(r'(\d{4})', edu_item)
                        for year_str in year_matches:
                            year = int(year_str)
                            if 1990 <= year <= current_year:
                                # Estimate experience from graduation year
                                estimated_years = max(0, current_year - year - 1)
                                if estimated_years <= 40:  # Reasonable cap
                                    experience_years = max(experience_years or 0, estimated_years)
            
            # If we found a reasonable experience estimate, update the candidate
            if experience_years and experience_years > 0:
                candidate.experience_years = experience_years
                candidate.save(update_fields=['experience_years'])
                updated_count += 1
        
        return Response({
            'message': f'Updated experience for {updated_count} candidates',
            'total_checked': candidates_to_update.count(),
            'updated': updated_count
        })
        
    except Exception as e:
        return Response(
            {'error': f'Error updating candidate experience: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@method_decorator(csrf_exempt, name='dispatch')
class JobApplicationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing job applications
    """
    queryset = JobApplication.objects.all()
    serializer_class = JobApplicationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'job', 'candidate']
    search_fields = ['candidate__first_name', 'candidate__last_name', 'candidate__email']
    ordering_fields = ['applied_at', 'updated_at']
    ordering = ['-applied_at']

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return JobApplicationCreateSerializer
        return JobApplicationSerializer

    @action(detail=True, methods=['post'])
    def advance(self, request, pk=None):
        """Advance application to next stage"""
        application = self.get_object()
        
        # Define stage progression
        stage_progression = {
            'applied': 'screening',
            'screening': 'interviewing', 
            'interviewing': 'offered',
            'offered': 'hired'
        }
        
        if application.status in stage_progression:
            application.status = stage_progression[application.status]
            application.save()
            
            serializer = self.get_serializer(application)
            return Response(serializer.data)
        else:
            return Response(
                {'error': f'Cannot advance from status: {application.status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an application"""
        application = self.get_object()
        
        reason = request.data.get('reason', '')
        application.status = 'rejected'
        if reason:
            application.notes = f"{application.notes}\n\nRejected: {reason}".strip()
        application.save()
        
        serializer = self.get_serializer(application)
        return Response(serializer.data)


@method_decorator(csrf_exempt, name='dispatch')
class FeedbackTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing feedback templates
    """
    queryset = FeedbackTemplate.objects.all()
    serializer_class = FeedbackTemplateSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'is_active', 'is_default']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return FeedbackTemplateCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return FeedbackTemplateUpdateSerializer
        return FeedbackTemplateSerializer

    def perform_create(self, serializer):
        """Set the created_by field when creating a new template"""
        serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)

    def create(self, request, *args, **kwargs):
        """Override create to return full object after creation"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return full object using the main serializer
        instance = serializer.instance
        response_serializer = FeedbackTemplateSerializer(instance)
        headers = self.get_success_headers(serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Override update to return full object after update"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Return full object using the main serializer
        response_serializer = FeedbackTemplateSerializer(instance)
        return Response(response_serializer.data)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a feedback template"""
        template = self.get_object()
        template.status = 'published'
        template.save()
        
        serializer = self.get_serializer(template)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        """Unpublish a feedback template (set to draft)"""
        template = self.get_object()
        template.status = 'draft'
        template.save()
        
        serializer = self.get_serializer(template)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive a feedback template"""
        template = self.get_object()
        template.status = 'archived'
        template.is_active = False
        template.save()
        
        serializer = self.get_serializer(template)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Create a duplicate of a feedback template"""
        original_template = self.get_object()
        
        # Create a copy
        template_data = {
            'name': f"{original_template.name} (Copy)",
            'description': original_template.description,
            'questions': original_template.questions,
            'sections': original_template.sections,
            'rating_criteria': original_template.rating_criteria,
            'status': 'draft',
            'is_active': True,
            'is_default': False
        }
        
        serializer = FeedbackTemplateCreateSerializer(data=template_data)
        if serializer.is_valid():
            new_template = serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)
            response_serializer = self.get_serializer(new_template)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def calculate_job_match(request):
    """
    Calculate semantic job match score between a candidate and a job.
    
    Expected POST data:
    {
        "candidate_id": int,
        "job_id": int
    }
    """
    try:
        candidate_id = request.data.get('candidate_id')
        job_id = request.data.get('job_id')
        
        if not candidate_id or not job_id:
            return Response(
                {'error': 'Both candidate_id and job_id are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get candidate and job objects
        try:
            candidate = Candidate.objects.get(id=candidate_id)
            job = Job.objects.select_related('department').get(id=job_id)
        except (Candidate.DoesNotExist, Job.DoesNotExist) as e:
            return Response(
                {'error': f'Object not found: {str(e)}'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prepare candidate data for matching
        candidate_data = {
            'id': candidate.id,
            'skills': candidate.skills or [],
            'current_position': candidate.current_position or '',
            'current_company': candidate.current_company or '',
            'experience_years': candidate.experience_years or 0,
            'education': candidate.education or []
        }
        
        # Prepare job data for matching
        job_data = {
            'id': job.id,
            'title': job.title,
            'description': job.description or '',
            'requirements': job.requirements or '',
            'experience_level': job.experience_level or '',
            'department': {
                'name': job.department.name if job.department else '',
                'id': job.department.id if job.department else None
            },
            'job_type': job.job_type or '',
            'work_type': getattr(job, 'work_type', '')
        }
        
        # Calculate semantic match score
        matcher = get_semantic_matcher()
        match_score = matcher.calculate_job_match_score(candidate_data, job_data)
        
        return Response({
            'candidate_id': candidate_id,
            'job_id': job_id,
            'match_score': match_score,
            'match_level': 'high' if match_score >= 75 else 'medium' if match_score >= 50 else 'low',
            'candidate_name': candidate.full_name,
            'job_title': job.title
        })
        
    except Exception as e:
        logger.error(f"Error calculating job match: {e}")
        return Response(
            {'error': f'Failed to calculate job match: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def find_matching_jobs(request, candidate_id):
    """
    Find best matching jobs for a specific candidate using semantic analysis.
    
    Query parameters:
    - limit: Number of top matches to return (default: 5)
    - min_score: Minimum match score threshold (default: 20.0)
    """
    try:
        limit = int(request.GET.get('limit', 5))
        min_score = float(request.GET.get('min_score', 20.0))
        
        # Get candidate
        try:
            candidate = Candidate.objects.get(id=candidate_id)
        except Candidate.DoesNotExist:
            return Response(
                {'error': 'Candidate not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all active jobs
        active_jobs = Job.objects.select_related('department').filter(status='active')
        
        # Prepare candidate data
        candidate_data = {
            'id': candidate.id,
            'skills': candidate.skills or [],
            'current_position': candidate.current_position or '',
            'current_company': candidate.current_company or '',
            'experience_years': candidate.experience_years or 0,
            'education': candidate.education or []
        }
        
        # Prepare jobs data
        jobs_data = []
        for job in active_jobs:
            job_data = {
                'id': job.id,
                'title': job.title,
                'description': job.description or '',
                'requirements': job.requirements or '',
                'experience_level': job.experience_level or '',
                'department': {
                    'name': job.department.name if job.department else '',
                    'id': job.department.id if job.department else None
                },
                'job_type': job.job_type or '',
                'work_type': getattr(job, 'work_type', ''),
                'location': getattr(job, 'location', ''),
                'salary_min': getattr(job, 'salary_min', None),
                'salary_max': getattr(job, 'salary_max', None)
            }
            jobs_data.append(job_data)
        
        # Find matching jobs
        matcher = get_semantic_matcher()
        job_matches = matcher.find_best_matching_jobs(candidate_data, jobs_data, top_k=limit)
        
        # Filter by minimum score and prepare response
        matching_jobs = []
        for job_data, score in job_matches:
            if score >= min_score:
                matching_jobs.append({
                    'job': {
                        'id': job_data['id'],
                        'title': job_data['title'],
                        'department': job_data['department']['name'],
                        'experience_level': job_data['experience_level'],
                        'job_type': job_data['job_type'],
                        'location': job_data.get('location', ''),
                        'salary_min': job_data.get('salary_min'),
                        'salary_max': job_data.get('salary_max')
                    },
                    'match_score': score,
                    'match_level': 'high' if score >= 75 else 'medium' if score >= 50 else 'low'
                })
        
        return Response({
            'candidate_id': candidate_id,
            'candidate_name': candidate.full_name,
            'matching_jobs': matching_jobs,
            'total_matches': len(matching_jobs),
            'total_jobs_analyzed': len(jobs_data)
        })
        
    except Exception as e:
        logger.error(f"Error finding matching jobs: {e}")
        return Response(
            {'error': f'Failed to find matching jobs: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def find_matching_candidates(request, job_id):
    """
    Find candidates that match a specific job using semantic analysis.
    
    Query parameters:
    - limit: Maximum number of candidates to return (default: 20)
    - min_score: Minimum match score threshold (default: 30.0)
    """
    try:
        limit = int(request.GET.get('limit', 20))
        min_score = float(request.GET.get('min_score', 30.0))
        
        # Get job
        try:
            job = Job.objects.select_related('department').get(id=job_id)
        except Job.DoesNotExist:
            return Response(
                {'error': 'Job not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all candidates
        candidates = Candidate.objects.all()
        
        # Prepare job data
        job_data = {
            'id': job.id,
            'title': job.title,
            'description': job.description or '',
            'requirements': job.requirements or '',
            'experience_level': job.experience_level or '',
            'department': {
                'name': job.department.name if job.department else '',
                'id': job.department.id if job.department else None
            },
            'job_type': job.job_type or '',
            'work_type': getattr(job, 'work_type', '')
        }
        
        # Prepare candidates data
        candidates_data = []
        for candidate in candidates:
            candidate_data = {
                'id': candidate.id,
                'skills': candidate.skills or [],
                'current_position': candidate.current_position or '',
                'current_company': candidate.current_company or '',
                'experience_years': candidate.experience_years or 0,
                'education': candidate.education or [],
                'email': candidate.email,
                'phone': candidate.phone_number or '',
                'status': candidate.status
            }
            candidates_data.append(candidate_data)
        
        # Find matching candidates
        matcher = get_semantic_matcher()
        candidate_matches = matcher.find_matching_candidates(job_data, candidates_data, threshold=min_score)
        
        # Limit results and prepare response
        matching_candidates = []
        for candidate_data, score in candidate_matches[:limit]:
            matching_candidates.append({
                'candidate': {
                    'id': candidate_data['id'],
                    'name': f"{candidates.get(id=candidate_data['id']).first_name} {candidates.get(id=candidate_data['id']).last_name}",
                    'email': candidate_data['email'],
                    'current_position': candidate_data['current_position'],
                    'current_company': candidate_data['current_company'],
                    'experience_years': candidate_data['experience_years'],
                    'skills': candidate_data['skills'][:10] if candidate_data['skills'] else [],  # Limit skills for response
                    'status': candidate_data['status']
                },
                'match_score': score,
                'match_level': 'high' if score >= 75 else 'medium' if score >= 50 else 'low'
            })
        
        return Response({
            'job_id': job_id,
            'job_title': job.title,
            'matching_candidates': matching_candidates,
            'total_matches': len(matching_candidates),
            'total_candidates_analyzed': len(candidates_data)
        })
        
    except Exception as e:
        logger.error(f"Error finding matching candidates: {e}")
        return Response(
            {'error': f'Failed to find matching candidates: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )