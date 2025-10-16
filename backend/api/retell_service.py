"""
Retell AI Service for automated phone screening calls
"""
import logging
import requests
import os
from django.conf import settings

logger = logging.getLogger(__name__)

RETELL_API_KEY = os.getenv('RETELL_API_KEY', '')
RETELL_API_URL = 'https://api.retellai.com'
RETELL_LLM_ID = os.getenv('RETELL_LLM_ID', '')


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


def get_retell_llm(llm_id=None):
    """
    Get Retell AI LLM details including general_prompt

    Args:
        llm_id: Optional LLM ID, defaults to RETELL_LLM_ID from env

    Returns:
        dict: LLM details including general_prompt, or None on error
    """
    if not RETELL_API_KEY:
        logger.warning("RETELL_API_KEY not configured")
        return None

    if not llm_id:
        llm_id = RETELL_LLM_ID

    if not llm_id:
        logger.warning("No llm_id provided and RETELL_LLM_ID not set")
        return None

    try:
        headers = {
            "Authorization": f"Bearer {RETELL_API_KEY}",
            "Content-Type": "application/json"
        }

        response = requests.get(
            f"{RETELL_API_URL}/get-retell-llm/{llm_id}",
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            llm_data = response.json()
            logger.info(f"Successfully retrieved LLM {llm_id}")
            return llm_data
        else:
            logger.error(f"Retell API error getting LLM: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        logger.error(f"Error getting Retell LLM {llm_id}: {e}")
        return None


def update_retell_llm_prompt(llm_id, general_prompt=None, begin_message=None):
    """
    Update Retell AI LLM's prompt

    Args:
        llm_id: Retell LLM ID
        general_prompt: The main LLM prompt/instructions
        begin_message: Optional opening message for the agent

    Returns:
        dict: Updated LLM details, or None on error
    """
    if not RETELL_API_KEY:
        logger.warning("RETELL_API_KEY not configured")
        return None

    if not llm_id:
        llm_id = RETELL_LLM_ID

    if not llm_id:
        logger.warning("No llm_id provided and RETELL_LLM_ID not set")
        return None

    try:
        headers = {
            "Authorization": f"Bearer {RETELL_API_KEY}",
            "Content-Type": "application/json"
        }

        # Build update payload
        update_data = {}

        if general_prompt is not None:
            update_data['general_prompt'] = general_prompt
        if begin_message is not None:
            update_data['begin_message'] = begin_message

        if not update_data:  # No actual update data
            logger.warning("No data to update")
            return None

        response = requests.patch(
            f"{RETELL_API_URL}/update-retell-llm/{llm_id}",
            json=update_data,
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            llm_data = response.json()
            logger.info(f"Successfully updated LLM {llm_id} prompt")
            return llm_data
        else:
            logger.error(f"Retell API error updating LLM: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        logger.error(f"Error updating Retell LLM {llm_id}: {e}")
        return None
