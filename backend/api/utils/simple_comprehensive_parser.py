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
        """Parse resume with comprehensive data extraction"""
        try:
            # Extract text
            text = self._extract_text_from_file(file_path)
            if not text or len(text.strip()) < 10:
                return {'error': 'Could not extract meaningful text from file'}

            # Parse all fields
            result = {
                'text': text,
                'name': self._extract_name(text),
                'email': self._extract_email(text),
                'phone': self._extract_phone(text),
                'location': self._extract_location(text),
                'summary': self._extract_summary(text),
                'skills': self._extract_skills(text),
                'experience_years': self._extract_experience_years(text),
                'current_position': self._extract_current_position(text),
                'current_company': self._extract_current_company(text),
                'education': self._extract_education(text),
                'projects': self._extract_projects(text),
                'certifications': self._extract_certifications(text),
                'languages': self._extract_languages(text),
                'achievements': self._extract_achievements(text),
                'linkedin_url': self._extract_linkedin(text),
                'github_url': self._extract_github(text),
                'portfolio_url': self._extract_portfolio(text),
                'visa_status': self._extract_visa_status(text),
                'notice_period': self._extract_notice_period(text),
                'work_experience': self._extract_work_experience(text)
            }

            # Clean and return
            return self._clean_data(result)

        except Exception as e:
            print(f"Simple parser error: {e}")
            return {'error': f'Error parsing resume: {str(e)}'}

    def _extract_text_from_file(self, file_path: str) -> str:
        """Extract text from file with Unicode handling"""
        try:
            if file_path.lower().endswith('.pdf') and PDF_AVAILABLE:
                text = ""
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                return self._clean_unicode_text(text)

            elif file_path.lower().endswith('.docx') and DOCX_AVAILABLE:
                doc = Document(file_path)
                text = '\n'.join([para.text for para in doc.paragraphs])
                return self._clean_unicode_text(text)

            else:
                # Try to read as text file
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    text = f.read()
                return self._clean_unicode_text(text)

        except Exception as e:
            print(f"Text extraction error: {e}")
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
            }

            for old, new in replacements.items():
                text = text.replace(old, new)

            # Remove any remaining non-printable characters but keep newlines and tabs
            text = ''.join(char for char in text if char.isprintable() or char in '\n\t\r ')

            return text.strip()
        except Exception as e:
            print(f"Unicode cleaning error: {e}")
            # Fallback: encode to ASCII and ignore errors
            return text.encode('ascii', errors='ignore').decode('ascii')

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
        """Extract years of experience"""
        patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            r'experience.*?(\d+)\+?\s*years?',
            r'(\d+)\+?\s*years?\s*in\s*(?:software|development|engineering)'
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                try:
                    return int(matches[0])
                except ValueError:
                    continue
        return None

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

    def _clean_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean the extracted data"""
        cleaned = {}
        for key, value in data.items():
            if value:
                if isinstance(value, str):
                    value = value.strip()
                    if value:
                        cleaned[key] = value
                elif isinstance(value, list) and value:
                    cleaned[key] = value
                elif isinstance(value, (int, float)):
                    cleaned[key] = value
                elif isinstance(value, dict) and value:
                    cleaned[key] = value

        return cleaned