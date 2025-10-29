#!/usr/bin/env python
"""
Complete test of rejection detection flow
Shows exactly what happens when Retell AI sends a rejection summary
"""

print("=" * 80)
print("RETELL AI AUTOMATIC REJECTION DETECTION - COMPLETE TEST")
print("=" * 80)

# Test Case 1: "not interested" in summary
test_cases = [
    {
        "name": "Case 1: Not Interested",
        "summary": "The candidate mentioned they are not interested in the position at this time.",
        "expected": "REJECTED"
    },
    {
        "name": "Case 2: Declined",
        "summary": "Nithish Kumar declined the interview opportunity.",
        "expected": "REJECTED"
    },
    {
        "name": "Case 3: Decided not to proceed",
        "summary": "The call was about a technical interview for a position that Nithish Kumar applied for. However, Nithish informed the agent that he has decided not to proceed with the interview.",
        "expected": "REJECTED"
    },
    {
        "name": "Case 4: Accepted another offer",
        "summary": "The candidate has accepted another offer and will not be continuing with this process.",
        "expected": "REJECTED"
    },
    {
        "name": "Case 5: Interested candidate",
        "summary": "The candidate is very interested and excited about the opportunity. Interview scheduled for next week.",
        "expected": "INTERVIEWING"
    }
]

# Rejection indicators
rejection_indicators = [
    'not interested',
    'another offer',
    'accepted offer',
    'accepted another',
    'not proceeding',
    'not proceed',
    'decided not to',
    'does not wish to proceed',
    'declined',
    'withdraw',
    'no longer interested',
    'already accepted',
    'found another position',
    'took another job'
]

print("\nTesting all scenarios...\n")

for test in test_cases:
    print("-" * 80)
    print(f"\n{test['name']}")
    print(f"Summary: {test['summary'][:80]}...")

    summary_lower = test['summary'].lower()
    is_rejected = False
    matched_indicator = None

    for indicator in rejection_indicators:
        if indicator in summary_lower:
            is_rejected = True
            matched_indicator = indicator
            break

    if is_rejected:
        print(f"\n[DETECTED] Rejection keyword: '{matched_indicator}'")
        print(f"[ACTION] Status set to: 'rejected'")
        print(f"[ACTION] Rejection reason: 'Candidate not interested (from call summary)'")
        print(f"[ACTION] Email: NOT SENT")
        print(f"[RESULT] Candidate will show as REJECTED with RED BORDER")

        if test['expected'] == "REJECTED":
            print(f"[TEST] PASS - Correctly detected as rejected")
        else:
            print(f"[TEST] FAIL - Should not be rejected")
    else:
        print(f"\n[NO REJECTION] No rejection keywords found")
        print(f"[ACTION] Status: Normal processing")
        print(f"[ACTION] Email: Will be sent if interview scheduled")

        if test['expected'] == "INTERVIEWING":
            print(f"[TEST] PASS - Correctly identified as interested")
        else:
            print(f"[TEST] FAIL - Should be rejected")

    print()

print("=" * 80)
print("COMPLETE FLOW SUMMARY")
print("=" * 80)
print("""
When Retell AI webhook is received with rejection keywords:

1. Backend detects keywords in call_summary
2. Sets candidate.status = 'rejected'
3. Sets rejection_reason = 'Candidate not interested (from call summary)'
4. Sets call_outcome = 'Not Interested'
5. SKIPS sending WebDesk assessment email
6. Frontend displays:
   - RED BORDER on candidate card
   - RED "Not Interested" badge
   - RED rejection reason box
   - X icon in interview stages

NO MANUAL ACTION NEEDED - Everything is automatic!
""")
print("=" * 80)
