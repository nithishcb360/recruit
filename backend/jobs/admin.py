from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.contrib.auth import get_user_model
from .models import Department, Job

User = get_user_model()


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'manager', 'job_count', 'created_at']
    list_filter = ['organization', 'created_at']
    search_fields = ['name', 'organization__name', 'manager__first_name', 'manager__last_name']
    # raw_id_fields = ['manager']  # Removed for better UX
    readonly_fields = ['created_at', 'updated_at']
    # autocomplete_fields = ['manager']  # Temporarily removed - using regular dropdown
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('organization', 'name', 'description', 'manager')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def job_count(self, obj):
        count = obj.jobs.count()
        if count > 0:
            url = reverse('admin:jobs_job_changelist') + f'?department__id={obj.id}'
            return format_html('<a href="{}">{} jobs</a>', url, count)
        return '0 jobs'
    job_count.short_description = 'Jobs'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'organization') and request.user.organization:
            return qs.filter(organization=request.user.organization)
        return qs.none()
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        # Pre-populate organization field for non-superusers
        if not request.user.is_superuser and hasattr(request.user, 'organization') and request.user.organization:
            form.base_fields['organization'].initial = request.user.organization
            form.base_fields['organization'].widget.attrs['readonly'] = True
        return form
    
    def save_model(self, request, obj, form, change):
        # Auto-set organization for non-superusers
        if not request.user.is_superuser and hasattr(request.user, 'organization') and request.user.organization:
            obj.organization = request.user.organization
        super().save_model(request, obj, form, change)
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "manager":
            # Limit manager choices to users from the same organization
            if hasattr(request.user, 'organization') and request.user.organization:
                kwargs["queryset"] = User.objects.filter(organization=request.user.organization)
            elif request.user.is_superuser:
                # Superusers can see all users
                kwargs["queryset"] = User.objects.all()
            else:
                # No organization - show no users
                kwargs["queryset"] = User.objects.none()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['title', 'organization', 'department', 'status', 'urgency', 'applications_count', 'days_open_display', 'created_at']
    list_filter = ['status', 'urgency', 'job_type', 'experience_level', 'is_remote', 'organization', 'department', 'created_at']
    search_fields = ['title', 'organization__name', 'department__name', 'location', 'description']
    # raw_id_fields = ['organization', 'department', 'hiring_manager', 'created_by']  # Removed for better UX
    autocomplete_fields = ['department', 'hiring_manager', 'created_by']  # Better than raw_id
    filter_horizontal = ['recruiters']
    readonly_fields = ['slug', 'days_open', 'is_overdue', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('organization', 'title', 'slug', 'department', 'status')
        }),
        ('Job Details', {
            'fields': ('description', 'requirements', 'responsibilities', 'job_type', 'experience_level')
        }),
        ('Location & Remote', {
            'fields': ('location', 'is_remote')
        }),
        ('Compensation', {
            'fields': ('salary_min', 'salary_max', 'salary_currency', 'show_salary')
        }),
        ('Skills', {
            'fields': ('required_skills', 'preferred_skills'),
            'classes': ('collapse',)
        }),
        ('Priority & Timeline', {
            'fields': ('urgency', 'openings', 'target_hire_date', 'sla_days')
        }),
        ('Team', {
            'fields': ('hiring_manager', 'recruiters')
        }),
        ('Dates', {
            'fields': ('posted_date', 'closed_date')
        }),
        ('Settings', {
            'fields': ('auto_reject_after_days', 'application_form'),
            'classes': ('collapse',)
        }),
        ('Tracking', {
            'fields': ('days_open', 'is_overdue', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def applications_count(self, obj):
        count = obj.applications.count()
        if count > 0:
            url = reverse('admin:candidates_jobapplication_changelist') + f'?job__id={obj.id}'
            return format_html('<a href="{}">{} applications</a>', url, count)
        return '0 applications'
    applications_count.short_description = 'Applications'
    
    def days_open_display(self, obj):
        days = obj.days_open
        if obj.is_overdue:
            return format_html('<span style="color: red; font-weight: bold;">{} days (overdue)</span>', days)
        elif days > obj.sla_days * 0.8:  # Warning when 80% of SLA is reached
            return format_html('<span style="color: orange;">{} days</span>', days)
        return f'{days} days'
    days_open_display.short_description = 'Days Open'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'organization'):
            return qs.filter(organization=request.user.organization)
        return qs.none()
    
    actions = ['publish_jobs', 'close_jobs', 'mark_as_on_hold']
    
    def publish_jobs(self, request, queryset):
        updated = queryset.filter(status='draft').update(status='open')
        self.message_user(request, f'{updated} jobs published successfully.')
    publish_jobs.short_description = 'Publish selected jobs'
    
    def close_jobs(self, request, queryset):
        updated = queryset.filter(status__in=['open', 'on_hold']).update(status='closed')
        self.message_user(request, f'{updated} jobs closed successfully.')
    close_jobs.short_description = 'Close selected jobs'
    
    def mark_as_on_hold(self, request, queryset):
        updated = queryset.filter(status='open').update(status='on_hold')
        self.message_user(request, f'{updated} jobs marked as on hold.')
    mark_as_on_hold.short_description = 'Mark selected jobs as on hold'