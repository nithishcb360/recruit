import re
import os
from typing import Dict, List, Any, Optional
import json

# Simple imports without heavy ML dependencies
try:
    import pdfplumber
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False


class SimpleComprehensiveParser:
    """
    Lightweight comprehensive resume parser without ML dependencies
    """

    def __init__(self):
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        self.phone_pattern = re.compile(r'(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}')
        self.linkedin_pattern = re.compile(r'(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-_]+/?', re.IGNORECASE)
        self.github_pattern = re.compile(r'(?:https?://)?(?:www\.)?github\.com/[\w\-_]+/?', re.IGNORECASE)

        # Technical skills
        self.technical_skills = [
            'python', 'javascript', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
            'react', 'angular', 'vue', 'django', 'flask', 'spring', 'laravel',
            'mysql', 'postgresql', 'mongodb', 'redis', 'aws', 'azure', 'docker',
            'kubernetes', 'jenkins', 'git', 'linux', 'windows', 'macos',
            'html', 'css', 'sass', 'bootstrap', 'tailwind', 'node.js', 'express'
        ]

    def parse_resume(self, file_path: str, original_filename: str = None) -> Dict[str, Any]:
        """Parse resume with comprehensive data extraction and robust error handling"""
        try:
            # Use original filename if provided, otherwise extract from file_path
            filename = original_filename if original_filename else os.path.basename(file_path)
            print(f"Parsing resume: {filename}")

            # PRIORITY 1: Filename experience extraction (highest priority)
            experience_years = None
            filename_experience = None
            try:
                filename_experience = self._extract_experience_from_filename(filename)
                if filename_experience and filename_experience.get('months'):
                    # Convert months to years for consistency
                    experience_years = round(filename_experience['months'] / 12, 1)
                    print(f"FILENAME PRIORITY: Extracted {experience_years} years from filename: {filename}")
            except Exception as filename_error:
                print(f"Filename experience extraction error: {filename_error}")

            # Extract text with robust error handling
            text = ""
            try:
                text = self._extract_text_from_file(file_path)
                if not text or len(text.strip()) < 10:
                    # If we have filename experience but no text, still try to return useful data
                    if filename_experience:
                        return {
                            'name': '',
                            'email': '',
                            'phone': '',
                            'experience_years': experience_years,
                            'experience': {
                                'years': experience_years,
                                'extraction_method': 'filename',
                                'months': filename_experience['months'],
                                'source': filename_experience.get('source', 'filename')
                            },
                            'skills': [],
                            'text': 'Text extraction failed, but filename experience extracted successfully'
                        }
                    else:
                        return {'error': 'Could not extract meaningful text from file'}
            except Exception as text_error:
                print(f"Text extraction failed: {text_error}")
                # If we have filename experience, return that even if text extraction failed
                if filename_experience:
                    return {
                        'name': '',
                        'email': '',
                        'phone': '',
                        'experience_years': experience_years,
                        'experience': {
                            'years': experience_years,
                            'extraction_method': 'filename',
                            'months': filename_experience['months'],
                            'source': filename_experience.get('source', 'filename')
                        },
                        'skills': [],
                        'text': f'Text extraction failed: {text_error}, but filename experience extracted successfully'
                    }
                else:
                    return {'error': f'Text extraction failed: {text_error}'}

            # Parse all fields with individual error handling
            result = {'text': text[:1000]}  # Truncate text for preview

            # Parse each field safely
            safe_extractions = [
                ('name', self._extract_name),
                ('email', self._extract_email),
                ('phone', self._extract_phone),
                ('location', self._extract_location),
                ('summary', self._extract_summary),
                ('skills', self._extract_skills),
                ('current_position', self._extract_current_position),
                ('current_company', self._extract_current_company),
                ('education', self._extract_education),
                ('projects', self._extract_projects),
                ('certifications', self._extract_certifications),
                ('languages', self._extract_languages),
                ('achievements', self._extract_achievements),
                ('linkedin_url', self._extract_linkedin),
                ('github_url', self._extract_github),
                ('portfolio_url', self._extract_portfolio),
                ('visa_status', self._extract_visa_status),
                ('notice_period', self._extract_notice_period),
                ('work_experience', self._extract_work_experience)
            ]

            for field_name, extraction_func in safe_extractions:
                try:
                    result[field_name] = extraction_func(text)
                except Exception as field_error:
                    print(f"Error extracting {field_name}: {field_error}")
                    result[field_name] = '' if field_name in ['name', 'email', 'phone', 'location', 'summary',
                                                              'current_position', 'current_company', 'linkedin_url',
                                                              'github_url', 'portfolio_url', 'visa_status', 'notice_period'] else []

            # Extract experience years safely
            if experience_years:
                result['experience_years'] = experience_years
            else:
                try:
                    result['experience_years'] = self._extract_experience_years(text)
                except Exception as exp_error:
                    print(f"Error extracting experience years: {exp_error}")
                    result['experience_years'] = None

            # Add experience metadata if extracted from filename
            if filename_experience:
                result['experience'] = {
                    'years': experience_years,
                    'extraction_method': 'filename',
                    'months': filename_experience['months'],
                    'source': filename_experience.get('source', 'filename')
                }

            # Clean and return
            return self._clean_data(result)

        except UnicodeEncodeError as unicode_error:
            print(f"Unicode encoding error: {unicode_error}")
            # Try to return at least filename experience if available
            if 'filename_experience' in locals() and filename_experience:
                return {
                    'name': '',
                    'email': '',
                    'phone': '',
                    'experience_years': experience_years,
                    'experience': {
                        'years': experience_years,
                        'extraction_method': 'filename',
                        'months': filename_experience['months'],
                        'source': filename_experience.get('source', 'filename')
                    },
                    'skills': [],
                    'text': f'Unicode error occurred: {unicode_error}, but filename experience extracted successfully'
                }
            else:
                return {'error': f'Unicode encoding error: {unicode_error}'}
        except Exception as e:
            print(f"Simple parser error: {e}")
            return {'error': f'Error parsing resume: {str(e)}'}

    def _extract_text_from_file(self, file_path: str) -> str:
        """Extract text from file with robust Unicode and error handling"""
        try:
            if file_path.lower().endswith('.pdf') and PDF_AVAILABLE:
                text = ""
                try:
                    with pdfplumber.open(file_path) as pdf:
                        for page_num, page in enumerate(pdf.pages):
                            try:
                                page_text = page.extract_text()
                                if page_text:
                                    # Clean each page's text immediately to prevent accumulation of problematic chars
                                    cleaned_page_text = self._clean_unicode_text(page_text)
                                    text += cleaned_page_text + "\n"
                            except Exception as page_error:
                                print(f"Error extracting text from page {page_num}: {page_error}")
                                # Continue with other pages
                                continue
                    return text.strip()
                except Exception as pdf_error:
                    print(f"PDF extraction error: {pdf_error}")
                    return ""

            elif file_path.lower().endswith('.docx') and DOCX_AVAILABLE:
                try:
                    doc = Document(file_path)
                    paragraphs = []
                    for para in doc.paragraphs:
                        if para.text:
                            # Clean each paragraph to prevent Unicode issues
                            cleaned_para = self._clean_unicode_text(para.text)
                            paragraphs.append(cleaned_para)
                    return '\n'.join(paragraphs)
                except Exception as docx_error:
                    print(f"DOCX extraction error: {docx_error}")
                    return ""

            else:
                # Try to read as text file with multiple encoding attempts
                encodings_to_try = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']

                for encoding in encodings_to_try:
                    try:
                        with open(file_path, 'r', encoding=encoding, errors='replace') as f:
                            text = f.read()
                        return self._clean_unicode_text(text)
                    except Exception as encoding_error:
                        print(f"Failed to read with {encoding} encoding: {encoding_error}")
                        continue

                # Final fallback - read as binary and decode with errors='ignore'
                try:
                    with open(file_path, 'rb') as f:
                        raw_data = f.read()
                    text = raw_data.decode('utf-8', errors='ignore')
                    return self._clean_unicode_text(text)
                except Exception as final_error:
                    print(f"Final fallback failed: {final_error}")
                    return ""

        except Exception as e:
            print(f"Overall text extraction error: {e}")
            return ""

    def _clean_unicode_text(self, text: str) -> str:
        """Clean text from problematic Unicode characters"""
        if not text:
            return ""

        try:
            # Replace problematic Unicode characters with safe alternatives
            replacements = {
                '\U0001f4de': 'phone',  # 📞 phone emoji
                '\U0001f4e7': 'email',  # 📧 email emoji
                '\U0001f4cd': '',       # 📍 location emoji
                '\U0001f310': '',       # 🌐 globe emoji
                '\U0001f517': '',       # 🔗 link emoji
                '\u2022': '•',          # bullet point
                '\u2013': '-',          # en dash
                '\u2014': '-',          # em dash
                '\u2019': "'",          # right single quotation mark
                '\u201c': '"',          # left double quotation mark
                '\u201d': '"',          # right double quotation mark
                '\u27a2': '->',         # ➢ black right-pointing triangle (arrow)
                '\u2192': '->',         # → rightwards arrow
                '\u2190': '<-',         # ← leftwards arrow
                '\u2191': '^',          # ↑ upwards arrow
                '\u2193': 'v',          # ↓ downwards arrow
                '\u25b6': '->',         # ▶ black right-pointing triangle
                '\u25c0': '<-',         # ◀ black left-pointing triangle
                '\u25ba': '->',         # ► black right-pointing pointer
                '\u25c4': '<-',         # ◄ black left-pointing pointer
            }

            for old, new in replacements.items():
                text = text.replace(old, new)

            # More aggressive Unicode cleaning for problematic characters
            # Convert to UTF-8 bytes and then back, handling errors gracefully
            try:
                # First try to encode to utf-8 and decode back
                text = text.encode('utf-8', errors='replace').decode('utf-8')
            except Exception:
                pass

            # Remove any remaining non-printable characters but keep newlines and tabs
            cleaned_chars = []
            for char in text:
                if char.isprintable() or char in '\n\t\r ':
                    cleaned_chars.append(char)
                else:
                    # Replace other problematic chars with space
                    cleaned_chars.append(' ')

            text = ''.join(cleaned_chars)

            # Clean up multiple spaces
            text = ' '.join(text.split())

            return text.strip()
        except Exception as e:
            print(f"Unicode cleaning error: {e}")
            # Fallback: more aggressive cleaning - encode to ASCII and ignore errors
            try:
                return text.encode('ascii', errors='ignore').decode('ascii')
            except Exception:
                # Ultimate fallback: return empty string
                return ""

    def _extract_name(self, text: str) -> str:
        """Extract name from first few lines"""
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        for line in lines[:5]:
            if (len(line.split()) >= 2 and
                len(line) < 50 and
                not any(char.isdigit() for char in line) and
                '@' not in line and
                'http' not in line.lower()):
                return line
        return ""

    def _extract_email(self, text: str) -> str:
        """Extract email with better validation"""
        emails = self.email_pattern.findall(text)
        if emails:
            # Take the first email and clean it from any surrounding text
            email = emails[0].strip()
            # Remove any trailing non-email characters (like |GitHub|LinkedIn)
            if '|' in email:
                email = email.split('|')[0].strip()
            if ' ' in email:
                email = email.split(' ')[0].strip()
            # Validate that it's still a proper email
            if '@' in email and '.' in email.split('@')[1]:
                return email
        return ""

    def _extract_phone(self, text: str) -> str:
        """Extract phone"""
        phones = self.phone_pattern.findall(text)
        return phones[0] if phones else ""

    def _extract_location(self, text: str) -> str:
        """Extract location"""
        location_patterns = [
            r'(?:address|location|based in|located in)[\s:]+([^\n]+)',
            r'([A-Za-z\s]+,\s*[A-Za-z]{2}\s*\d{5})',
            r'([A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Za-z\s]+)'
        ]

        for pattern in location_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0].strip()
        return ""

    def _extract_summary(self, text: str) -> str:
        """Extract professional summary"""
        summary_patterns = [
            r'(?:summary|profile|about|overview|objective)[\s:]*\n(.*?)(?:\n\s*\n|\n[A-Z])',
            r'(?:professional\s+summary|career\s+summary)[\s:]*\n(.*?)(?:\n\s*\n|\n[A-Z])'
        ]

        for pattern in summary_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
            if matches:
                summary = matches[0].strip()
                if len(summary) > 50:
                    return summary
        return ""

    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills"""
        text_lower = text.lower()
        found_skills = []

        for skill in self.technical_skills:
            if skill.lower() in text_lower:
                found_skills.append(skill)

        return list(set(found_skills))

    def _extract_experience_years(self, text: str) -> Optional[int]:
        """Extract years of experience with comprehensive patterns"""
        # Priority 1: Try enhanced experience extraction first
        try:
            from .enhanced_experience_extractor import EnhancedExperienceExtractor
            extractor = EnhancedExperienceExtractor()
            enhanced_years = extractor.extract_total_experience(text, fallback_to_pyresparser=False)
            if enhanced_years > 0:
                return enhanced_years
        except Exception as e:
            print(f"Enhanced experience extraction failed: {e}")

        # Priority 2: Comprehensive regex patterns
        patterns = [
            # Direct experience statements
            r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:work\s*)?experience',
            r'experience\s*:?\s*(\d+)\+?\s*years?',
            r'(\d+)\+?\s*yrs?\s*(?:of\s*)?(?:work\s*)?experience',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:professional\s*)?work',
            r'(\d+)\+?\s*years?\s*in\s*(?:the\s*)?(?:field|industry|software|development|engineering)',
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
        ]

        max_years = 0
        for pattern in patterns:
            try:
                matches = re.findall(pattern, text, re.IGNORECASE)
                for match in matches:
                    if isinstance(match, tuple):
                        # Handle tuples from grouped patterns
                        for group in match:
                            if group and str(group).isdigit():
                                years = int(group)
                                if 0 < years <= 50:  # Sanity check
                                    max_years = max(max_years, years)
                                    break
                    elif match and str(match).isdigit():
                        years = int(match)
                        if 0 < years <= 50:  # Sanity check
                            max_years = max(max_years, years)
            except (ValueError, re.error) as e:
                print(f"Error processing pattern {pattern}: {e}")
                continue

        if max_years > 0:
            return max_years

        # Priority 3: Calculate from date ranges if no explicit mention found
        try:
            calculated_years = self._calculate_experience_from_dates(text)
            if calculated_years > 0:
                return calculated_years
        except Exception as e:
            print(f"Date calculation failed: {e}")

        return None

    def _calculate_experience_from_dates(self, text: str) -> int:
        """Calculate experience from employment date ranges"""
        date_patterns = [
            r'(\d{4})\s*[-–—]\s*(\d{4})',  # 2019-2023
            r'(\d{4})\s*[-–—]\s*(?:present|current|now)',  # 2019-Present
            r'(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})\s*[-–—]\s*(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})',
            r'(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})\s*[-–—]\s*(?:present|current|now)',
        ]

        date_ranges = []
        current_year = 2024

        for pattern in date_patterns:
            try:
                matches = re.findall(pattern, text, re.IGNORECASE)
                for match in matches:
                    if isinstance(match, tuple) and len(match) >= 2:
                        # Extract years from the match
                        years_in_match = [int(m) for m in match if str(m).isdigit() and len(str(m)) == 4]
                        if len(years_in_match) >= 2:
                            start_year, end_year = years_in_match[0], years_in_match[1]
                        elif len(years_in_match) == 1:
                            start_year = years_in_match[0]
                            end_year = current_year  # Present
                        else:
                            continue
                    elif len(match) == 1:
                        # Single year to present
                        start_year = int(match)
                        end_year = current_year
                    else:
                        continue

                    if 1990 <= start_year <= end_year <= current_year:
                        date_ranges.append((start_year, end_year))
            except (ValueError, re.error):
                continue

        if not date_ranges:
            return 0

        # Sort ranges and merge overlapping ones
        sorted_ranges = sorted(date_ranges, key=lambda x: x[0])
        merged_ranges = []

        for start, end in sorted_ranges:
            if merged_ranges and start <= merged_ranges[-1][1]:
                # Overlapping range - merge
                merged_ranges[-1] = (merged_ranges[-1][0], max(merged_ranges[-1][1], end))
            else:
                # Non-overlapping range - add new
                merged_ranges.append((start, end))

        # Calculate total years
        total_years = sum(end - start for start, end in merged_ranges)
        return min(total_years, 50)  # Cap at 50 years

    def _extract_current_position(self, text: str) -> str:
        """Extract current position"""
        lines = text.split('\n')[:10]
        for line in lines:
            if any(keyword in line.lower() for keyword in
                  ['developer', 'engineer', 'manager', 'analyst', 'architect']):
                return line.strip()
        return ""

    def _extract_current_company(self, text: str) -> str:
        """Extract current company"""
        patterns = [
            r'(?:currently at|working at|employed at)[\s:]*([^\n]+)',
            r'(@|at)\s*([A-Z][A-Za-z\s&,\.]+)(?:\s*\||\s*-|\s*\n)'
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                if isinstance(matches[0], tuple):
                    return matches[0][1].strip()
                return matches[0].strip()
        return ""

    def _extract_education(self, text: str) -> List[str]:
        """Extract education"""
        education = []
        edu_patterns = [
            r'(bachelor|master|phd|doctorate|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?)[\s\']*(?:of|in)?\s*([^\n]+)',
        ]

        for pattern in edu_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    education.append(f"{match[0]} {match[1]}".strip())
                else:
                    education.append(match.strip())

        return education

    def _extract_projects(self, text: str) -> List[Dict[str, Any]]:
        """Extract projects"""
        projects = []
        project_section = self._find_section(text, ['projects', 'portfolio'])

        if project_section:
            lines = [l.strip() for l in project_section.split('\n') if l.strip()]
            current_project = None

            for line in lines:
                if (len(line.split()) <= 5 and
                    not line.startswith('•') and
                    not line.startswith('-')):

                    if current_project:
                        projects.append(current_project)

                    current_project = {
                        'name': line,
                        'description': '',
                        'technologies': []
                    }
                elif current_project:
                    current_project['description'] += ' ' + line

            if current_project:
                projects.append(current_project)

        return projects

    def _extract_certifications(self, text: str) -> List[str]:
        """Extract certifications"""
        cert_patterns = [
            r'(AWS|Azure|Google|Microsoft|Oracle|Cisco|CompTIA)[^\n]*',
            r'([A-Z][A-Za-z\s]+(?:certified|certification|certificate))'
        ]

        certifications = []
        for pattern in cert_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            certifications.extend([match.strip() for match in matches])

        return list(set(certifications))

    def _extract_languages(self, text: str) -> List[str]:
        """Extract languages"""
        languages = []
        lang_list = ['english', 'spanish', 'french', 'german', 'chinese', 'japanese']

        text_lower = text.lower()
        for lang in lang_list:
            if lang in text_lower:
                languages.append(lang.title())

        return languages

    def _extract_achievements(self, text: str) -> List[str]:
        """Extract achievements"""
        achievement_section = self._find_section(text, ['achievements', 'awards', 'honors'])

        if achievement_section:
            achievements = []
            lines = [l.strip() for l in achievement_section.split('\n') if l.strip()]
            for line in lines:
                if len(line) > 10:
                    achievements.append(line)
            return achievements

        return []

    def _extract_linkedin(self, text: str) -> str:
        """Extract LinkedIn URL with validation"""
        matches = self.linkedin_pattern.findall(text)
        if matches:
            url = matches[0]
            # Ensure it starts with http
            if not url.startswith('http'):
                url = 'https://' + url
            return url

        # Also look for linkedin.com/in/ patterns without full URL
        simple_pattern = re.search(r'linkedin\.com/in/[a-zA-Z0-9\-_]+', text, re.IGNORECASE)
        if simple_pattern:
            return 'https://' + simple_pattern.group(0)

        return ""

    def _extract_github(self, text: str) -> str:
        """Extract GitHub URL with validation"""
        matches = self.github_pattern.findall(text)
        if matches:
            url = matches[0]
            # Ensure it starts with http
            if not url.startswith('http'):
                url = 'https://' + url
            return url

        # Also look for github.com/ patterns without full URL
        simple_pattern = re.search(r'github\.com/[a-zA-Z0-9\-_]+', text, re.IGNORECASE)
        if simple_pattern:
            return 'https://' + simple_pattern.group(0)

        return ""

    def _extract_portfolio(self, text: str) -> str:
        """Extract portfolio URL"""
        portfolio_patterns = [
            r'(?:portfolio|website)[\s:]*([^\s]+\.[a-z]{2,})',
            r'(https?://[^\s]+\.(?:com|net|org|io|dev))'
        ]

        for pattern in portfolio_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0]
        return ""

    def _extract_visa_status(self, text: str) -> str:
        """Extract visa status"""
        patterns = [
            r'(?:visa|work authorization)[\s:]*([^\n]+)',
            r'(h1-?b|l1|green card|citizen|authorized to work)'
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0].strip()
        return ""

    def _extract_notice_period(self, text: str) -> str:
        """Extract notice period"""
        patterns = [
            r'(?:notice period|availability)[\s:]*([^\n]+)',
            r'(?:available|can start)[\s:]*(?:in\s*)?([^\n]+)'
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0].strip()
        return ""

    def _extract_work_experience(self, text: str) -> List[Dict[str, Any]]:
        """Extract work experience"""
        experience = []
        exp_section = self._find_section(text, ['experience', 'work history', 'employment'])

        if exp_section:
            # Simple extraction - split by year patterns
            entries = re.split(r'\n(?=\d{4})', exp_section)
            for entry in entries:
                if len(entry.strip()) > 20:
                    lines = [l.strip() for l in entry.split('\n') if l.strip()]
                    if lines:
                        experience.append({
                            'position': lines[0] if lines else '',
                            'company': lines[1] if len(lines) > 1 else '',
                            'description': ' '.join(lines[2:]) if len(lines) > 2 else '',
                            'duration': self._extract_duration_from_text(entry)
                        })

        return experience

    def _extract_duration_from_text(self, text: str) -> str:
        """Extract duration from text"""
        date_pattern = r'(\d{4})\s*[-–—]\s*(\d{4}|present|current)'
        matches = re.findall(date_pattern, text, re.IGNORECASE)
        if matches:
            return f"{matches[0][0]} - {matches[0][1]}"
        return ""

    def _find_section(self, text: str, keywords: List[str]) -> str:
        """Find section in text"""
        lines = text.split('\n')

        for i, line in enumerate(lines):
            if any(keyword.lower() in line.lower() for keyword in keywords):
                # Found section, extract content
                section_lines = []
                for j in range(i + 1, len(lines)):
                    next_line = lines[j].strip()

                    # Stop at next major section
                    if (next_line.isupper() and len(next_line.split()) <= 3) or \
                       any(header in next_line.lower() for header in
                           ['education', 'experience', 'skills', 'projects', 'achievements']):
                        break

                    section_lines.append(next_line)

                return '\n'.join(section_lines)

        return ""

    def _extract_experience_from_filename(self, filename: str) -> Dict[str, Any]:
        """
        Extract experience information from the filename itself.
        Looks for patterns like "John_Doe_2_years_experience.pdf" or "resume_24_months.pdf"
        """
        filename_lower = filename.lower()

        # Enhanced patterns to match experience in filename
        filename_patterns = [
            # Years patterns
            r'(\d+)[\s_-]*(?:years?|yrs?)[\s_-]*(?:experience|exp|work)',
            r'(\d+)[\s_-]*(?:years?|yrs?)(?:[\s_-]*of)?[\s_-]*(?:experience|exp|work)',
            r'(?:experience|exp|work)[\s_-]*(\d+)[\s_-]*(?:years?|yrs?)',
            r'(\d+)[\s_-]*(?:y|yr|years?|yrs?)(?![a-z])',  # End with word boundary

            # Months patterns (enhanced for "7Months" pattern)
            r'(\d+)[\s_-]*(?:months?|mos?)[\s_-]*(?:experience|exp|work)',
            r'(\d+)[\s_-]*(?:months?|mos?)(?:[\s_-]*of)?[\s_-]*(?:experience|exp|work)',
            r'(?:experience|exp|work)[\s_-]*(\d+)[\s_-]*(?:months?|mos?)',
            r'(\d+)[\s_-]*(?:m|mo|months?|mos?)(?![a-z])',
            r'(\d+)(?:months?|mos?)(?![a-z])',  # For "7Months" pattern without separators

            # Combined patterns like "2y6m", "3yr2mo", "2_5_years"
            r'(\d+)[\s_-]*(?:y|yr|year)[\s_-]*(\d+)[\s_-]*(?:m|mo|month)',
            r'(\d+)[\s_-]*[._][\s_-]*(\d+)[\s_-]*(?:years?|yrs?)',
            r'(\d+)[\s_-]*(?:years?|yrs?)[\s_-]*(\d+)[\s_-]*(?:months?|mos?)',

            # Special formats like "2.5years", "3-5yrs"
            r'(\d+)\.(\d+)[\s_-]*(?:years?|yrs?)',
            r'(\d+)[\s_-]*to[\s_-]*(\d+)[\s_-]*(?:years?|yrs?)',  # "2 to 3 years"
            r'(\d+)[\s_-]*-[\s_-]*(\d+)[\s_-]*(?:years?|yrs?)',   # "2-3 years"

            # Technology specific patterns like "React_3_Years", "Python_2yrs", "React_7Months"
            r'(?:react|python|java|javascript|node|angular|vue)[\s_-]*(\d+)[\s_-]*(?:years?|yrs?)',
            r'(\d+)[\s_-]*(?:years?|yrs?)[\s_-]*(?:react|python|java|javascript|node|angular|vue)',
            r'(?:react|python|java|javascript|node|angular|vue)[\s_-]*(\d+)[\s_-]*(?:months?|mos?)',
            r'(?:react|python|java|javascript|node|angular|vue)[\s_-]*(\d+)(?:months?|mos?)(?![a-z])',  # For "React_7Months"
            r'(\d+)[\s_-]*(?:months?|mos?)[\s_-]*(?:react|python|java|javascript|node|angular|vue)',
        ]

        experience_data = {}

        for pattern in filename_patterns:
            matches = re.findall(pattern, filename_lower)
            if matches:
                try:
                    if isinstance(matches[0], tuple):
                        # Handle combined patterns like "2y6m", "2.5years", "2-3years"
                        if '\\.' in pattern:  # Decimal pattern like "2.5years"
                            years = int(matches[0][0])
                            decimal_part = int(matches[0][1])
                            total_months = years * 12 + (decimal_part * 12 // 10)
                            experience_data['months'] = total_months
                            experience_data['source'] = 'filename_decimal'
                        elif 'to' in pattern or '-' in pattern:  # Range pattern like "2-3years"
                            # Take the maximum value from range
                            years = max(int(matches[0][0]), int(matches[0][1]))
                            experience_data['months'] = years * 12
                            experience_data['source'] = 'filename_range'
                        else:  # Combined pattern like "2y6m"
                            years = int(matches[0][0])
                            months = int(matches[0][1]) if len(matches[0]) > 1 else 0
                            total_months = (years * 12) + months
                            experience_data['months'] = total_months
                            experience_data['source'] = 'filename_combined'
                        break
                    else:
                        # Single number patterns
                        value = int(matches[0])
                        # Check if pattern is month-specific (check both pattern and context)
                        if (any(month_indicator in pattern for month_indicator in ['month', 'mo']) or
                            'months' in filename_lower or 'month' in filename_lower):
                            experience_data['months'] = value
                            experience_data['source'] = 'filename_months'
                            print(f"Extracted {value} months from filename")
                        else:
                            # Assume years and convert to months
                            experience_data['months'] = value * 12
                            experience_data['source'] = 'filename_years'
                            print(f"Extracted {value} years from filename")
                        break
                except (ValueError, IndexError) as e:
                    print(f"Error parsing filename pattern {pattern}: {e}")
                    continue

        return experience_data

    def _clean_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean the extracted data with Unicode safety and field length limits"""
        # Field length limits based on model constraints
        field_limits = {
            'location': 200,
            'current_position': 200,
            'current_company': 200,
            'summary': 500,  # Reasonable limit for summaries
            'visa_status': 100,
            'notice_period': 100
        }

        cleaned = {}
        for key, value in data.items():
            if value:
                try:
                    if isinstance(value, str):
                        # Ensure all strings are Unicode-safe
                        value = self._ensure_unicode_safe(value.strip())

                        # Apply field length limits to prevent validation errors
                        if key in field_limits and len(value) > field_limits[key]:
                            value = value[:field_limits[key]-3] + '...'

                        if value:
                            cleaned[key] = value
                    elif isinstance(value, list) and value:
                        # Clean list items
                        cleaned_list = []
                        for item in value:
                            if isinstance(item, str):
                                safe_item = self._ensure_unicode_safe(item)
                                if safe_item:
                                    cleaned_list.append(safe_item)
                            elif isinstance(item, dict):
                                cleaned_list.append(self._clean_dict_unicode(item))
                            else:
                                cleaned_list.append(item)
                        if cleaned_list:
                            cleaned[key] = cleaned_list
                    elif isinstance(value, (int, float)):
                        cleaned[key] = value
                    elif isinstance(value, dict) and value:
                        cleaned[key] = self._clean_dict_unicode(value)
                except Exception as clean_error:
                    print(f"Error cleaning data for key {key}: {clean_error}")
                    # Skip this field rather than failing entirely
                    continue

        return cleaned

    def _ensure_unicode_safe(self, text: str) -> str:
        """Ensure text is safe for Unicode encoding"""
        if not text:
            return ""
        try:
            # Test if the text can be encoded safely
            text.encode('utf-8')
            return text
        except UnicodeEncodeError:
            # If not, clean it more aggressively
            return self._clean_unicode_text(text)

    def _clean_dict_unicode(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean dictionary values for Unicode safety"""
        cleaned_dict = {}
        for key, value in data.items():
            try:
                if isinstance(value, str):
                    safe_value = self._ensure_unicode_safe(value)
                    if safe_value:
                        cleaned_dict[key] = safe_value
                elif isinstance(value, (int, float, bool)):
                    cleaned_dict[key] = value
                elif isinstance(value, list):
                    cleaned_list = []
                    for item in value:
                        if isinstance(item, str):
                            safe_item = self._ensure_unicode_safe(item)
                            if safe_item:
                                cleaned_list.append(safe_item)
                        else:
                            cleaned_list.append(item)
                    if cleaned_list:
                        cleaned_dict[key] = cleaned_list
                else:
                    cleaned_dict[key] = value
            except Exception as dict_clean_error:
                print(f"Error cleaning dict value for key {key}: {dict_clean_error}")
                continue
        return cleaned_dict