import re
import os
import docx
import pdfplumber
from typing import Dict, List, Any, Optional
from .enhanced_experience_extractor import EnhancedExperienceExtractor


class ResumeParser:
    """
    A simple resume parser that extracts information from PDF and DOCX files.
    """
    
    def __init__(self):
        self.skills_keywords = [
            # Programming languages
            'python', 'javascript', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
            'swift', 'kotlin', 'typescript', 'scala', 'perl', 'r', 'matlab',
            
            # Web technologies
            'html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django',
            'flask', 'spring', 'laravel', 'asp.net', 'jquery', 'bootstrap',
            
            # Databases
            'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle',
            'elasticsearch', 'cassandra', 'dynamodb',
            
            # Cloud & DevOps
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git',
            'terraform', 'ansible', 'ci/cd', 'microservices',
            
            # Data Science & AI
            'machine learning', 'data science', 'tensorflow', 'pytorch', 'pandas',
            'numpy', 'scikit-learn', 'matplotlib', 'tableau', 'power bi',
            
            # Mobile
            'ios', 'android', 'react native', 'flutter', 'xamarin',
            
            # Other
            'linux', 'unix', 'agile', 'scrum', 'rest api', 'graphql', 'oauth'
        ]
        
        self.education_keywords = [
            'bachelor', 'master', 'phd', 'doctorate', 'diploma', 'certificate',
            'university', 'college', 'institute', 'school', 'degree', 'b.s.',
            'b.a.', 'm.s.', 'm.a.', 'b.tech', 'm.tech', 'mba', 'b.e.', 'm.e.'
        ]

    def parse_resume(self, file_path: str) -> Dict[str, Any]:
        """
        Parse a resume file and extract structured information.
        
        Args:
            file_path: Path to the resume file
            
        Returns:
            Dictionary containing parsed resume data
        """
        text = self._extract_text(file_path)
        
        if not text:
            return {'error': 'Could not extract text from file'}
        
        # Extract basic information
        parsed_data = {
            'name': self._extract_name(text),
            'email': self._extract_email(text),
            'phone': self._extract_phone(text),
            'skills': self._extract_skills(text),
            'experience': self._extract_experience(text),
            'education': self._extract_education(text),
            'text': text[:1000]  # First 1000 characters for preview
        }
        
        # Enhanced experience extraction as fallback
        if not parsed_data['experience'].get('years') or parsed_data['experience']['years'] == 0:
            try:
                enhanced_extractor = EnhancedExperienceExtractor()
                enhanced_years = enhanced_extractor.extract_total_experience(text)
                if enhanced_years > 0:
                    parsed_data['experience']['years'] = enhanced_years
                    parsed_data['experience']['extraction_method'] = 'enhanced'
                    print(f"Enhanced extraction found {enhanced_years} years of experience")
            except Exception as e:
                print(f"Enhanced experience extraction failed: {e}")
        
        return parsed_data

    def _extract_text(self, file_path: str) -> str:
        """Extract text from PDF or DOCX file."""
        file_extension = os.path.splitext(file_path)[1].lower()
        
        try:
            if file_extension == '.pdf':
                return self._extract_pdf_text(file_path)
            elif file_extension in ['.docx', '.doc']:
                return self._extract_docx_text(file_path)
            else:
                return ''
        except Exception as e:
            print(f"Error extracting text: {e}")
            return ''

    def _extract_pdf_text(self, file_path: str) -> str:
        """Extract text from PDF file."""
        text = ''
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + '\n'
        return text

    def _extract_docx_text(self, file_path: str) -> str:
        """Extract text from DOCX file."""
        doc = docx.Document(file_path)
        text = ''
        for paragraph in doc.paragraphs:
            text += paragraph.text + '\n'
        return text

    def _extract_name(self, text: str) -> str:
        """Extract name from resume text."""
        lines = text.split('\n')
        
        # Try to find name in first few lines
        for line in lines[:5]:
            line = line.strip()
            if len(line) > 2 and len(line) < 50:
                # Simple heuristic: if line has 2-4 words and no special chars
                words = line.split()
                if 2 <= len(words) <= 4 and all(word.replace('-', '').replace("'", '').isalpha() for word in words):
                    return line
        
        return ''

    def _extract_email(self, text: str) -> str:
        """Extract email from resume text."""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        return emails[0] if emails else ''

    def _extract_phone(self, text: str) -> str:
        """Extract phone number from resume text."""
        phone_patterns = [
            r'\b\d{3}-\d{3}-\d{4}\b',  # 123-456-7890
            r'\b\(\d{3}\)\s*\d{3}-\d{4}\b',  # (123) 456-7890
            r'\b\d{3}\.\d{3}\.\d{4}\b',  # 123.456.7890
            r'\b\d{10}\b',  # 1234567890
        ]
        
        for pattern in phone_patterns:
            phones = re.findall(pattern, text)
            if phones:
                return phones[0]
        
        return ''

    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from resume text."""
        text_lower = text.lower()
        found_skills = []
        
        for skill in self.skills_keywords:
            if skill in text_lower:
                # Add the skill as it appears in our keywords
                found_skills.append(skill.title())
        
        # Remove duplicates and sort
        return sorted(list(set(found_skills)))

    def _extract_experience(self, text: str) -> Dict[str, Any]:
        """Extract work experience information."""
        # Enhanced patterns to find years of experience
        experience_patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:work\s*)?experience',
            r'experience\s*:?\s*(\d+)\+?\s*years?',
            r'(\d+)\+?\s*yrs?\s*(?:of\s*)?(?:work\s*)?experience',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:professional\s*)?work',
            r'(\d+)\+?\s*years?\s*in\s*(?:the\s*)?(?:field|industry)',
            r'over\s*(\d+)\+?\s*years?',
            r'more\s*than\s*(\d+)\+?\s*years?',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?professional',
            # Pattern for resume sections like "Total Experience: X years"
            r'total\s*experience\s*:?\s*(\d+)\+?\s*years?',
            r'work\s*experience\s*:?\s*(\d+)\+?\s*years?',
            # Enhanced patterns for professional experience mentions
            r'(\d+)\+?\s*years?\s*(?:of\s*)?professional\s*experience',
            r'professional\s*experience\s*(?:of\s*)?(\d+)\+?\s*years?',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?industry\s*experience',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?relevant\s*experience',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?hands-on\s*experience',
            # Patterns with developer/engineer context
            r'(?:developer|engineer).*?(\d+)\+?\s*years?',
            r'(\d+)\+?\s*years?.*?(?:developer|engineer)',
            # Patterns in summary sections
            r'(?:summary|profile).*?(\d+)\+?\s*years?.*?experience',
            r'(\d+)\+?\s*years?.*?(?:summary|profile).*?experience'
        ]
        
        years = 0
        text_lower = text.lower()
        
        # Try all patterns and take the maximum
        for pattern in experience_patterns:
            matches = re.findall(pattern, text_lower)
            if matches:
                for match in matches:
                    try:
                        years = max(years, int(match))
                    except ValueError:
                        continue
        
        # If no explicit experience mentioned, try to calculate from work history dates
        if years == 0:
            years = self._calculate_experience_from_dates(text)
        
        # If still no experience found, try to estimate from education graduation
        if years == 0:
            years = self._estimate_experience_from_education(text)
        
        # Extract company names (improved heuristic)
        companies = []
        lines = text.split('\n')
        for line in lines:
            line_stripped = line.strip()
            # Look for lines that might be company names
            company_indicators = ['inc', 'corp', 'ltd', 'llc', 'pvt', 'limited', 'company', 'technologies', 'systems', 'solutions', 'services']
            if any(indicator in line.lower() for indicator in company_indicators) and len(line_stripped) > 3:
                companies.append(line_stripped[:50])  # Limit length
        
        return {
            'years': years if years > 0 else None,
            'companies': companies[:3]  # Top 3 companies found
        }
    
    def _calculate_experience_from_dates(self, text: str) -> int:
        """Calculate years of experience from date ranges in resume."""
        import datetime
        current_year = datetime.datetime.now().year
        current_month = datetime.datetime.now().month
        
        # Look for date patterns like "2019-2023", "Jan 2020 - Dec 2022", etc.
        date_patterns = [
            r'(\d{4})\s*[-–]\s*(\d{4})',  # 2019-2023
            r'(\d{4})\s*[-–]\s*(?:present|current)',  # 2019-Present
            r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})\s*[-–]\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})',
            r'(\d{1,2})/(\d{4})\s*[-–]\s*(\d{1,2})/(\d{4})',  # MM/YYYY - MM/YYYY
            # Enhanced patterns for month-year formats like "Aug 2020 – July 2022"
            r'(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})\s*[-–]\s*(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})',
            r'(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})\s*[-–]\s*(?:present|current|now)',
            # Pattern for "July 2022 – Present" format
            r'(?:july|jul)\s*(\d{4})\s*[-–]\s*(?:present|current)',
            r'(?:august|aug)\s*(\d{4})\s*[-–]\s*(?:july|jul)\s*(\d{4})'
        ]
        
        total_years = 0
        date_ranges = []
        
        for pattern in date_patterns:
            matches = re.findall(pattern, text.lower())
            for match in matches:
                try:
                    if len(match) == 1:  # Single year to present
                        start_year = int(match[0])
                        end_year = current_year
                        if start_year > 1990 and start_year <= current_year:
                            years = end_year - start_year
                            # Add partial year if we're past mid-year
                            if current_month >= 6:
                                years += 0.5
                            date_ranges.append(years)
                    elif len(match) == 2:  # Year range pattern
                        start_year = int(match[0])
                        if 'present' in text.lower() or 'current' in text.lower():
                            end_year = current_year
                        else:
                            end_year = int(match[1])
                        if start_year > 1990 and end_year >= start_year:
                            date_ranges.append(end_year - start_year)
                except (ValueError, IndexError):
                    continue
        
        # Sum all non-overlapping date ranges
        if date_ranges:
            total_years = sum(date_ranges)
            # If multiple ranges, assume some overlap and reduce slightly
            if len(date_ranges) > 1:
                total_years = int(total_years * 0.9)  # 10% reduction for potential overlap
        
        return min(int(total_years), 50)  # Cap at 50 years to avoid unrealistic values
    
    def _estimate_experience_from_education(self, text: str) -> int:
        """Estimate experience years based on education graduation date."""
        import datetime
        current_year = datetime.datetime.now().year
        
        # Look for graduation years in education section
        graduation_patterns = [
            r'graduated\s*(?:in\s*)?(\d{4})',
            r'graduation\s*:?\s*(\d{4})',
            r'(\d{4})\s*[-–]\s*(\d{4})\s*.*(?:bachelor|master|degree)',
            r'(?:bachelor|master|degree).*(\d{4})'
        ]
        
        latest_graduation = 0
        for pattern in graduation_patterns:
            matches = re.findall(pattern, text.lower())
            for match in matches:
                try:
                    if isinstance(match, tuple):
                        year = int(match[-1])  # Take the last year from tuple
                    else:
                        year = int(match)
                    if 1990 <= year <= current_year:
                        latest_graduation = max(latest_graduation, year)
                except (ValueError, IndexError):
                    continue
        
        if latest_graduation > 0:
            # Estimate experience as years since graduation minus 1-2 years for job search
            estimated_years = current_year - latest_graduation - 1
            return max(0, min(estimated_years, 40))  # Cap between 0 and 40 years
        
        return 0

    def _extract_education(self, text: str) -> List[str]:
        """Extract education information."""
        text_lower = text.lower()
        education = []
        
        for keyword in self.education_keywords:
            if keyword in text_lower:
                # Find the line containing the education keyword
                lines = text.split('\n')
                for line in lines:
                    if keyword in line.lower():
                        education.append(line.strip())
                        break
        
        return list(set(education))[:3]  # Remove duplicates, max 3