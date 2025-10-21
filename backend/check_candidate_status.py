#!/usr/bin/env python
"""
Check candidate status in database to debug rejection detection
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from api.models import Candidate

print("=" * 80)
print("CHECKING CANDIDATE STATUSES IN DATABASE")
print("=" * 80)

# Get all candidates with call summaries
candidates = Candidate.objects.exclude(retell_call_summary='').exclude(retell_call_summary__isnull=True)

print(f"\nFound {candidates.count()} candidates with call summaries\n")

for candidate in candidates:
    print("-" * 80)
    print(f"Candidate: {candidate.full_name} (ID: {candidate.id})")
    print(f"Status: {candidate.status}")
    print(f"Call Summary: {candidate.retell_call_summary[:150]}...")
    print(f"Call Outcome: {candidate.retell_call_outcome}")
    print(f"Rejection Reason: {candidate.retell_rejection_reason}")
    print(f"Interview Scheduled: {candidate.retell_interview_scheduled}")

    # Check if summary contains rejection keywords
    summary_lower = candidate.retell_call_summary.lower()
    rejection_keywords = ['not interested', 'declined', 'decided not to', 'another offer']

    found_keywords = [kw for kw in rejection_keywords if kw in summary_lower]

    if found_keywords:
        print(f"[FOUND] Rejection keywords in summary: {found_keywords}")
        if candidate.status != 'rejected':
            print(f"[WARNING] Status should be 'rejected' but is '{candidate.status}'")
        else:
            print(f"[OK] Correctly marked as rejected")
    else:
        print(f"[INFO] No rejection keywords found")

    print()

print("=" * 80)
print("\nTo fix a candidate manually, you can run:")
print("from api.models import Candidate")
print("c = Candidate.objects.get(id=YOUR_ID)")
print("c.status = 'rejected'")
print("c.retell_rejection_reason = 'Candidate not interested (from call summary)'")
print("c.save()")
print("=" * 80)
