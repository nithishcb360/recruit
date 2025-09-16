import re
import os
from typing import Dict, List, Any, Optional
import json

# Safe imports with fallbacks
try:
    import pdfplumber
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    print("pdfplumber not available, PDF parsing disabled")

try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    print("python-docx not available, DOCX parsing disabled")


class ComprehensiveResumeParser:
    """
    Comprehensive resume parser that extracts all possible data from resumes:
    - Personal information (name, email, phone, location)
    - Professional summary
    - Work experience with detailed history
    - Skills (technical and soft skills)
    - Education details
    - Projects with descriptions
    - Certifications
    - Languages
    - Achievements
    - Social profiles (LinkedIn, GitHub, Portfolio)
    - Visa status and availability
    """

    def __init__(self):
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        self.phone_pattern = re.compile(r'(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}')
        self.linkedin_pattern = re.compile(r'(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-_]+/?', re.IGNORECASE)
        self.github_pattern = re.compile(r'(?:https?://)?(?:www\.)?github\.com/[\w\-_]+/?', re.IGNORECASE)

        # Technical skills database
        self.technical_skills = self._build_technical_skills()

        # Soft skills database
        self.soft_skills = [
            'leadership', 'communication', 'teamwork', 'problem solving', 'analytical',
            'critical thinking', 'project management', 'time management', 'adaptability',
            'creativity', 'collaboration', 'mentoring', 'strategic planning', 'negotiation',
            'presentation', 'documentation', 'research', 'training', 'coaching'
        ]

    def _build_technical_skills(self) -> List[str]:
        """Build comprehensive technical skills database"""
        return [
            # Programming Languages
            'python', 'javascript', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
            'swift', 'kotlin', 'typescript', 'scala', 'perl', 'r', 'matlab', 'c',
            'objective-c', 'dart', 'lua', 'haskell', 'clojure', 'f#', 'elixir',

            # Frontend Technologies
            'react', 'reactjs', 'react.js', 'angular', 'angularjs', 'vue', 'vuejs', 'vue.js',
            'next.js', 'nextjs', 'nuxt', 'gatsby', 'svelte', 'ember', 'backbone',
            'jquery', 'bootstrap', 'tailwind', 'material-ui', 'ant-design', 'chakra-ui',
            'html', 'css', 'sass', 'scss', 'less', 'webpack', 'vite', 'parcel',

            # Backend Technologies
            'django', 'flask', 'fastapi', 'express', 'express.js', 'spring', 'spring boot',
            'laravel', 'symfony', 'rails', 'ruby on rails', 'asp.net', '.net core',
            'node.js', 'nodejs', 'deno', 'gin', 'echo', 'fastify',

            # Databases
            'mysql', 'postgresql', 'postgres', 'sqlite', 'mongodb', 'redis',
            'elasticsearch', 'cassandra', 'dynamodb', 'neo4j', 'oracle', 'sql server',

            # Cloud & DevOps
            'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s',
            'jenkins', 'gitlab ci', 'github actions', 'terraform', 'ansible',
            'nginx', 'apache', 'linux', 'ubuntu', 'centos', 'debian',

            # Data Science & AI
            'machine learning', 'deep learning', 'neural networks', 'tensorflow',
            'pytorch', 'scikit-learn', 'pandas', 'numpy', 'jupyter', 'matplotlib',
            'seaborn', 'tableau', 'power bi', 'spark', 'hadoop', 'kafka',

            # Mobile Development
            'android', 'ios', 'react native', 'flutter', 'xamarin', 'ionic',
            'cordova', 'phonegap', 'unity', 'unreal engine',

            # Testing & Quality
            'jest', 'pytest', 'junit', 'selenium', 'cypress', 'mocha', 'chai',
            'testing', 'unit testing', 'integration testing', 'tdd', 'bdd'
        ]

    def parse_resume(self, file_path: str, original_filename: str = None) -> Dict[str, Any]:
        """
        Comprehensively parse resume to extract all possible data
        """
        try:
            # Extract text from file
            text = self._extract_text_from_file(file_path)
            if not text:
                return {'error': 'Could not extract text from file'}

            # Parse all components
            result = {
                'text': text,
                'name': self._extract_name(text),
                'email': self._extract_email(text),
                'phone': self._extract_phone(text),
                'location': self._extract_location(text),
                'summary': self._extract_summary(text),
                'skills': self._extract_skills(text),
                'experience': self._extract_work_experience(text),
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
                'current_position': self._extract_current_position(text),
                'current_company': self._extract_current_company(text),
                'experience_years': self._calculate_total_experience(text)
            }

            # Clean up and validate data
            result = self._clean_and_validate_data(result)

            return result

        except Exception as e:
            return {'error': f'Error parsing resume: {str(e)}'}

    def _extract_text_from_file(self, file_path: str) -> str:
        """Extract text from PDF or DOCX file with safe dependency handling"""
        try:
            if file_path.lower().endswith('.pdf'):
                if not PDF_AVAILABLE:
                    return "PDF parsing not available due to missing dependencies"

                text = ""
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        text += page.extract_text() or ""
                return text

            elif file_path.lower().endswith('.docx'):
                if not DOCX_AVAILABLE:
                    return "DOCX parsing not available due to missing dependencies"

                doc = Document(file_path)
                return '\n'.join([paragraph.text for paragraph in doc.paragraphs])
            else:
                return "Unsupported file format"
        except Exception as e:
            print(f"Error extracting text: {e}")
            # Return empty string instead of failing completely
            return ""

    def _extract_name(self, text: str) -> str:
        """Extract candidate name from resume"""
        lines = text.split('\n')
        for line in lines[:5]:  # Check first 5 lines
            line = line.strip()
            if line and len(line.split()) >= 2 and len(line) < 50:
                # Basic validation for name
                if not any(char.isdigit() for char in line) and '@' not in line:
                    return line
        return ""

    def _extract_email(self, text: str) -> str:
        """Extract email address"""
        emails = self.email_pattern.findall(text)
        return emails[0] if emails else ""

    def _extract_phone(self, text: str) -> str:
        """Extract phone number"""
        phones = self.phone_pattern.findall(text)
        return phones[0] if phones else ""

    def _extract_location(self, text: str) -> str:
        """Extract location/address"""
        location_patterns = [
            r'(?:address|location|based in|located in)[\s:]*([^\\n]+)',
            r'([A-Za-z\s]+,\s*[A-Za-z]{2}\s*\d{5})',  # City, State ZIP
            r'([A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Za-z\s]+)',  # City, State, Country
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
            r'(?:professional\s+summary|career\s+summary)[\s:]*\n(.*?)(?:\n\s*\n|\n[A-Z])',
        ]

        for pattern in summary_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
            if matches:
                summary = matches[0].strip()
                if len(summary) > 50:  # Ensure it's substantial
                    return summary
        return ""

    def _extract_skills(self, text: str) -> List[str]:
        """Extract technical and soft skills"""
        text_lower = text.lower()
        found_skills = []

        # Extract technical skills
        for skill in self.technical_skills:
            if skill.lower() in text_lower:
                found_skills.append(skill)

        # Extract soft skills
        for skill in self.soft_skills:
            if skill.lower() in text_lower:
                found_skills.append(skill)

        # Look for skills section
        skills_section_pattern = r'(?:skills|technologies|expertise)[\s:]*\n(.*?)(?:\n\s*\n|\n[A-Z])'
        matches = re.findall(skills_section_pattern, text, re.IGNORECASE | re.DOTALL)

        if matches:
            skills_text = matches[0]
            # Extract comma-separated or bullet-point skills
            additional_skills = re.findall(r'[•\-\*]?\s*([A-Za-z\s\.\+\#]+)(?:[,\n]|$)', skills_text)
            found_skills.extend([skill.strip() for skill in additional_skills if skill.strip()])

        return list(set(found_skills))  # Remove duplicates

    def _extract_work_experience(self, text: str) -> List[Dict[str, Any]]:
        """Extract detailed work experience"""
        experience_section = self._find_section(text, ['experience', 'work history', 'employment', 'career'])

        if not experience_section:
            return []

        experiences = []

        # Pattern to match job entries
        job_pattern = r'([A-Za-z\s,&\.\-]+)\s*(?:\||\-|\@|at)\s*([A-Za-z\s,&\.\-]+)\s*(?:\n|\r\n|\r)([^\\n]*?)(?=\n[A-Z]|\n\s*\n|$)'

        matches = re.findall(job_pattern, experience_section, re.DOTALL)

        for match in matches:
            position = match[0].strip()
            company = match[1].strip()
            description = match[2].strip()

            # Extract dates from description
            date_pattern = r'(\d{1,2}/\d{4}|\d{4}|\w+\s+\d{4})\s*[-–—]\s*(\d{1,2}/\d{4}|\d{4}|\w+\s+\d{4}|present|current)'
            date_matches = re.findall(date_pattern, description, re.IGNORECASE)

            start_date = date_matches[0][0] if date_matches else ""
            end_date = date_matches[0][1] if date_matches else ""

            experiences.append({
                'position': position,
                'company': company,
                'start_date': start_date,
                'end_date': end_date,
                'description': description,
                'duration': self._calculate_duration(start_date, end_date)
            })

        return experiences

    def _extract_education(self, text: str) -> List[Dict[str, Any]]:
        """Extract education details"""
        education_section = self._find_section(text, ['education', 'academic', 'qualifications', 'degrees'])

        if not education_section:
            return []

        education = []

        # Common degree patterns
        degree_patterns = [
            r'(bachelor|master|phd|doctorate|associate|diploma|certificate)[\s\'s]*(?:of|in|degree)?\s*([^\\n]+)',
            r'(b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|m\.?b\.?a\.?|ph\.?d\.?)\s*(?:in|of)?\s*([^\\n]+)',
        ]

        for pattern in degree_patterns:
            matches = re.findall(pattern, education_section, re.IGNORECASE)
            for match in matches:
                degree_type = match[0].strip()
                field = match[1].strip()

                # Extract year
                year_pattern = r'(\d{4})'
                year_matches = re.findall(year_pattern, field)
                year = year_matches[-1] if year_matches else ""

                # Extract institution
                lines = education_section.split('\\n')
                institution = ""
                for line in lines:
                    if degree_type.lower() in line.lower() or field.lower() in line.lower():
                        # Look for university/college in the same or next line
                        institution_pattern = r'(university|college|institute|school|academy)[^\\n]*'
                        inst_matches = re.findall(institution_pattern, line, re.IGNORECASE)
                        if inst_matches:
                            institution = inst_matches[0].strip()
                            break

                education.append({
                    'degree': f"{degree_type} {field}".strip(),
                    'institution': institution,
                    'year': year,
                    'field': field
                })

        return education

    def _extract_projects(self, text: str) -> List[Dict[str, Any]]:
        """Extract project details"""
        projects_section = self._find_section(text, ['projects', 'portfolio', 'work samples'])

        if not projects_section:
            return []

        projects = []

        # Pattern to match project entries
        project_lines = projects_section.split('\\n')
        current_project = None

        for line in project_lines:
            line = line.strip()
            if not line:
                continue

            # Check if this looks like a project title
            if (line.isupper() or
                any(keyword in line.lower() for keyword in ['project', 'application', 'website', 'system', 'platform']) or
                (len(line.split()) <= 5 and not line.startswith('•'))):

                if current_project:
                    projects.append(current_project)

                current_project = {
                    'name': line,
                    'description': '',
                    'technologies': []
                }
            elif current_project:
                # Add to description
                current_project['description'] += ' ' + line

                # Extract technologies mentioned
                for skill in self.technical_skills:
                    if skill.lower() in line.lower():
                        if skill not in current_project['technologies']:
                            current_project['technologies'].append(skill)

        if current_project:
            projects.append(current_project)

        return projects

    def _extract_certifications(self, text: str) -> List[str]:
        """Extract certifications"""
        cert_section = self._find_section(text, ['certifications', 'certificates', 'credentials'])

        if not cert_section:
            return []

        certifications = []

        # Common certification patterns
        cert_patterns = [
            r'([A-Z][A-Za-z\s]+(?:certified|certification|certificate))',
            r'(AWS|Azure|Google|Microsoft|Oracle|Cisco|CompTIA|PMP|Scrum Master|Six Sigma)[^\\n]*',
        ]

        for pattern in cert_patterns:
            matches = re.findall(pattern, cert_section, re.IGNORECASE)
            certifications.extend([match.strip() for match in matches])

        return list(set(certifications))

    def _extract_languages(self, text: str) -> List[str]:
        """Extract programming and spoken languages"""
        languages = []

        # Programming languages (already covered in technical skills)
        prog_languages = ['python', 'java', 'javascript', 'c++', 'c#', 'php', 'ruby', 'go']

        # Spoken languages
        spoken_languages = ['english', 'spanish', 'french', 'german', 'italian', 'portuguese',
                           'chinese', 'japanese', 'korean', 'arabic', 'hindi', 'russian']

        text_lower = text.lower()

        for lang in prog_languages + spoken_languages:
            if lang in text_lower:
                languages.append(lang.title())

        return list(set(languages))

    def _extract_achievements(self, text: str) -> List[str]:
        """Extract achievements and awards"""
        achievement_section = self._find_section(text, ['achievements', 'awards', 'honors', 'accomplishments'])

        if not achievement_section:
            return []

        achievements = []

        # Split by lines and extract meaningful achievements
        lines = achievement_section.split('\\n')
        for line in lines:
            line = line.strip()
            if line and len(line) > 10:  # Filter out short lines
                achievements.append(line)

        return achievements

    def _extract_linkedin(self, text: str) -> str:
        """Extract LinkedIn URL"""
        matches = self.linkedin_pattern.findall(text)
        return matches[0] if matches else ""

    def _extract_github(self, text: str) -> str:
        """Extract GitHub URL"""
        matches = self.github_pattern.findall(text)
        return matches[0] if matches else ""

    def _extract_portfolio(self, text: str) -> str:
        """Extract portfolio website URL"""
        portfolio_patterns = [
            r'(?:portfolio|website|personal site)[\s:]*([^\s]+\.[a-z]{2,})',
            r'(https?://[^\s]+\.(?:com|net|org|io|dev|me))',
        ]

        for pattern in portfolio_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0]
        return ""

    def _extract_visa_status(self, text: str) -> str:
        """Extract work authorization/visa status"""
        visa_patterns = [
            r'(?:visa|work authorization|employment authorization)[\s:]*([^\\n]+)',
            r'(h1-?b|l1|green card|citizen|authorized to work)',
        ]

        for pattern in visa_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0].strip()
        return ""

    def _extract_notice_period(self, text: str) -> str:
        """Extract notice period"""
        notice_patterns = [
            r'(?:notice period|availability)[\s:]*([^\\n]+)',
            r'(?:available|can start)[\s:]*(?:in\s*)?([^\\n]+)',
        ]

        for pattern in notice_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0].strip()
        return ""

    def _extract_current_position(self, text: str) -> str:
        """Extract current job title"""
        # Look in the first few lines or in experience section
        lines = text.split('\\n')[:10]
        for line in lines:
            if any(keyword in line.lower() for keyword in ['developer', 'engineer', 'manager', 'analyst', 'specialist', 'architect']):
                return line.strip()
        return ""

    def _extract_current_company(self, text: str) -> str:
        """Extract current company"""
        # Look for company patterns in recent experience
        company_patterns = [
            r'(?:currently at|working at|employed at)[\s:]*([^\\n]+)',
            r'(@|at)\s*([A-Z][A-Za-z\s&,\.]+)(?:\s*\||\s*-|\s*\\n)',
        ]

        for pattern in company_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0].strip() if isinstance(matches[0], str) else matches[0][1].strip()
        return ""

    def _calculate_total_experience(self, text: str) -> Optional[int]:
        """Calculate total years of experience"""
        experience_patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            r'experience.*?(\d+)\+?\s*years?',
            r'(\d+)\+?\s*years?\s*in\s*(?:software|development|engineering)',
        ]

        for pattern in experience_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                try:
                    return int(matches[0])
                except ValueError:
                    continue

        # Calculate from work experience if available
        work_exp = self._extract_work_experience(text)
        if work_exp:
            total_months = sum([exp.get('duration', 0) for exp in work_exp])
            return total_months // 12 if total_months > 0 else None

        return None

    def _find_section(self, text: str, keywords: List[str]) -> str:
        """Find a specific section in the resume"""
        text_lines = text.split('\\n')

        for i, line in enumerate(text_lines):
            if any(keyword.lower() in line.lower() for keyword in keywords):
                # Found section header, extract content until next section
                section_content = []
                for j in range(i + 1, len(text_lines)):
                    next_line = text_lines[j].strip()

                    # Stop if we hit another section header
                    if (next_line.isupper() and len(next_line.split()) <= 3) or \
                       any(header in next_line.lower() for header in ['education', 'experience', 'skills', 'projects', 'achievements']):
                        break

                    section_content.append(next_line)

                return '\\n'.join(section_content)

        return ""

    def _calculate_duration(self, start_date: str, end_date: str) -> int:
        """Calculate duration in months between dates"""
        # Simplified calculation - you might want to use proper date parsing
        try:
            if 'present' in end_date.lower() or 'current' in end_date.lower():
                # Assume current year
                end_year = 2024
            else:
                end_year = int(re.findall(r'\\d{4}', end_date)[0])

            start_year = int(re.findall(r'\\d{4}', start_date)[0])
            return (end_year - start_year) * 12
        except:
            return 0

    def _clean_and_validate_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and validate extracted data"""
        # Remove empty strings and None values
        cleaned_data = {}
        for key, value in data.items():
            if value:
                if isinstance(value, str):
                    value = value.strip()
                    if value:
                        cleaned_data[key] = value
                elif isinstance(value, list):
                    if value:
                        cleaned_data[key] = value
                else:
                    cleaned_data[key] = value

        return cleaned_data