"""
Enhanced Experience Extractor for Resume Parsing

This module provides a robust wrapper around pyresparser to reliably extract
total years of professional experience from resumes using multiple approaches:
1. Explicit experience mentions (regex patterns)
2. Date range calculations from employment history
3. Education-based estimation as fallback

Usage:
    from .enhanced_experience_extractor import EnhancedExperienceExtractor
    
    extractor = EnhancedExperienceExtractor()
    experience_years = extractor.extract_total_experience(resume_text)
"""

import re
import datetime
from typing import Optional, List, Tuple, Dict, Any
import logging

logger = logging.getLogger(__name__)


class EnhancedExperienceExtractor:
    """
    Enhanced experience extractor that combines multiple approaches to reliably
    extract total years of professional experience from resumes.
    """
    
    def __init__(self):
        """Initialize the enhanced experience extractor with comprehensive patterns."""
        self.current_year = datetime.datetime.now().year
        
        # Comprehensive regex patterns for explicit experience mentions
        self.experience_patterns = [
            # Direct experience statements
            r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:work\s*)?experience',
            r'experience\s*:?\s*(\d+)\+?\s*years?',
            r'(\d+)\+?\s*yrs?\s*(?:of\s*)?(?:work\s*)?experience',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:professional\s*)?work',
            r'(\d+)\+?\s*years?\s*in\s*(?:the\s*)?(?:field|industry)',
            r'over\s*(\d+)\+?\s*years?',
            r'more\s*than\s*(\d+)\+?\s*years?',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?professional',
            
            # Resume section headers
            r'total\s*experience\s*:?\s*(\d+)\+?\s*years?',
            r'work\s*experience\s*:?\s*(\d+)\+?\s*years?',
            r'professional\s*experience\s*:?\s*(\d+)\+?\s*years?',
            
            # Enhanced patterns for professional experience mentions  
            r'(\d+)\+?\s*years?\s*(?:of\s*)?professional\s*experience',
            r'professional\s*experience\s*(?:of\s*)?(\d+)\+?\s*years?',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?industry\s*experience',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?relevant\s*experience',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?hands-on\s*experience',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?technical\s*experience',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?software\s*experience',
            
            # Context-aware patterns (developer, engineer, etc.)
            r'(?:developer|engineer|programmer|analyst|consultant|specialist).*?(\d+)\+?\s*years?',
            r'(\d+)\+?\s*years?.*?(?:developer|engineer|programmer|analyst|consultant|specialist)',
            
            # Summary/profile section patterns
            r'(?:summary|profile|objective).*?(\d+)\+?\s*years?.*?experience',
            r'(\d+)\+?\s*years?.*?(?:summary|profile|objective).*?experience',
            
            # Alternative expressions
            r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:solid|strong|extensive)\s*experience',
            r'(?:solid|strong|extensive)\s*(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            
            # Years with specific technologies/domains
            r'(\d+)\+?\s*years?.*?(?:web|software|application|system)\s*development',
            r'(?:web|software|application|system)\s*development.*?(\d+)\+?\s*years?',
        ]
        
        # Date range patterns for employment history
        self.date_patterns = [
            # Year ranges
            r'(\d{4})\s*[-–—]\s*(\d{4})',  # 2019-2023, 2019–2023, 2019—2023
            r'(\d{4})\s*[-–—]\s*(?:present|current|now)',  # 2019-Present
            
            # Month-Year ranges
            r'(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})\s*[-–—]\s*(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})',
            r'(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})\s*[-–—]\s*(?:present|current|now)',
            
            # MM/YYYY format
            r'(\d{1,2})/(\d{4})\s*[-–—]\s*(\d{1,2})/(\d{4})',
            r'(\d{1,2})/(\d{4})\s*[-–—]\s*(?:present|current|now)',
            
            # MM-YYYY format  
            r'(\d{1,2})-(\d{4})\s*[-–—]\s*(\d{1,2})-(\d{4})',
            r'(\d{1,2})-(\d{4})\s*[-–—]\s*(?:present|current|now)',
        ]
        
        # Education graduation patterns
        self.graduation_patterns = [
            r'graduated\s*(?:in\s*)?(\d{4})',
            r'graduation\s*:?\s*(\d{4})',
            r'(\d{4})\s*[-–—]\s*(\d{4})\s*.*(?:bachelor|master|degree|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?)',
            r'(?:bachelor|master|degree|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?).*(\d{4})',
            r'class\s*of\s*(\d{4})',
            r'(\d{4})\s*graduate',
        ]

    def extract_total_experience(self, resume_text: str, fallback_to_pyresparser: bool = True) -> int:
        """
        Extract total years of professional experience using multiple approaches.
        
        Args:
            resume_text (str): The full text content of the resume
            fallback_to_pyresparser (bool): Whether to try pyresparser if other methods fail
            
        Returns:
            int: Total years of experience (0 if nothing found)
        """
        if not resume_text or not isinstance(resume_text, str):
            return 0
            
        text = resume_text.lower().strip()
        
        try:
            # Approach 1: Explicit experience mentions using regex
            explicit_years = self._extract_explicit_experience(text)
            if explicit_years > 0:
                logger.info(f"Found explicit experience mention: {explicit_years} years")
                return explicit_years
            
            # Approach 2: Calculate from employment date ranges
            calculated_years = self._calculate_from_date_ranges(text)
            if calculated_years > 0:
                logger.info(f"Calculated experience from date ranges: {calculated_years} years")
                return calculated_years
            
            # Approach 3: Try pyresparser if enabled and available
            if fallback_to_pyresparser:
                try:
                    from .resume_parser import ResumeParser
                    parser = ResumeParser()
                    parsed_data = parser._extract_experience(resume_text)
                    if isinstance(parsed_data, dict) and parsed_data.get('years'):
                        pyresparser_years = parsed_data['years']
                        if pyresparser_years > 0:
                            logger.info(f"Pyresparser found experience: {pyresparser_years} years")
                            return pyresparser_years
                except Exception as e:
                    logger.warning(f"Pyresparser fallback failed: {e}")
            
            # Approach 4: Estimate from education graduation (last resort)
            estimated_years = self._estimate_from_education(text)
            if estimated_years > 0:
                logger.info(f"Estimated experience from education: {estimated_years} years")
                return estimated_years
                
        except Exception as e:
            logger.error(f"Error in extract_total_experience: {e}")
        
        # Default to 0 if nothing found
        logger.info("No experience information found, returning 0")
        return 0
    
    def _extract_explicit_experience(self, text: str) -> int:
        """Extract years from explicit experience mentions using regex patterns."""
        max_years = 0
        
        for pattern in self.experience_patterns:
            try:
                matches = re.findall(pattern, text, re.IGNORECASE)
                for match in matches:
                    if isinstance(match, tuple):
                        # Handle tuples from grouped patterns
                        for group in match:
                            if group and group.isdigit():
                                years = int(group)
                                if 0 < years <= 50:  # Sanity check
                                    max_years = max(max_years, years)
                                    break
                    elif match and str(match).isdigit():
                        years = int(match)
                        if 0 < years <= 50:  # Sanity check
                            max_years = max(max_years, years)
            except (ValueError, re.error) as e:
                logger.warning(f"Error processing pattern {pattern}: {e}")
                continue
                
        return max_years
    
    def _calculate_from_date_ranges(self, text: str) -> int:
        """Calculate total experience from employment date ranges."""
        date_ranges = []
        
        for pattern in self.date_patterns:
            try:
                matches = re.findall(pattern, text, re.IGNORECASE)
                for match in matches:
                    date_range = self._process_date_match(match)
                    if date_range:
                        date_ranges.append(date_range)
            except (ValueError, re.error) as e:
                logger.warning(f"Error processing date pattern {pattern}: {e}")
                continue
        
        # Calculate total years, handling potential overlaps
        total_years = self._calculate_total_years(date_ranges)
        return min(total_years, 50)  # Cap at 50 years
    
    def _process_date_match(self, match: tuple) -> Optional[Tuple[int, int]]:
        """Process a date match tuple and return (start_year, end_year)."""
        try:
            if len(match) == 1:
                # Single year to present
                start_year = int(match[0])
                if 1990 <= start_year <= self.current_year:
                    return (start_year, self.current_year)
            elif len(match) == 2:
                # Two elements could be (year, year) or (month, year) to present
                if all(str(m).isdigit() and len(str(m)) == 4 for m in match):
                    # Both are years
                    start_year, end_year = int(match[0]), int(match[1])
                    if 1990 <= start_year <= end_year <= self.current_year:
                        return (start_year, end_year)
                else:
                    # Month/Year format to present
                    year = int([m for m in match if len(str(m)) == 4][0])
                    if 1990 <= year <= self.current_year:
                        return (year, self.current_year)
            elif len(match) >= 3:
                # MM/YYYY - MM/YYYY format or similar
                years = [int(m) for m in match if str(m).isdigit() and len(str(m)) == 4]
                if len(years) >= 2:
                    start_year, end_year = years[0], years[1]
                    if 1990 <= start_year <= end_year <= self.current_year:
                        return (start_year, end_year)
        except (ValueError, IndexError):
            pass
        return None
    
    def _calculate_total_years(self, date_ranges: List[Tuple[int, int]]) -> int:
        """Calculate total years from date ranges, handling overlaps."""
        if not date_ranges:
            return 0
            
        # Sort ranges by start year
        sorted_ranges = sorted(date_ranges, key=lambda x: x[0])
        
        # Merge overlapping ranges
        merged_ranges = []
        for start, end in sorted_ranges:
            if merged_ranges and start <= merged_ranges[-1][1]:
                # Overlapping range - merge
                merged_ranges[-1] = (merged_ranges[-1][0], max(merged_ranges[-1][1], end))
            else:
                # Non-overlapping range - add new
                merged_ranges.append((start, end))
        
        # Calculate total years from merged ranges
        total_years = sum(end - start for start, end in merged_ranges)
        return total_years
    
    def _estimate_from_education(self, text: str) -> int:
        """Estimate experience years based on education graduation date."""
        latest_graduation = 0
        
        for pattern in self.graduation_patterns:
            try:
                matches = re.findall(pattern, text, re.IGNORECASE)
                for match in matches:
                    if isinstance(match, tuple):
                        # Take the last year from tuple
                        years = [int(m) for m in match if str(m).isdigit() and len(str(m)) == 4]
                        if years:
                            year = max(years)  # Take the latest year
                    else:
                        year = int(match)
                    
                    if 1990 <= year <= self.current_year:
                        latest_graduation = max(latest_graduation, year)
            except (ValueError, re.error):
                continue
        
        if latest_graduation > 0:
            # Estimate experience as years since graduation minus 1-2 years for job search
            estimated_years = self.current_year - latest_graduation - 1
            return max(0, min(estimated_years, 40))  # Cap between 0 and 40 years
        
        return 0
    
    def extract_experience_details(self, resume_text: str) -> Dict[str, Any]:
        """
        Extract detailed experience information including total years and breakdown.
        
        Args:
            resume_text (str): The full text content of the resume
            
        Returns:
            Dict containing experience details
        """
        result = {
            'total_years': 0,
            'extraction_method': 'none',
            'confidence': 'low',
            'date_ranges': [],
            'explicit_mentions': [],
            'estimated_from_education': 0
        }
        
        if not resume_text:
            return result
            
        text = resume_text.lower().strip()
        
        # Try explicit extraction
        explicit_years = self._extract_explicit_experience(text)
        if explicit_years > 0:
            result['total_years'] = explicit_years
            result['extraction_method'] = 'explicit'
            result['confidence'] = 'high'
            return result
        
        # Try date range calculation
        calculated_years = self._calculate_from_date_ranges(text)
        if calculated_years > 0:
            result['total_years'] = calculated_years
            result['extraction_method'] = 'date_ranges'
            result['confidence'] = 'medium'
            return result
        
        # Try education estimation
        estimated_years = self._estimate_from_education(text)
        if estimated_years > 0:
            result['total_years'] = estimated_years
            result['extraction_method'] = 'education_estimation'
            result['confidence'] = 'low'
            return result
        
        return result


# Wrapper function for easy integration with existing pyresparser workflow
def extract_enhanced_experience(resume_text: str) -> int:
    """
    Simple wrapper function to extract total years of experience.
    
    Args:
        resume_text (str): The full text content of the resume
        
    Returns:
        int: Total years of professional experience
    """
    extractor = EnhancedExperienceExtractor()
    return extractor.extract_total_experience(resume_text)


# Integration with existing ResumeParser
def enhance_resume_parser_experience(original_parse_method):
    """
    Decorator to enhance existing resume parser with better experience extraction.
    
    Usage:
        @enhance_resume_parser_experience
        def parse_resume(self, file_path):
            # existing implementation
            pass
    """
    def wrapper(self, file_path: str):
        # Get original parsed data
        parsed_data = original_parse_method(self, file_path)
        
        # If experience extraction failed or returned 0, try enhanced extraction
        if not parsed_data.get('experience', {}).get('years') or parsed_data['experience']['years'] == 0:
            if 'text' in parsed_data:
                extractor = EnhancedExperienceExtractor()
                enhanced_years = extractor.extract_total_experience(parsed_data['text'])
                if enhanced_years > 0:
                    if 'experience' not in parsed_data:
                        parsed_data['experience'] = {}
                    parsed_data['experience']['years'] = enhanced_years
                    parsed_data['experience']['extraction_method'] = 'enhanced'
        
        return parsed_data
    
    return wrapper