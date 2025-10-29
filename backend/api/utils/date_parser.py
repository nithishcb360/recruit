"""
Date parsing utilities for Retell AI callbacks
Handles relative date expressions like "tomorrow", "next Monday", "after 10 minutes"
"""
from datetime import datetime, timedelta
import re
from typing import Optional, Dict


def parse_relative_date(text: str, reference_date: Optional[datetime] = None) -> Optional[Dict[str, str]]:
    """
    Parse relative date expressions to actual dates

    Args:
        text: Natural language date expression (e.g., "tomorrow", "next Monday", "after 10 minutes")
        reference_date: Reference date (defaults to now)

    Returns:
        Dict with 'date' (YYYY-MM-DD), 'time' (HH:MM AM/PM), and 'iso' (ISO 8601) or None
    """
    if not text:
        return None

    if reference_date is None:
        reference_date = datetime.now()

    text_lower = text.lower().strip()

    # Parse "tomorrow"
    if 'tomorrow' in text_lower:
        target_date = reference_date + timedelta(days=1)
        return {
            'date': target_date.strftime('%Y-%m-%d'),
            'time': '10:00 AM',  # Default to 10 AM
            'iso': target_date.replace(hour=10, minute=0, second=0).isoformat()
        }

    # Parse "today"
    if 'today' in text_lower:
        return {
            'date': reference_date.strftime('%Y-%m-%d'),
            'time': '02:00 PM',  # Default to 2 PM
            'iso': reference_date.replace(hour=14, minute=0, second=0).isoformat()
        }

    # Parse "next Monday", "next Tuesday", etc.
    weekdays = {
        'monday': 0, 'mon': 0,
        'tuesday': 1, 'tue': 1,
        'wednesday': 2, 'wed': 2,
        'thursday': 3, 'thu': 3,
        'friday': 4, 'fri': 4,
        'saturday': 5, 'sat': 5,
        'sunday': 6, 'sun': 6
    }

    for day_name, day_num in weekdays.items():
        if day_name in text_lower:
            # Calculate days until next occurrence
            current_weekday = reference_date.weekday()
            days_ahead = day_num - current_weekday

            # If the day is today or already passed this week, go to next week
            if 'next' in text_lower or days_ahead <= 0:
                days_ahead += 7

            target_date = reference_date + timedelta(days=days_ahead)
            return {
                'date': target_date.strftime('%Y-%m-%d'),
                'time': '10:00 AM',
                'iso': target_date.replace(hour=10, minute=0, second=0).isoformat()
            }

    # Parse "in X days"
    days_match = re.search(r'in\s+(\d+)\s+days?', text_lower)
    if days_match:
        days = int(days_match.group(1))
        target_date = reference_date + timedelta(days=days)
        return {
            'date': target_date.strftime('%Y-%m-%d'),
            'time': '10:00 AM',
            'iso': target_date.replace(hour=10, minute=0, second=0).isoformat()
        }

    # Parse "next week"
    if 'next week' in text_lower:
        target_date = reference_date + timedelta(days=7)
        return {
            'date': target_date.strftime('%Y-%m-%d'),
            'time': '10:00 AM',
            'iso': target_date.replace(hour=10, minute=0, second=0).isoformat()
        }

    return None


def parse_callback_time(text: str, reference_datetime: Optional[datetime] = None) -> Optional[datetime]:
    """
    Parse callback time expressions like "call after 10 minutes", "call me in 1 hour"

    Args:
        text: Natural language time expression
        reference_datetime: Reference datetime (defaults to now)

    Returns:
        datetime object representing when to call back, or None
    """
    if not text:
        return None

    if reference_datetime is None:
        reference_datetime = datetime.now()

    text_lower = text.lower().strip()

    # Parse "after X minutes" or "in X minutes"
    minutes_patterns = [
        r'(?:after|in)\s+(\d+)\s+min(?:ute)?s?',
        r'(\d+)\s+min(?:ute)?s?\s+(?:later|from now)',
    ]

    for pattern in minutes_patterns:
        match = re.search(pattern, text_lower)
        if match:
            minutes = int(match.group(1))
            return reference_datetime + timedelta(minutes=minutes)

    # Parse "after X hours" or "in X hours"
    hours_patterns = [
        r'(?:after|in)\s+(\d+)\s+hours?',
        r'(\d+)\s+hours?\s+(?:later|from now)',
    ]

    for pattern in hours_patterns:
        match = re.search(pattern, text_lower)
        if match:
            hours = int(match.group(1))
            return reference_datetime + timedelta(hours=hours)

    # Parse "later today"
    if 'later today' in text_lower or 'later' in text_lower:
        # Default to 2 hours later
        return reference_datetime + timedelta(hours=2)

    # Parse "this evening" or "tonight"
    if 'evening' in text_lower or 'tonight' in text_lower:
        target = reference_datetime.replace(hour=18, minute=0, second=0)
        if target < reference_datetime:
            target += timedelta(days=1)
        return target

    # Parse "this afternoon"
    if 'afternoon' in text_lower:
        target = reference_datetime.replace(hour=14, minute=0, second=0)
        if target < reference_datetime:
            # If it's already past 2 PM, default to 2 hours later
            return reference_datetime + timedelta(hours=2)
        return target

    return None


def should_schedule_callback(call_outcome: str, custom_data: Dict) -> bool:
    """
    Determine if a callback should be scheduled based on call outcome

    Args:
        call_outcome: The outcome of the call
        custom_data: Custom analysis data from Retell

    Returns:
        True if callback should be scheduled
    """
    if not call_outcome:
        return False

    outcome_lower = call_outcome.lower()

    # Callback indicators
    callback_indicators = [
        'callback', 'call back', 'call me back',
        'call later', 'call after',
        'not now', 'busy now',
        'call again', 'try again',
        'reschedule', 're-schedule'
    ]

    for indicator in callback_indicators:
        if indicator in outcome_lower:
            return True

    # Check custom data for callback request
    if custom_data.get('callback_requested'):
        return True

    if custom_data.get('preferred_callback_time'):
        return True

    return False
