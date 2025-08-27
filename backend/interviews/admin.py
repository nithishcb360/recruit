from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import Interview, InterviewFeedback, FeedbackTemplate


class InterviewFeedbackInline(admin.TabularInline):
    model = InterviewFeedback
    extra = 0
    readonly_fields = ['submitted_at', 'updated_at']
    fields = ['interviewer', 'recommendation', 'overall_rating', 'is_submitted', 'submitted_at']


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = ['candidate_name', 'job_title', 'interview_type', 'scheduled_at', 'status', 'lead_interviewer', 'feedback_count']
    list_filter = ['interview_type', 'status', 'scheduled_at', 'application__job__organization']
    search_fields = ['application__candidate__first_name', 'application__candidate__last_name', 'application__job__title']
    # raw_id_fields = ['application', 'lead_interviewer', 'created_by']  # Removed for better UX
    autocomplete_fields = ['application', 'lead_interviewer', 'created_by']  # Better than raw_id
    filter_horizontal = ['interviewers']
    readonly_fields = ['confirmed_at', 'completed_at', 'cancelled_at', 'created_at', 'updated_at']
    date_hierarchy = 'scheduled_at'
    inlines = [InterviewFeedbackInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('application', 'interview_type', 'round_number', 'status')
        }),
        ('Schedule', {
            'fields': ('scheduled_at', 'duration_minutes', 'location', 'meeting_link')
        }),
        ('Interviewers', {
            'fields': ('lead_interviewer', 'interviewers')
        }),
        ('Instructions & Materials', {
            'fields': ('instructions', 'preparation_materials'),
            'classes': ('collapse',)
        }),
        ('Status Updates', {
            'fields': ('confirmed_at', 'completed_at', 'cancelled_at', 'cancellation_reason'),
            'classes': ('collapse',)
        }),
        ('Tracking', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def candidate_name(self, obj):
        return obj.application.candidate.full_name
    candidate_name.short_description = 'Candidate'
    candidate_name.admin_order_field = 'application__candidate__first_name'
    
    def job_title(self, obj):
        return obj.application.job.title
    job_title.short_description = 'Job'
    job_title.admin_order_field = 'application__job__title'
    
    def feedback_count(self, obj):
        count = obj.feedbacks.filter(is_submitted=True).count()
        total = obj.interviewers.count()
        if count > 0:
            url = reverse('admin:interviews_interviewfeedback_changelist') + f'?interview__id={obj.id}'
            return format_html('<a href="{}">{}/{} submitted</a>', url, count, total)
        return f'0/{total} submitted'
    feedback_count.short_description = 'Feedback'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related('application__candidate', 'application__job', 'lead_interviewer')
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'organization'):
            return qs.filter(application__job__organization=request.user.organization)
        return qs.none()
    
    actions = ['mark_as_completed', 'cancel_interviews', 'confirm_interviews']
    
    def mark_as_completed(self, request, queryset):
        now = timezone.now()
        updated = queryset.filter(status__in=['scheduled', 'confirmed', 'in_progress']).update(
            status='completed',
            completed_at=now
        )
        self.message_user(request, f'{updated} interviews marked as completed.')
    mark_as_completed.short_description = 'Mark as completed'
    
    def cancel_interviews(self, request, queryset):
        now = timezone.now()
        updated = queryset.filter(status__in=['scheduled', 'confirmed']).update(
            status='cancelled',
            cancelled_at=now
        )
        self.message_user(request, f'{updated} interviews cancelled.')
    cancel_interviews.short_description = 'Cancel interviews'
    
    def confirm_interviews(self, request, queryset):
        now = timezone.now()
        updated = queryset.filter(status='scheduled').update(
            status='confirmed',
            confirmed_at=now
        )
        self.message_user(request, f'{updated} interviews confirmed.')
    confirm_interviews.short_description = 'Confirm interviews'


@admin.register(InterviewFeedback)
class InterviewFeedbackAdmin(admin.ModelAdmin):
    list_display = ['interview_info', 'interviewer', 'recommendation', 'overall_rating_display', 'is_submitted', 'submitted_at']
    list_filter = ['recommendation', 'overall_rating', 'is_submitted', 'interview__interview_type', 'submitted_at']
    search_fields = ['interview__application__candidate__first_name', 'interview__application__candidate__last_name', 'interviewer__first_name', 'interviewer__last_name']
    # raw_id_fields = ['interview', 'interviewer']  # Removed for better UX
    autocomplete_fields = ['interview', 'interviewer']  # Better than raw_id
    readonly_fields = ['submitted_at', 'updated_at']
    date_hierarchy = 'submitted_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('interview', 'interviewer', 'is_submitted')
        }),
        ('Overall Assessment', {
            'fields': ('recommendation', 'overall_rating')
        }),
        ('Competency Ratings', {
            'fields': ('technical_rating', 'communication_rating', 'problem_solving_rating', 'cultural_fit_rating')
        }),
        ('Detailed Feedback', {
            'fields': ('strengths', 'areas_for_improvement', 'detailed_notes')
        }),
        ('Questions & Concerns', {
            'fields': ('questions_asked', 'red_flags'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('submitted_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def interview_info(self, obj):
        return f"{obj.interview.application.candidate.full_name} - {obj.interview.interview_type}"
    interview_info.short_description = 'Interview'
    
    def overall_rating_display(self, obj):
        if obj.overall_rating:
            stars = '★' * obj.overall_rating + '☆' * (5 - obj.overall_rating)
            return format_html('<span title="{}/5">{}</span>', obj.overall_rating, stars)
        return '—'
    overall_rating_display.short_description = 'Rating'
    overall_rating_display.admin_order_field = 'overall_rating'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related('interview__application__candidate', 'interviewer')
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'organization'):
            return qs.filter(interview__application__job__organization=request.user.organization)
        return qs.none()
    
    actions = ['mark_as_submitted']
    
    def mark_as_submitted(self, request, queryset):
        now = timezone.now()
        updated = queryset.filter(is_submitted=False).update(
            is_submitted=True,
            submitted_at=now
        )
        self.message_user(request, f'{updated} feedback forms marked as submitted.')
    mark_as_submitted.short_description = 'Mark as submitted'


@admin.register(FeedbackTemplate)
class FeedbackTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'is_active', 'is_default', 'created_by', 'created_at']
    list_filter = ['is_active', 'is_default', 'organization', 'created_at']
    search_fields = ['name', 'description', 'organization__name']
    # raw_id_fields = ['organization', 'created_by']  # Removed for better UX
    autocomplete_fields = ['created_by']  # Better than raw_id for user lookup
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('organization', 'name', 'description')
        }),
        ('Template Structure', {
            'fields': ('sections', 'rating_criteria'),
            'classes': ('collapse',)
        }),
        ('Settings', {
            'fields': ('is_active', 'is_default')
        }),
        ('Tracking', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'organization'):
            return qs.filter(organization=request.user.organization)
        return qs.none()
    
    actions = ['activate_templates', 'deactivate_templates']
    
    def activate_templates(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} templates activated.')
    activate_templates.short_description = 'Activate selected templates'
    
    def deactivate_templates(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} templates deactivated.')
    deactivate_templates.short_description = 'Deactivate selected templates'