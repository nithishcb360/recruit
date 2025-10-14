"""
Retell AI Service for automated phone screening calls
"""
import logging
import requests
import os
from django.conf import settings

logger = logging.getLogger(__name__)

RETELL_API_KEY = os.getenv('RETELL_API_KEY', '')
RETELL_API_URL = 'https://api.retellai.com/v1'


def trigger_screening_call(candidate):
    """
    Trigger a Retell AI screening call for a candidate

    Args:
        candidate: Candidate model instance
    """
    if not RETELL_API_KEY:
        logger.warning("RETELL_API_KEY not configured. Skipping Retell call.")
        return None

    if not candidate.phone:
        logger.warning(f"Candidate {candidate.id} has no phone number. Cannot trigger Retell call.")
        return None

    try:
        # Prepare call data
        call_data = {
            "phone_number": candidate.phone,
            "agent_id": os.getenv('RETELL_AGENT_ID', ''),  # Configure in .env
            "metadata": {
                "candidate_id": str(candidate.id),
                "candidate_name": candidate.full_name,
                "candidate_email": candidate.email or '',
                "purpose": "screening_call"
            }
        }

        # Make API request to Retell
        headers = {
            "Authorization": f"Bearer {RETELL_API_KEY}",
            "Content-Type": "application/json"
        }

        response = requests.post(
            f"{RETELL_API_URL}/create-phone-call",
            json=call_data,
            headers=headers,
            timeout=10
        )

        if response.status_code == 200 or response.status_code == 201:
            result = response.json()

            # Update candidate with call information
            candidate.retell_call_id = result.get('call_id', '')
            candidate.retell_call_status = result.get('call_status', 'registered')
            candidate.retell_call_type = result.get('call_type', 'phone_call')
            candidate.save()

            logger.info(f"Successfully triggered Retell call for candidate {candidate.id}. Call ID: {result.get('call_id')}")
            return result
        else:
            logger.error(f"Retell API error: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        logger.error(f"Error triggering Retell call for candidate {candidate.id}: {e}")
        return None
