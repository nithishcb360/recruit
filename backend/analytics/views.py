from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from django.db.models import Count, Avg, Q
from django.utils import timezone
from datetime import timedelta
from .models import RecruitmentMetrics, SourcePerformance
from .serializers import RecruitmentMetricsSerializer, SourcePerformanceSerializer, DashboardMetricsSerializer
from jobs.models import Job
from candidates.models import JobApplication, ApplicationActivity


@extend_schema(exclude=True)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_metrics(request):
    """Get dashboard metrics for the organization"""
    user = request.user
    
    if user.is_platform_admin:
        # Platform admin sees all metrics
        jobs = Job.objects.all()
        applications = JobApplication.objects.all()
    else:
        # Organization-specific metrics
        jobs = Job.objects.filter(organization=user.organization)
        applications = JobApplication.objects.filter(job__organization=user.organization)
    
    # Current metrics
    active_jobs = jobs.filter(status='open').count()
    total_candidates = applications.values('candidate').distinct().count()
    
    # Calculate time to fill (average days from posting to hire)
    hired_applications = applications.filter(stage='hired', job__posted_date__isnull=False)
    if hired_applications.exists():
        time_to_fill = sum([
            (app.stage_updated_at - app.job.posted_date).days 
            for app in hired_applications if app.job.posted_date
        ]) / hired_applications.count()
    else:
        time_to_fill = 0
    
    # Calculate offer acceptance rate
    offers_extended = applications.filter(stage='offer').count()
    offers_accepted = applications.filter(stage='hired').count()
    offer_rate = (offers_accepted / offers_extended * 100) if offers_extended > 0 else 0
    
    # Mock cost per hire (in real system, this would be calculated from actual costs)
    cost_per_hire = 3200
    
    # Calculate trends (comparison with previous period)
    # For demo purposes, using mock data
    active_jobs_change = 8.5
    time_to_fill_change = -12.3
    offer_rate_change = 5.2
    cost_per_hire_change = -8.1
    
    # Candidates by stage
    candidates_by_stage = {}
    stage_choices = ['applied', 'screening', 'phone_screen', 'technical', 'onsite', 'final', 'offer', 'hired']
    for stage in stage_choices:
        candidates_by_stage[stage] = applications.filter(stage=stage).count()
    
    # Recent activity counts
    today = timezone.now().date()
    interviews_today = 0  # Would need interview model integration
    offers_pending = applications.filter(stage='offer').count()
    new_applications = applications.filter(applied_at__date=today).count()
    
    data = {
        'active_jobs': active_jobs,
        'time_to_fill': round(time_to_fill, 1),
        'offer_rate': round(offer_rate, 1),
        'cost_per_hire': cost_per_hire,
        'active_jobs_change': active_jobs_change,
        'time_to_fill_change': time_to_fill_change,
        'offer_rate_change': offer_rate_change,
        'cost_per_hire_change': cost_per_hire_change,
        'total_candidates': total_candidates,
        'candidates_by_stage': candidates_by_stage,
        'interviews_today': interviews_today,
        'offers_pending': offers_pending,
        'new_applications': new_applications,
    }
    
    return Response(data)


@extend_schema(exclude=True)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def source_performance(request):
    """Get source performance metrics"""
    user = request.user
    
    if user.is_platform_admin:
        sources = SourcePerformance.objects.all()
    else:
        sources = SourcePerformance.objects.filter(organization=user.organization)
    
    # Get top 5 sources by conversion rate
    top_sources = sources.order_by('-offer_to_hire_rate')[:5]
    
    source_data = []
    for source in top_sources:
        conversion_rate = (source.hires_made / source.total_applications * 100) if source.total_applications > 0 else 0
        source_data.append({
            'id': source.id,
            'source_name': source.source_name,
            'total_applications': source.total_applications,
            'qualified_candidates': source.qualified_candidates,
            'hires_made': source.hires_made,
            'qualification_rate': source.qualification_rate,
            'cost_per_hire': float(source.cost_per_hire) if source.cost_per_hire else 0,
            'conversion_rate': round(conversion_rate, 1),
        })
    
    return Response({'results': source_data})


@extend_schema(exclude=True)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_activity(request):
    """Get recent activity for next actions"""
    user = request.user
    
    if user.is_platform_admin:
        applications = JobApplication.objects.all()
    else:
        applications = JobApplication.objects.filter(job__organization=user.organization)
    
    # Generate next actions based on application stages and timing
    activities = []
    
    # Applications needing feedback
    pending_feedback = applications.filter(
        stage__in=['technical', 'onsite', 'final'],
        stage_updated_at__lt=timezone.now() - timedelta(days=2)
    )[:5]
    
    for app in pending_feedback:
        activities.append({
            'id': f"feedback-{app.id}",
            'type': 'feedback',
            'title': 'Feedback overdue',
            'candidate': app.candidate.full_name,
            'job': app.job.title,
            'action': 'Submit',
            'priority': 'high',
            'created_at': app.stage_updated_at.isoformat(),
        })
    
    # Offers expiring soon
    pending_offers = applications.filter(
        stage='offer',
        stage_updated_at__lt=timezone.now() - timedelta(days=5)
    )[:3]
    
    for app in pending_offers:
        activities.append({
            'id': f"offer-{app.id}",
            'type': 'offer',
            'title': 'Offer expires soon',
            'candidate': app.candidate.full_name,
            'job': app.job.title,
            'action': 'Follow Up',
            'priority': 'critical',
            'created_at': app.stage_updated_at.isoformat(),
        })
    
    # Applications ready for next stage
    ready_to_advance = applications.filter(
        stage__in=['applied', 'screening'],
        stage_updated_at__lt=timezone.now() - timedelta(days=1)
    )[:4]
    
    for app in ready_to_advance:
        stage_name = 'Phone Screen' if app.stage == 'applied' else 'Technical Interview'
        activities.append({
            'id': f"schedule-{app.id}",
            'type': 'schedule',
            'title': f'Schedule {stage_name}',
            'candidate': app.candidate.full_name,
            'job': app.job.title,
            'action': 'Schedule',
            'priority': 'medium',
            'created_at': app.stage_updated_at.isoformat(),
        })
    
    # Sort by priority and limit
    priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
    activities.sort(key=lambda x: priority_order.get(x['priority'], 4))
    
    return Response({'results': activities[:10]})


@extend_schema(exclude=True)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def jobs_analytics(request):
    """Get analytics for active jobs"""
    user = request.user
    
    if user.is_platform_admin:
        jobs = Job.objects.all()
    else:
        jobs = Job.objects.filter(organization=user.organization)
    
    # Get active jobs with analytics
    active_jobs = jobs.filter(status='open').select_related('department')
    
    jobs_data = []
    for job in active_jobs:
        applications = job.applications.all()
        
        # Count candidates by stage
        candidates_by_stage = {}
        stage_choices = ['applied', 'screening', 'phone_screen', 'technical', 'onsite', 'final', 'offer', 'hired']
        for stage in stage_choices:
            candidates_by_stage[stage] = applications.filter(stage=stage).count()
        
        # Determine next action
        if applications.filter(stage='applied').exists():
            next_action = f"Review {applications.filter(stage='applied').count()} applications"
        elif applications.filter(stage='screening').exists():
            next_action = f"Schedule {applications.filter(stage='screening').count()} phone screens"
        elif applications.filter(stage__in=['technical', 'onsite', 'final']).exists():
            next_action = f"Conduct {applications.filter(stage__in=['technical', 'onsite', 'final']).count()} interviews"
        elif applications.filter(stage='offer').exists():
            next_action = f"Follow up on {applications.filter(stage='offer').count()} offers"
        else:
            next_action = "Post job to attract candidates"
        
        jobs_data.append({
            'id': job.id,
            'title': job.title,
            'department_name': job.department.name if job.department else 'No Department',
            'applications_count': applications.count(),
            'candidates_by_stage': candidates_by_stage,
            'days_open': job.days_open,
            'urgency': job.urgency,
            'next_action': next_action,
            'sla_days': job.sla_days,
            'is_overdue': job.is_overdue,
        })
    
    return Response({'results': jobs_data})


class RecruitmentMetricsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RecruitmentMetrics.objects.all()
    serializer_class = RecruitmentMetricsSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_platform_admin:
            return RecruitmentMetrics.objects.all()
        return RecruitmentMetrics.objects.filter(organization=user.organization)


class SourcePerformanceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SourcePerformance.objects.all()
    serializer_class = SourcePerformanceSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_platform_admin:
            return SourcePerformance.objects.all()
        return SourcePerformance.objects.filter(organization=user.organization)