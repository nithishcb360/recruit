from django.contrib import admin
from .models import DashboardStats, Task, ActivityLog, FeedbackTemplate


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