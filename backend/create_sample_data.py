import os
import django
import sys

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from api.models import DashboardStats, Task, ActivityLog

def create_sample_data():
    print("Creating sample data...")
    
    # Create superuser if it doesn't exist
    if not User.objects.filter(username='admin').exists():
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='admin123'
        )
        print("Created admin user")
    else:
        admin = User.objects.get(username='admin')
    
    # Create some regular users
    users = []
    for i in range(5):
        username = f'user{i+1}'
        if not User.objects.filter(username=username).exists():
            user = User.objects.create_user(
                username=username,
                email=f'{username}@example.com',
                password='password123',
                first_name=f'User{i+1}',
                last_name='Test'
            )
            users.append(user)
            print(f"Created {username}")
    
    # Get all users
    all_users = list(User.objects.all())
    
    # Create sample tasks
    sample_tasks = [
        {
            'title': 'Update user interface design',
            'description': 'Redesign the main dashboard with modern UI components',
            'status': 'in_progress',
            'priority': 'high',
        },
        {
            'title': 'Fix login authentication bug',
            'description': 'Users are experiencing issues logging in with social media accounts',
            'status': 'completed',
            'priority': 'urgent',
        },
        {
            'title': 'Implement new payment gateway',
            'description': 'Add support for the new payment processing system',
            'status': 'pending',
            'priority': 'medium',
        },
        {
            'title': 'Write API documentation',
            'description': 'Create comprehensive documentation for all API endpoints',
            'status': 'pending',
            'priority': 'low',
        },
        {
            'title': 'Database optimization',
            'description': 'Optimize slow queries and add proper indexes',
            'status': 'in_progress',
            'priority': 'high',
        },
        {
            'title': 'Set up monitoring system',
            'description': 'Implement application monitoring and alerting',
            'status': 'completed',
            'priority': 'medium',
        },
        {
            'title': 'Code review process',
            'description': 'Establish code review guidelines and processes',
            'status': 'cancelled',
            'priority': 'low',
        },
    ]
    
    # Create tasks
    for i, task_data in enumerate(sample_tasks):
        if not Task.objects.filter(title=task_data['title']).exists():
            task = Task.objects.create(
                title=task_data['title'],
                description=task_data['description'],
                status=task_data['status'],
                priority=task_data['priority'],
                assigned_to=all_users[i % len(all_users)] if all_users else None,
                due_date=timezone.now() + timedelta(days=7) if task_data['status'] != 'completed' else None,
            )
            print(f"Created task: {task.title}")
    
    # Create activity logs
    sample_activities = [
        {
            'action': 'login',
            'description': 'logged into the system',
        },
        {
            'action': 'create',
            'description': 'created a new task "Update user interface design"',
        },
        {
            'action': 'update',
            'description': 'updated task status to completed',
        },
        {
            'action': 'create',
            'description': 'created a new user account',
        },
        {
            'action': 'delete',
            'description': 'deleted old backup files',
        },
        {
            'action': 'update',
            'description': 'updated profile information',
        },
        {
            'action': 'logout',
            'description': 'logged out of the system',
        },
    ]
    
    # Create activity logs
    for i, activity_data in enumerate(sample_activities):
        user = all_users[i % len(all_users)] if all_users else admin
        ActivityLog.objects.create(
            user=user,
            action=activity_data['action'],
            description=f"{user.first_name or user.username} {activity_data['description']}",
            ip_address='127.0.0.1',
            timestamp=timezone.now() - timedelta(minutes=i*30)
        )
    
    print("Created sample activities")
    
    # Update dashboard stats
    stats, created = DashboardStats.objects.get_or_create(
        id=1,
        defaults={
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(last_login__gte=timezone.now() - timedelta(days=30)).count(),
            'total_revenue': 125600.50,
            'orders_today': 42,
        }
    )
    
    if not created:
        stats.total_users = User.objects.count()
        stats.active_users = User.objects.count() - 1  # Assume one inactive user
        stats.save()
    
    print("Updated dashboard statistics")
    print("Sample data creation completed!")

if __name__ == '__main__':
    create_sample_data()