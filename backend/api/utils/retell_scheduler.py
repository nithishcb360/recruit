"""
Retell AI callback scheduling utilities
Handles automatic rescheduling of calls based on candidate requests
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
from ..retell_service import trigger_screening_call

logger = logging.getLogger(__name__)


def schedule_retell_callback(candidate, callback_datetime: datetime, reason: str = "") -> bool:
    """
    Schedule a Retell AI callback for a candidate

    Args:
        candidate: Candidate model instance
        callback_datetime: When to call back
        reason: Reason for callback (e.g., "Candidate requested callback")

    Returns:
        True if scheduling was successful
    """
    try:
        # Update candidate fields
        candidate.retell_next_retry_time = callback_datetime
        candidate.retell_last_call_attempt = datetime.now()
        candidate.retell_retry_count = (candidate.retell_retry_count or 0) + 1

        # Store callback reason in additional notes
        notes = candidate.retell_additional_notes or ""
        callback_note = f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Callback scheduled for {callback_datetime.strftime('%Y-%m-%d %H:%M')} - {reason}"
        candidate.retell_additional_notes = (notes + callback_note).strip()

        # Update call outcome
        if not candidate.retell_call_outcome or 'Callback' not in candidate.retell_call_outcome:
            candidate.retell_call_outcome = f"Callback Requested - {callback_datetime.strftime('%Y-%m-%d %H:%M')}"

        candidate.save()

        logger.info(f"Scheduled callback for candidate {candidate.id} at {callback_datetime}")
        return True

    except Exception as e:
        logger.error(f"Error scheduling callback for candidate {candidate.id}: {e}")
        return False


def execute_pending_callbacks():
    """
    Execute all pending Retell callbacks that are due
    This should be called by a cron job or celery task

    Returns:
        Number of callbacks executed
    """
    from ..models import Candidate

    try:
        now = datetime.now()

        # Find candidates with pending callbacks
        pending_callbacks = Candidate.objects.filter(
            retell_next_retry_time__isnull=False,
            retell_next_retry_time__lte=now,
            status='screening'  # Only retry screening candidates
        ).exclude(
            retell_call_outcome__icontains='Not Interested'
        ).exclude(
            retell_call_outcome__icontains='Declined'
        )

        executed_count = 0

        for candidate in pending_callbacks:
            try:
                logger.info(f"Executing scheduled callback for candidate {candidate.id}")

                # Trigger the call
                result = trigger_screening_call(candidate)

                if result:
                    executed_count += 1
                    # Clear the retry time since we've executed it
                    candidate.retell_next_retry_time = None
                    candidate.save()
                else:
                    # If call failed, reschedule for 1 hour later
                    logger.warning(f"Callback failed for candidate {candidate.id}, rescheduling")
                    candidate.retell_next_retry_time = now + timedelta(hours=1)
                    candidate.save()

            except Exception as e:
                logger.error(f"Error executing callback for candidate {candidate.id}: {e}")

        logger.info(f"Executed {executed_count} pending callbacks")
        return executed_count

    except Exception as e:
        logger.error(f"Error in execute_pending_callbacks: {e}")
        return 0


def get_pending_callbacks_count() -> int:
    """
    Get count of pending callbacks

    Returns:
        Number of pending callbacks
    """
    from ..models import Candidate

    try:
        now = datetime.now()
        count = Candidate.objects.filter(
            retell_next_retry_time__isnull=False,
            retell_next_retry_time__lte=now,
            status='screening'
        ).count()
        return count
    except Exception as e:
        logger.error(f"Error getting pending callbacks count: {e}")
        return 0
