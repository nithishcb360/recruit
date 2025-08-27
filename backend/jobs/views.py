from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
import io
try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
from .models import Department, Job
from .serializers import (
    DepartmentSerializer, JobSerializer, JobCreateSerializer, JobListSerializer
)
from .ai_service import ai_generator


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['organization']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_platform_admin:
            return Department.objects.all()
        return Department.objects.filter(organization=user.organization)
    
    def perform_create(self, serializer):
        if not self.request.user.is_platform_admin:
            serializer.save(organization=self.request.user.organization)
        else:
            serializer.save()


class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'department', 'job_type', 'experience_level', 'urgency']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return JobCreateSerializer
        elif self.action == 'list':
            return JobListSerializer
        return JobSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_platform_admin:
            queryset = Job.objects.all()
        else:
            queryset = Job.objects.filter(organization=user.organization)
        
        # Filter by search query
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        
        return queryset
    
    def perform_create(self, serializer):
        job = serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user
        )
        if job.status == 'open' and not job.posted_date:
            job.posted_date = timezone.now()
            job.save()
    
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        job = self.get_object()
        if job.status != 'draft':
            return Response(
                {'detail': 'Only draft jobs can be published'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        job.status = 'open'
        job.posted_date = timezone.now()
        job.save()
        
        return Response({'detail': 'Job published successfully'})
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        job = self.get_object()
        if job.status not in ['open', 'on_hold']:
            return Response(
                {'detail': 'Only open or on hold jobs can be closed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        job.status = 'closed'
        job.closed_date = timezone.now()
        job.save()
        
        return Response({'detail': 'Job closed successfully'})
    
    @action(detail=True, methods=['get'])
    def candidates(self, request, pk=None):
        job = self.get_object()
        applications = job.applications.select_related('candidate').all()
        
        # Group by stage
        candidates_by_stage = {}
        for app in applications:
            if app.stage not in candidates_by_stage:
                candidates_by_stage[app.stage] = []
            
            candidates_by_stage[app.stage].append({
                'id': app.candidate.id,
                'application_id': app.id,
                'name': app.candidate.full_name,
                'email': app.candidate.email,
                'rating': app.overall_rating,
                'applied_at': app.applied_at,
                'stage_updated_at': app.stage_updated_at
            })
        
        return Response(candidates_by_stage)
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        job = self.get_object()
        applications = job.applications.all()
        
        # Calculate metrics
        total_applications = applications.count()
        stages_count = {}
        for stage, _ in applications.model.STAGE_CHOICES:
            stages_count[stage] = applications.filter(stage=stage).count()
        
        # Time metrics
        hired_apps = applications.filter(stage='hired')
        if hired_apps.exists():
            time_to_hire = sum([
                (app.stage_updated_at - app.applied_at).days
                for app in hired_apps
            ]) / hired_apps.count()
        else:
            time_to_hire = 0
        
        analytics = {
            'total_applications': total_applications,
            'stages_count': stages_count,
            'conversion_rate': (hired_apps.count() / total_applications * 100) if total_applications > 0 else 0,
            'time_to_hire': time_to_hire,
            'days_open': job.days_open,
            'is_overdue': job.is_overdue
        }
        
        return Response(analytics)
    
    @action(detail=False, methods=['post'])
    def generate_jd(self, request):
        """Generate job description using OpenAI API"""
        title = request.data.get('title', '')
        department = request.data.get('department', '')
        level = request.data.get('level', 'mid')
        location = request.data.get('location', 'Remote')
        work_type = request.data.get('work_type', 'remote')
        company_info = request.data.get('company_info', '')
        
        if not title:
            return Response(
                {'detail': 'Job title is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Use AI service to generate job description
            generated_content = ai_generator.generate_job_description(
                title=title,
                department=department,
                level=level,
                location=location,
                work_type=work_type,
                company_info=company_info
            )
            
            return Response({
                'success': True,
                'data': generated_content,
                'ai_generated': True
            })
            
        except Exception as e:
            return Response(
                {'detail': f'Error generating job description: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def parse_jd(self, request):
        """Parse job description from uploaded file"""
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'detail': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            content = ""
            file_extension = file.name.split('.')[-1].lower()
            
            if file_extension == 'txt':
                content = file.read().decode('utf-8')
            
            elif file_extension == 'pdf':
                if not PDF_AVAILABLE:
                    return Response(
                        {'detail': 'PDF processing not available. Please upload .txt or .docx files'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
                for page in pdf_reader.pages:
                    content += page.extract_text() + "\n"
            
            elif file_extension in ['doc', 'docx']:
                if not DOCX_AVAILABLE:
                    return Response(
                        {'detail': 'DOCX processing not available. Please upload .txt or .pdf files'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                doc = Document(io.BytesIO(file.read()))
                for paragraph in doc.paragraphs:
                    content += paragraph.text + "\n"
            
            else:
                return Response(
                    {'detail': 'Unsupported file format. Please upload .txt, .pdf, or .docx files'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Basic parsing to extract sections
            description = content
            requirements = ""
            responsibilities = ""
            
            # Try to extract sections if they exist
            content_lower = content.lower()
            
            # Extract requirements section
            req_markers = ['requirements:', 'required:', 'qualifications:', 'must have:']
            for marker in req_markers:
                if marker in content_lower:
                    start_idx = content_lower.index(marker)
                    # Find next section or end
                    end_markers = ['responsibilities:', 'duties:', 'benefits:', 'about us:', 'how to apply:']
                    end_idx = len(content)
                    for end_marker in end_markers:
                        if end_marker in content_lower[start_idx:]:
                            end_idx = start_idx + content_lower[start_idx:].index(end_marker)
                            break
                    requirements = content[start_idx:end_idx].strip()
                    break
            
            # Extract responsibilities section
            resp_markers = ['responsibilities:', 'duties:', 'what you will do:', 'key responsibilities:']
            for marker in resp_markers:
                if marker in content_lower:
                    start_idx = content_lower.index(marker)
                    # Find next section or end
                    end_markers = ['requirements:', 'qualifications:', 'benefits:', 'about us:', 'how to apply:']
                    end_idx = len(content)
                    for end_marker in end_markers:
                        if end_marker in content_lower[start_idx:]:
                            end_idx = start_idx + content_lower[start_idx:].index(end_marker)
                            break
                    responsibilities = content[start_idx:end_idx].strip()
                    break
            
            return Response({
                'description': description.strip(),
                'requirements': requirements,
                'responsibilities': responsibilities,
                'raw_content': content
            })
            
        except Exception as e:
            return Response(
                {'detail': f'Error processing file: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )