#!/usr/bin/env python
"""
Test script to verify rejection detection from call summary
"""

# Example call summary from Retell AI
test_summary = """The call was about a technical interview for a position that Nithish Kumar applied for. However, Nithish informed the agent that he has decided not to proceed with the interview. The agent acknowledged his decision and offered to keep his information for future opportunities."""

# Rejection indicators to check
rejection_indicators = [
    'not interested',
    'another offer',
    'accepted offer',
    'accepted another',
    'not proceeding',
    'not proceed',
    'decided not to',
    'does not wish to proceed',
    'doesn\'t wish to proceed',
    'not wish to proceed',
    'declined',
    'withdraw',
    'no longer interested',
    'already accepted',
    'found another position',
    'took another job'
]

summary_lower = test_summary.lower()
is_rejected = False
matched_indicator = None

print("Testing rejection detection...")
print(f"\nCall Summary:\n{test_summary}\n")
print("-" * 80)

for indicator in rejection_indicators:
    if indicator in summary_lower:
        is_rejected = True
        matched_indicator = indicator
        print(f"[OK] REJECTION DETECTED!")
        print(f"  Matched indicator: '{indicator}'")
        break

if is_rejected:
    print(f"\n[OK] Result: Candidate would be marked as REJECTED")
    print(f"  Rejection reason: 'Candidate not interested (from call summary)'")
    print(f"  Status will be set to: 'rejected'")
else:
    print(f"\n[FAIL] No rejection detected in summary")

print("-" * 80)
