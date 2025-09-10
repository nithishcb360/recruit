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
from .models import DashboardStats, Task, ActivityLog, Department, Job, Candidate, JobApplication
from .serializers import (
    DashboardStatsSerializer, TaskSerializer, TaskCreateSerializer,
    ActivityLogSerializer, DashboardOverviewSerializer,
    DepartmentSerializer, JobSerializer, JobCreateSerializer, 
    JobUpdateSerializer, JobListSerializer, CandidateSerializer,
    CandidateCreateSerializer, CandidateListSerializer, ResumeParseSerializer,
    JobApplicationSerializer, JobApplicationCreateSerializer
)
from .utils.resume_parser import ResumeParser
import os
import tempfile
from django.http import HttpResponse, Http404
from django.core.files.storage import default_storage
import datetime


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
        
        # Parse the resume
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
            if name:
                name_parts = name.split()
                candidate_data['first_name'] = name_parts[0] if name_parts else ''
                candidate_data['last_name'] = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
            
            # Map experience data
            experience_data = candidate_data.get('experience', {})
            if isinstance(experience_data, dict):
                candidate_data['experience_years'] = experience_data.get('years')
            
            # Clean up data
            candidate_data.pop('name', None)
            candidate_data.pop('experience', None)
            candidate_data.pop('text', None)
            
            # Check for duplicates before creating
            email = candidate_data.get('email', '').strip()
            first_name = candidate_data.get('first_name', '').strip()
            last_name = candidate_data.get('last_name', '').strip()
            
            if email:
                existing_candidate = Candidate.objects.filter(email__iexact=email).first()
                if existing_candidate:
                    errors.append(f"Candidate {i+1}: Email '{email}' already exists")
                    continue
            
            if first_name and last_name:
                existing_candidate = Candidate.objects.filter(
                    first_name__iexact=first_name, 
                    last_name__iexact=last_name
                ).first()
                if existing_candidate:
                    errors.append(f"Candidate {i+1}: Name '{first_name} {last_name}' already exists")
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


@api_view(['GET'])
def view_resume(request, candidate_id):
    """
    Serve resume file for viewing/download
    """
    try:
        candidate = Candidate.objects.get(id=candidate_id)
        
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


@api_view(['POST'])
def update_candidate_experience(request):
    """
    Update experience years for candidates who have null experience_years
    """
    try:
        # Find candidates with null experience_years
        candidates_to_update = Candidate.objects.filter(experience_years__isnull=True)
        
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