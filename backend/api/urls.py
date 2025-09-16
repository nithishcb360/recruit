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
    path('', include(router.urls)),
]