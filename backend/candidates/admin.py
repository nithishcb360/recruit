from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Candidate, JobApplication, ApplicationActivity


class ApplicationActivityInline(admin.TabularInline):
    model = ApplicationActivity
    extra = 0
    readonly_fields = ['created_at']
    fields = ['user', 'activity_type', 'description', 'created_at']
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'organization', 'current_title', 'location', 'source', 'applications_count', 'created_at']
    list_filter = ['organization', 'source', 'years_of_experience', 'created_at']
    search_fields = ['first_name', 'last_name', 'email', 'current_title', 'current_company', 'location']
    # raw_id_fields = ['organization', 'referrer']  # Removed for better UX
    autocomplete_fields = ['referrer']  # Better than raw_id for user lookup
    readonly_fields = ['full_name', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Personal Information', {
            'fields': ('organization', 'first_name', 'last_name', 'full_name', 'email', 'phone', 'location')
        }),
        ('Professional Information', {
            'fields': ('current_title', 'current_company', 'years_of_experience', 'linkedin_url', 'portfolio_url')
        }),
        ('Application Details', {
            'fields': ('resume', 'cover_letter', 'expected_salary', 'notice_period_days')
        }),
        ('Skills & Tags', {
            'fields': ('skills', 'tags'),
            'classes': ('collapse',)
        }),
        ('Tracking', {
            'fields': ('source', 'referrer', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def applications_count(self, obj):
        count = obj.applications.count()
        if count > 0:
            url = reverse('admin:candidates_jobapplication_changelist') + f'?candidate__id={obj.id}'
            return format_html('<a href="{}">{} applications</a>', url, count)
        return '0 applications'
    applications_count.short_description = 'Applications'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'organization'):
            return qs.filter(organization=request.user.organization)
        return qs.none()


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ['candidate_name', 'job_title', 'stage', 'status', 'overall_rating_display', 'applied_at', 'stage_updated_at']
    list_filter = ['stage', 'status', 'job__organization', 'job__department', 'applied_at']
    search_fields = ['candidate__first_name', 'candidate__last_name', 'candidate__email', 'job__title']
    # raw_id_fields = ['job', 'candidate']  # Removed for better UX
    autocomplete_fields = ['job', 'candidate']  # Better than raw_id
    readonly_fields = ['applied_at', 'stage_updated_at', 'created_at', 'updated_at']
    date_hierarchy = 'applied_at'
    inlines = [ApplicationActivityInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('job', 'candidate', 'stage', 'status')
        }),
        ('Ratings & Scores', {
            'fields': ('overall_rating', 'ai_score')
        }),
        ('Application Data', {
            'fields': ('application_responses',),
            'classes': ('collapse',)
        }),
        ('Tracking', {
            'fields': ('applied_at', 'stage_updated_at', 'rejected_at', 'rejection_reason')
        }),
        ('Offer Information', {
            'fields': ('offer_extended_at', 'offer_amount', 'offer_accepted_at', 'start_date'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def candidate_name(self, obj):
        return obj.candidate.full_name
    candidate_name.short_description = 'Candidate'
    candidate_name.admin_order_field = 'candidate__first_name'
    
    def job_title(self, obj):
        return obj.job.title
    job_title.short_description = 'Job'
    job_title.admin_order_field = 'job__title'
    
    def overall_rating_display(self, obj):
        if obj.overall_rating:
            rating = float(obj.overall_rating)
            stars = '★' * int(rating) + '☆' * (5 - int(rating))
            return format_html('<span title="{}">{}</span>', rating, stars)
        return '—'
    overall_rating_display.short_description = 'Rating'
    overall_rating_display.admin_order_field = 'overall_rating'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related('candidate', 'job', 'job__organization')
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'organization'):
            return qs.filter(job__organization=request.user.organization)
        return qs.none()
    
    actions = ['advance_to_next_stage', 'reject_applications', 'move_to_offer']
    
    def advance_to_next_stage(self, request, queryset):
        stage_progression = {
            'applied': 'screening',
            'screening': 'phone_screen',
            'phone_screen': 'technical',
            'technical': 'onsite',
            'onsite': 'final',
            'final': 'offer',
        }
        
        updated = 0
        for application in queryset:
            if application.stage in stage_progression:
                new_stage = stage_progression[application.stage]
                application.stage = new_stage
                application.save()
                
                # Create activity log
                ApplicationActivity.objects.create(
                    application=application,
                    user=request.user,
                    activity_type='stage_change',
                    description=f'Advanced to {new_stage} stage'
                )
                updated += 1
        
        self.message_user(request, f'{updated} applications advanced to next stage.')
    advance_to_next_stage.short_description = 'Advance to next stage'
    
    def reject_applications(self, request, queryset):
        updated = queryset.filter(status='active').update(status='rejected')
        self.message_user(request, f'{updated} applications rejected.')
    reject_applications.short_description = 'Reject selected applications'
    
    def move_to_offer(self, request, queryset):
        updated = queryset.filter(status='active').update(stage='offer')
        self.message_user(request, f'{updated} applications moved to offer stage.')
    move_to_offer.short_description = 'Move to offer stage'


@admin.register(ApplicationActivity)
class ApplicationActivityAdmin(admin.ModelAdmin):
    list_display = ['application_info', 'user', 'activity_type', 'description_short', 'created_at']
    list_filter = ['activity_type', 'created_at', 'application__job__organization']
    search_fields = ['application__candidate__first_name', 'application__candidate__last_name', 'description']
    # raw_id_fields = ['application', 'user']  # Removed for better UX
    autocomplete_fields = ['application', 'user']  # Better than raw_id
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Activity Information', {
            'fields': ('application', 'user', 'activity_type', 'description')
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )
    
    def application_info(self, obj):
        return f"{obj.application.candidate.full_name} - {obj.application.job.title}"
    application_info.short_description = 'Application'
    
    def description_short(self, obj):
        return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
    description_short.short_description = 'Description'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related('application__candidate', 'application__job', 'user')
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'organization'):
            return qs.filter(application__job__organization=request.user.organization)
        return qs.none()