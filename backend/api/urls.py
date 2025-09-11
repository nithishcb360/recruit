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
    path('update-candidate-experience/', views.update_candidate_experience, name='update-candidate-experience'),
    path('', include(router.urls)),
]