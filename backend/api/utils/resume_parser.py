import re
import os
from docx import Document
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
            'current_position': self._extract_current_position(text),
            'current_company': self._extract_current_company(text),
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
        doc = Document(file_path)
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
        """Extract phone number from resume text with country code support."""
        phone_patterns = [
            r'\+\d{1,4}[-.\s]?\d{10}',  # +91 9345863300 or +1-1234567890
            r'\+\d{1,4}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',  # +91-934-586-3300
            r'\+\d{1,4}[-.\s]?\(\d{3}\)[-.\s]?\d{3}[-.\s]?\d{4}',  # +1 (123) 456-7890
            r'\b\d{3}-\d{3}-\d{4}\b',  # 123-456-7890
            r'\b\(\d{3}\)\s*\d{3}-\d{4}\b',  # (123) 456-7890
            r'\b\d{3}\.\d{3}\.\d{4}\b',  # 123.456.7890
            r'\b\d{10}\b',  # 1234567890
        ]

        for pattern in phone_patterns:
            phones = re.findall(pattern, text)
            if phones:
                # Return phone with country code if present
                return phones[0].strip()

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

    def _extract_current_position(self, text: str) -> str:
        """Extract current job title/position from resume text, focusing on summary section."""
        
        # First, try to find the summary section explicitly
        summary_position = self._extract_from_summary(text)
        if summary_position:
            return summary_position
            
        # Second, try fallback patterns
        patterns_position = self._extract_from_patterns(text)
        if patterns_position:
            return patterns_position
            
        # Third, if still no position found, analyze experience section to infer job title
        experience_position = self._extract_from_experience_section(text)
        if experience_position:
            return experience_position
            
        return ""
    
    def _extract_from_summary(self, text: str) -> str:
        """Extract position from summary/objective section specifically."""
        text_lines = text.split('\n')
        summary_section = []
        in_summary = False
        
        # Common summary section headers
        summary_headers = [
            'summary', 'professional summary', 'career summary', 'profile',
            'objective', 'career objective', 'professional objective',
            'about', 'overview', 'introduction', 'professional profile'
        ]
        
        # First, check if the very first line might be a job title (no summary header)
        if text_lines and text_lines[0].strip():
            first_line = text_lines[0].strip()
            job_title = self._extract_job_title_from_text(first_line)
            if job_title:
                return job_title
        
        # Look for explicit summary sections
        for i, line in enumerate(text_lines):
            line_clean = line.strip().lower()
            
            # Check if we're entering a summary section
            if any(header in line_clean for header in summary_headers):
                if len(line_clean) < 50:  # Header line, not content
                    in_summary = True
                    continue
            
            # Check if we're leaving summary section (new section header)
            if in_summary and line_clean and not line_clean.startswith('-') and not line_clean.startswith('•'):
                # Check if this might be a new section
                common_sections = ['experience', 'education', 'skills', 'employment', 'work history', 'qualifications', 'certifications']
                if any(section in line_clean for section in common_sections) and len(line_clean) < 30:
                    break
            
            # Collect summary content
            if in_summary and line.strip():
                summary_section.append(line.strip())
                if len(summary_section) > 10:  # Limit to prevent overreading
                    break
        
        # Extract job title from summary content
        if summary_section:
            summary_text = ' '.join(summary_section)
            return self._extract_job_title_from_text(summary_text)
        
        # If no explicit summary found, check first few lines as potential summary
        if not summary_section and len(text_lines) > 1:
            # Treat first 3 lines as summary if they contain descriptive content
            potential_summary = []
            for i, line in enumerate(text_lines[:3]):
                if line.strip() and len(line.strip()) > 20:  # Skip short lines
                    potential_summary.append(line.strip())
            
            if potential_summary:
                summary_text = ' '.join(potential_summary)
                return self._extract_job_title_from_text(summary_text)
        
        return ""
    
    def _extract_job_title_from_text(self, text: str) -> str:
        """Extract job title from a given text using patterns."""
        
        # First, try to extract job title from the very beginning of text (like "React.js Developer")
        text_stripped = text.strip()
        if text_stripped:
            # Check if text starts with a job title pattern
            first_line = text_stripped.split('\n')[0].strip()
            
            # Patterns for job titles at the beginning of text
            beginning_patterns = [
                # Technology-specific developers (React.js Developer, Node.js Developer, etc.)
                r'^([a-zA-Z]+\.?[a-zA-Z]*\.?\s+developer)(?=\s)',
                r'^([a-zA-Z]+\.?[a-zA-Z]*\.?\s+engineer)(?=\s)',
                
                # Standard job titles at beginning
                r'^((?:senior|sr\.?|lead|principal|chief)\s+(?:software\s+)?(?:engineer|developer|architect|analyst|consultant|manager))(?=\s)',
                r'^((?:software|web|mobile|full[\s-]?stack|backend|frontend|front[\s-]?end|back[\s-]?end)\s+(?:engineer|developer))(?=\s)',
                r'^((?:data|business|systems?|security|devops|cloud)\s+(?:engineer|analyst|architect|scientist|specialist))(?=\s)',
                r'^((?:product|project|technical|engineering)\s+manager)(?=\s)',
                r'^((?:ui|ux|product)\s+designer)(?=\s)',
                r'^((?:qa|quality\s+assurance)\s+(?:engineer|analyst|tester))(?=\s)',
                
                # Generic titles at beginning
                r'^(developer|engineer|architect|analyst|consultant|designer|manager|specialist|scientist|researcher)(?=\s)',
            ]
            
            for pattern in beginning_patterns:
                match = re.search(pattern, first_line, re.IGNORECASE)
                if match:
                    job_title = match.group(1).strip()
                    if len(job_title) > 3 and len(job_title) < 60:
                        # Proper capitalization
                        return ' '.join(word.capitalize() for word in job_title.split())
        
        # Enhanced job title patterns for summary extraction (fallback)
        position_patterns = [
            # Direct job title mentions
            r'(?:i\s+am\s+a|i\s+am\s+an|i\s+work\s+as\s+a|i\s+work\s+as\s+an)\s+([^,.]{10,50})',
            r'(?:experienced|skilled|professional)\s+([^,.]{10,50}?)(?:\s+with|\s+having)',
            r'(?:as\s+a|as\s+an)\s+([^,.]{10,50}?)(?:\s+at|\s+with|\s+,)',
            
            # Common job titles with context
            r'(?:senior|sr\.?|lead|principal|chief)\s+(?:software\s+)?(?:engineer|developer|architect|analyst|consultant|manager)',
            r'(?:software|web|mobile|full[\s-]?stack|backend|frontend|front[\s-]?end|back[\s-]?end)\s+(?:engineer|developer)',
            r'(?:data|business|systems?|security|devops|cloud)\s+(?:engineer|analyst|architect|scientist|specialist)',
            r'(?:product|project|technical|engineering)\s+manager',
            r'(?:ui|ux|product)\s+designer',
            r'(?:qa|quality\s+assurance)\s+(?:engineer|analyst|tester)',
            
            # Single titles in context
            r'(?:^|\s)(developer|engineer|analyst|consultant|architect|designer|manager|specialist|scientist|researcher)(?=\s+with|\s+at|\s+having|\s*,|\s*\.)',
        ]
        
        text_lower = text.lower()
        
        # Try each pattern
        for pattern in position_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            if matches:
                # Clean and format the first match
                job_title = matches[0].strip()
                if len(job_title) > 3 and len(job_title) < 60:
                    # Capitalize properly
                    return ' '.join(word.capitalize() for word in job_title.split())
        
        return ""
    
    def _extract_from_patterns(self, text: str) -> str:
        """Fallback extraction from general patterns."""
        text_lines = text.split('\n')
        
        # Look in the first 10 lines for job titles (usually in header)
        for line in text_lines[:10]:
            line_clean = line.strip()
            if len(line_clean) > 3 and len(line_clean) < 100:
                job_title = self._extract_job_title_from_text(line_clean)
                if job_title:
                    return job_title
        
        # Look for current position indicators throughout the text
        current_indicators = [
            r'current\s*(?:position|role|job)\s*:?\s*([^\n]{10,80})',
            r'currently\s*(?:working\s*as|employed\s*as)\s*([^\n]{10,80})',
            r'present\s*position\s*:?\s*([^\n]{10,80})',
            r'(?:present|current)\s*[-–]\s*([^\n]{10,80})',
        ]
        
        text_lower = text.lower()
        for pattern in current_indicators:
            matches = re.findall(pattern, text_lower)
            if matches:
                position = matches[0].strip()
                if len(position) > 5 and len(position) < 80:
                    # Clean up the position
                    position = re.sub(r'^\W+|\W+$', '', position)  # Remove leading/trailing non-word chars
                    return position.title()
        
        return ''

    def _extract_from_experience_section(self, text: str) -> str:
        """Extract job title by analyzing experience section, skills section, and mentioned technologies/roles."""
        
        # Find experience section
        text_lines = text.split('\n')
        experience_content = []
        skills_content = []
        in_experience = False
        in_skills = False
        
        # Experience section headers
        experience_headers = [
            'experience', 'work experience', 'professional experience', 'employment',
            'work history', 'career history', 'professional background'
        ]
        
        # Skills section headers
        skills_headers = [
            'skills', 'technical skills', 'key skills', 'core skills', 'competencies',
            'technologies', 'tools', 'programming languages', 'frameworks'
        ]
        
        for line in text_lines:
            line_clean = line.strip().lower()
            
            # Check if we're entering experience section
            if any(header in line_clean for header in experience_headers):
                if len(line_clean) < 50:  # Header line
                    in_experience = True
                    in_skills = False
                    continue
            
            # Check if we're entering skills section
            if any(header in line_clean for header in skills_headers):
                if len(line_clean) < 50:  # Header line
                    in_skills = True
                    in_experience = False
                    continue
            
            # Stop at other major sections
            if (in_experience or in_skills) and line_clean:
                stop_sections = ['education', 'projects', 'certifications', 'awards', 'contact', 'references']
                if any(section in line_clean for section in stop_sections) and len(line_clean) < 30:
                    in_experience = False
                    in_skills = False
                    continue
            
            # Collect experience content
            if in_experience and line.strip():
                experience_content.append(line.strip())
                if len(experience_content) > 20:  # Limit content
                    break
                    
            # Collect skills content
            if in_skills and line.strip():
                skills_content.append(line.strip())
                if len(skills_content) > 15:  # Limit content
                    in_skills = False
        
        # If no explicit experience section, use first part of resume
        if not experience_content:
            experience_content = [line.strip() for line in text_lines[5:15] if line.strip()]
        
        # Combine experience and skills content for analysis
        combined_content = experience_content + skills_content
        combined_text = ' '.join(combined_content).lower()
        
        return self._infer_job_title_from_technologies_and_skills(combined_text)
    
    def _infer_job_title_from_technologies_and_skills(self, text: str) -> str:
        """Infer job title based on technologies, tools, and skills mentioned in experience and skills sections."""
        
        # Enhanced technology and skills to job title mapping
        tech_mappings = {
            # Frontend Technologies
            'react': 'React Developer',
            'reactjs': 'React Developer',
            'react.js': 'React Developer',
            'angular': 'Angular Developer', 
            'angularjs': 'Angular Developer',
            'vue': 'Vue.js Developer',
            'vue.js': 'Vue.js Developer',
            'vuejs': 'Vue.js Developer',
            'javascript': 'Frontend Developer',
            'typescript': 'Frontend Developer',
            'html': 'Frontend Developer',
            'html5': 'Frontend Developer',
            'css': 'Frontend Developer',
            'css3': 'Frontend Developer',
            'scss': 'Frontend Developer',
            'sass': 'Frontend Developer',
            'bootstrap': 'Frontend Developer',
            'tailwind': 'Frontend Developer',
            'jquery': 'Frontend Developer',
            'webpack': 'Frontend Developer',
            'next.js': 'Next.js Developer',
            'nextjs': 'Next.js Developer',
            'nuxt': 'Vue.js Developer',
            'gatsby': 'React Developer',
            
            # Backend Technologies  
            'node.js': 'Node.js Developer',
            'nodejs': 'Node.js Developer',
            'node': 'Node.js Developer',
            'python': 'Python Developer',
            'java': 'Java Developer',
            'c#': 'C# Developer',
            'csharp': 'C# Developer',
            'php': 'PHP Developer',
            'ruby': 'Ruby Developer',
            'go': 'Go Developer',
            'golang': 'Go Developer',
            'rust': 'Rust Developer',
            'scala': 'Scala Developer',
            'kotlin': 'Kotlin Developer',
            'django': 'Python Developer',
            'flask': 'Python Developer',
            'fastapi': 'Python Developer',
            'spring': 'Java Developer',
            'spring boot': 'Java Developer',
            'express': 'Node.js Developer',
            'express.js': 'Node.js Developer',
            'laravel': 'PHP Developer',
            'symfony': 'PHP Developer',
            'rails': 'Ruby Developer',
            'ruby on rails': 'Ruby Developer',
            '.net': 'C# Developer',
            'dotnet': 'C# Developer',
            'asp.net': 'C# Developer',
            
            # Full Stack Indicators
            'full stack': 'Full Stack Developer',
            'fullstack': 'Full Stack Developer',
            'full-stack': 'Full Stack Developer',
            'mern': 'MERN Stack Developer',
            'mean': 'MEAN Stack Developer',
            'lamp': 'Full Stack Developer',
            
            # Mobile Technologies
            'android': 'Android Developer',
            'ios': 'iOS Developer',
            'react native': 'React Native Developer',
            'flutter': 'Flutter Developer',
            'dart': 'Flutter Developer',
            'swift': 'iOS Developer',
            'objective-c': 'iOS Developer',
            'xamarin': 'Xamarin Developer',
            'cordova': 'Mobile Developer',
            'phonegap': 'Mobile Developer',
            'ionic': 'Mobile Developer',
            
            # Data & Analytics
            'r': 'Data Analyst',
            'sql': 'Database Developer',
            'mysql': 'Database Developer', 
            'postgresql': 'Database Developer',
            'postgres': 'Database Developer',
            'mongodb': 'Database Developer',
            'redis': 'Database Developer',
            'elasticsearch': 'Database Developer',
            'pandas': 'Data Analyst',
            'numpy': 'Data Analyst',
            'scipy': 'Data Scientist',
            'scikit-learn': 'Machine Learning Engineer',
            'sklearn': 'Machine Learning Engineer',
            'machine learning': 'Machine Learning Engineer',
            'deep learning': 'Machine Learning Engineer',
            'artificial intelligence': 'AI Engineer',
            'tensorflow': 'Machine Learning Engineer',
            'pytorch': 'Machine Learning Engineer',
            'keras': 'Machine Learning Engineer',
            'data science': 'Data Scientist',
            'data analysis': 'Data Analyst',
            'data visualization': 'Data Analyst',
            'tableau': 'Data Analyst',
            'power bi': 'Business Intelligence Analyst',
            'excel': 'Data Analyst',
            'spark': 'Data Engineer',
            'hadoop': 'Data Engineer',
            'kafka': 'Data Engineer',
            'airflow': 'Data Engineer',
            
            # DevOps & Cloud
            'aws': 'Cloud Engineer',
            'amazon web services': 'Cloud Engineer',
            'azure': 'Cloud Engineer',
            'microsoft azure': 'Cloud Engineer',
            'google cloud': 'Cloud Engineer',
            'gcp': 'Cloud Engineer',
            'docker': 'DevOps Engineer',
            'kubernetes': 'DevOps Engineer',
            'k8s': 'DevOps Engineer',
            'jenkins': 'DevOps Engineer',
            'gitlab ci': 'DevOps Engineer',
            'github actions': 'DevOps Engineer',
            'terraform': 'DevOps Engineer',
            'ansible': 'DevOps Engineer',
            'chef': 'DevOps Engineer',
            'puppet': 'DevOps Engineer',
            'vagrant': 'DevOps Engineer',
            'linux': 'System Administrator',
            'ubuntu': 'System Administrator',
            'centos': 'System Administrator',
            'bash': 'System Administrator',
            'shell scripting': 'System Administrator',
            
            # Testing & QA
            'selenium': 'Test Automation Engineer',
            'cypress': 'Test Automation Engineer',
            'jest': 'Test Automation Engineer',
            'junit': 'Test Automation Engineer',
            'pytest': 'Test Automation Engineer',
            'testing': 'QA Engineer',
            'quality assurance': 'QA Engineer',
            'qa': 'QA Engineer',
            'automation testing': 'Test Automation Engineer',
            'manual testing': 'QA Engineer',
            
            # Other Specializations
            'unity': 'Game Developer',
            'unreal engine': 'Game Developer',
            'unreal': 'Game Developer',
            'c++': 'C++ Developer',
            'game development': 'Game Developer',
            'wordpress': 'WordPress Developer',
            'shopify': 'Shopify Developer',
            'magento': 'Magento Developer',
            'drupal': 'Drupal Developer',
            'salesforce': 'Salesforce Developer',
            'sap': 'SAP Developer',
            'oracle': 'Oracle Developer',
            'blockchain': 'Blockchain Developer',
            'solidity': 'Blockchain Developer',
            'ethereum': 'Blockchain Developer',
            'web3': 'Web3 Developer',
            'cryptocurrency': 'Blockchain Developer',
            
            # Design & UI/UX
            'ui': 'UI Designer',
            'ux': 'UX Designer',
            'ui/ux': 'UI/UX Designer',
            'figma': 'UI/UX Designer',
            'sketch': 'UI Designer',
            'adobe xd': 'UI Designer',
            'photoshop': 'Graphic Designer',
            'illustrator': 'Graphic Designer',
            'after effects': 'Motion Designer',
            'web design': 'Web Designer',
            'graphic design': 'Graphic Designer',
            
            # Security
            'cybersecurity': 'Security Engineer',
            'information security': 'Security Engineer',
            'penetration testing': 'Security Engineer',
            'ethical hacking': 'Security Engineer',
            'security': 'Security Engineer'
        }
        
        # Count technology mentions
        tech_scores = {}
        for tech, job_title in tech_mappings.items():
            if tech in text:
                tech_scores[job_title] = tech_scores.get(job_title, 0) + 1
        
        # Special combinations for better accuracy
        if 'react' in text and 'node' in text:
            tech_scores['Full Stack Developer'] = tech_scores.get('Full Stack Developer', 0) + 3
        
        if 'angular' in text and ('java' in text or 'spring' in text):
            tech_scores['Full Stack Developer'] = tech_scores.get('Full Stack Developer', 0) + 3
            
        if 'python' in text and ('django' in text or 'flask' in text):
            tech_scores['Python Developer'] = tech_scores.get('Python Developer', 0) + 2
            
        # Look for explicit developer mentions in experience
        developer_mentions = [
            r'worked as.*?([a-zA-Z\s]+developer)',
            r'role.*?([a-zA-Z\s]+developer)',
            r'position.*?([a-zA-Z\s]+developer)',
            r'([a-zA-Z\s]+developer).*?experience',
            r'([a-zA-Z\s]+engineer).*?experience'
        ]
        
        for pattern in developer_mentions:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                match_clean = match.strip()
                if len(match_clean) > 5 and len(match_clean) < 40:
                    # High priority for explicit mentions
                    title = ' '.join(word.capitalize() for word in match_clean.split())
                    tech_scores[title] = tech_scores.get(title, 0) + 5
        
        # Return the highest scoring job title
        if tech_scores:
            best_title = max(tech_scores.keys(), key=lambda k: tech_scores[k])
            return best_title
            
        return ""

    def _extract_current_company(self, text: str) -> str:
        """Extract current company from resume text."""
        # Company name indicators
        company_patterns = [
            r'currently\s*(?:working\s*)?(?:at|with|for)\s*([^\n]{5,50})',
            r'present\s*(?:employer|company)\s*:?\s*([^\n]{5,50})',
            r'current\s*(?:employer|company)\s*:?\s*([^\n]{5,50})',
            r'working\s*at\s*([^\n]{5,50})',
            r'employed\s*(?:at|by)\s*([^\n]{5,50})',
        ]
        
        text_lower = text.lower()
        for pattern in company_patterns:
            matches = re.findall(pattern, text_lower)
            if matches:
                company = matches[0].strip()
                if len(company) > 2 and len(company) < 60:
                    # Clean up the company name
                    company = re.sub(r'^\W+|\W+$', '', company)  # Remove leading/trailing non-word chars
                    # Capitalize properly
                    words = company.split()
                    capitalized = []
                    for word in words:
                        if word.lower() in ['inc', 'corp', 'ltd', 'llc', 'co', 'company', 'technologies', 'tech', 'systems', 'solutions', 'services']:
                            capitalized.append(word.title())
                        else:
                            capitalized.append(word.capitalize())
                    return ' '.join(capitalized)
        
        # Look for company indicators near date ranges
        lines = text.split('\n')
        for i, line in enumerate(lines):
            line_lower = line.lower()
            # Look for present/current indicators
            if any(indicator in line_lower for indicator in ['present', 'current']):
                # Look in surrounding lines for company names
                search_lines = lines[max(0, i-3):i+4]  # Check 3 lines before and after
                for search_line in search_lines:
                    search_line_clean = search_line.strip()
                    # Common company suffixes
                    company_suffixes = ['inc', 'corp', 'ltd', 'llc', 'pvt', 'limited', 'company', 'technologies', 'systems', 'solutions', 'services']
                    if any(suffix in search_line.lower() for suffix in company_suffixes) and len(search_line_clean) > 3:
                        if len(search_line_clean) < 80:  # Reasonable company name length
                            return search_line_clean
        
        return ''