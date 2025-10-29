#!/usr/bin/env python
"""
Fix candidate #229 who should be marked as rejected
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from api.models import Candidate

print("Fixing candidate #229...")

try:
    candidate = Candidate.objects.get(id=229)

    print(f"\nBefore:")
    print(f"  Name: {candidate.full_name}")
    print(f"  Status: {candidate.status}")
    print(f"  Interview Scheduled: {candidate.retell_interview_scheduled}")
    print(f"  Summary: {candidate.retell_call_summary[:100]}...")

    # Fix the status
    candidate.status = 'rejected'
    candidate.retell_rejection_reason = 'Candidate not interested (from call summary)'
    candidate.retell_call_outcome = 'Not Interested'
    candidate.retell_interview_scheduled = False
    candidate.save()

    print(f"\nAfter:")
    print(f"  Status: {candidate.status}")
    print(f"  Rejection Reason: {candidate.retell_rejection_reason}")
    print(f"  Call Outcome: {candidate.retell_call_outcome}")
    print(f"  Interview Scheduled: {candidate.retell_interview_scheduled}")

    print(f"\n[SUCCESS] Candidate marked as rejected!")
    print(f"[INFO] Refresh the screening page to see the red border")

except Candidate.DoesNotExist:
    print("Candidate #229 not found")
except Exception as e:
    print(f"Error: {e}")
