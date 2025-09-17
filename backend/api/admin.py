from django.contrib import admin
from .models import DashboardStats, Task, ActivityLog, FeedbackTemplate, Candidate, Job, Department


@admin.register(DashboardStats)
class DashboardStatsAdmin(admin.ModelAdmin):
    list_display = ['total_users', 'active_users', 'total_revenue', 'orders_today', 'updated_at']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'priority', 'assigned_to', 'due_date', 'created_at']
    list_filter = ['status', 'priority', 'created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'description', 'timestamp']
    list_filter = ['action', 'timestamp']
    readonly_fields = ['timestamp']


@admin.register(FeedbackTemplate)
class FeedbackTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'is_active', 'is_default', 'created_by', 'created_at']
    list_filter = ['status', 'is_active', 'is_default', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']

    def save_model(self, request, obj, form, change):
        if not change:  # If creating a new template
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'email', 'phone', 'current_position', 'status', 'created_at']
    list_filter = ['status', 'created_at', 'experience_level']
    search_fields = ['name', 'email', 'phone', 'current_position']
    readonly_fields = ['created_at', 'updated_at']
    actions = ['delete_selected_candidates']

    def delete_selected_candidates(self, request, queryset):
        count = queryset.count()
        queryset.delete()
        self.message_user(request, f'Successfully deleted {count} candidates.')
    delete_selected_candidates.short_description = "Delete selected candidates"


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['title', 'department', 'status', 'job_type', 'location', 'created_at']
    list_filter = ['status', 'job_type', 'department', 'created_at']
    search_fields = ['title', 'description', 'location']
    readonly_fields = ['created_at', 'updated_at']