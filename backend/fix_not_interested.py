#!/usr/bin/env python
"""
Script to update existing candidates with 'Not Interested' outcome to 'rejected' status
"""
import os
import sys
import django

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from api.models import Candidate

def fix_not_interested_candidates():
    """Update candidates with 'Not Interested' outcome to rejected status"""

    # Find all candidates with rejection indicators but not marked as rejected
    rejection_indicators = {
        'outcomes': [
            'Not Interested',
            'Accepted Another Offer',
            'Not Proceeding',
            'Declined'
        ],
        'summary_keywords': [
            'not interested',
            'another offer',
            'accepted offer',
            'cannot travel',
            'can\'t travel',
            'unable to travel',
            'cannot relocate',
            'not available',
            'polite exchange',
            'expressed that he cannot',
            'expressed that she cannot',
            'not moving forward'
        ]
    }

    updated_count = 0

    # Check by call outcome
    for outcome in rejection_indicators['outcomes']:
        candidates = Candidate.objects.filter(
            retell_call_outcome__icontains=outcome
        ).exclude(status='rejected')

        for candidate in candidates:
            print(f"\nUpdating candidate ID {candidate.id}: {candidate.name}")
            print(f"  Current status: {candidate.status}")
            print(f"  Call outcome: {candidate.retell_call_outcome}")

            candidate.status = 'rejected'
            if not candidate.retell_rejection_reason:
                candidate.retell_rejection_reason = candidate.retell_call_outcome or 'Not Interested'
            if not candidate.retell_call_outcome:
                candidate.retell_call_outcome = 'Not Interested'
            candidate.retell_interview_scheduled = False
            candidate.save()

            print(f"  ✓ Updated to: rejected")
            updated_count += 1

    # Check by call summary keywords
    for keyword in rejection_indicators['summary_keywords']:
        candidates = Candidate.objects.filter(
            retell_call_summary__icontains=keyword
        ).exclude(status='rejected')

        for candidate in candidates:
            print(f"\nUpdating candidate ID {candidate.id}: {candidate.name}")
            print(f"  Current status: {candidate.status}")
            print(f"  Found keyword: '{keyword}' in summary")
            print(f"  Summary preview: {candidate.retell_call_summary[:150]}...")

            candidate.status = 'rejected'
            if not candidate.retell_rejection_reason:
                candidate.retell_rejection_reason = 'Candidate not interested (from call summary)'
            if not candidate.retell_call_outcome:
                candidate.retell_call_outcome = 'Not Interested'
            candidate.retell_interview_scheduled = False
            candidate.save()

            print(f"  ✓ Updated to: rejected")
            updated_count += 1

    print(f"\n{'='*60}")
    print(f"Total candidates updated: {updated_count}")
    print(f"{'='*60}")

if __name__ == '__main__':
    print("Fixing candidates with rejection indicators...")
    print("="*60)
    fix_not_interested_candidates()
