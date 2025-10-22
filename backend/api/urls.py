from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'tasks', views.TaskViewSet)
router.register(r'activities', views.ActivityLogViewSet)
router.register(r'departments', views.DepartmentViewSet)
router.register(r'jobs', views.JobViewSet)
router.register(r'candidates', views.CandidateViewSet)
router.register(r'applications', views.JobApplicationViewSet)
router.register(r'feedback-templates', views.FeedbackTemplateViewSet)
router.register(r'interview-flows', views.InterviewFlowViewSet)
router.register(r'interview-rounds', views.InterviewRoundViewSet)
router.register(r'email-settings', views.EmailSettingsViewSet)

urlpatterns = [
    path('', views.api_root, name='api-root'),
    path('dashboard/', views.dashboard_overview, name='dashboard-overview'),
    path('parse-resume/', views.parse_resume, name='parse-resume'),
    path('bulk-create-candidates/', views.bulk_create_candidates, name='bulk-create-candidates'),
    path('candidates/<int:candidate_id>/resume/', views.view_resume, name='view-resume'),
    path('generate-job-titles/', views.generate_job_titles, name='generate-job-titles'),
    path('update-candidate-experience/', views.update_candidate_experience, name='update-candidate-experience'),
    # Semantic job matching endpoints
    path('calculate-job-match/', views.calculate_job_match, name='calculate-job-match'),
    path('candidates/<int:candidate_id>/matching-jobs/', views.find_matching_jobs, name='find-matching-jobs'),
    path('jobs/<int:job_id>/matching-candidates/', views.find_matching_candidates, name='find-matching-candidates'),
    # AI generation endpoints (server-side)
    path('ai/generate-job-description/', views.generate_job_description_ai, name='ai-generate-job-description'),
    path('ai/generate-questions/', views.generate_questions_ai, name='ai-generate-questions'),
    # Retell AI agent management
    path('retell/agent/prompt/', views.get_retell_agent_prompt, name='get-retell-agent-prompt'),
    path('retell/agent/prompt/update/', views.update_retell_agent_prompt, name='update-retell-agent-prompt'),
    # Email settings management
    path('settings/email/', views.get_email_settings, name='get-email-settings'),
    path('settings/email/update/', views.update_email_settings, name='update-email-settings'),
    path('', include(router.urls)),
]