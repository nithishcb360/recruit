import re
import os
import pdfplumber
from docx import Document
from typing import Dict, List, Any, Optional


class EnhancedResumeParser:
    """
    Enhanced resume parser that improves upon the base parser with:
    1. Filename-based experience extraction
    2. Better job title extraction from summary sections
    3. More precise skills parsing
    """

    def __init__(self):
        # More precise skills list - actual technical skills only
        self.technical_skills = [
            # Programming Languages
            'python', 'javascript', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
            'swift', 'kotlin', 'typescript', 'scala', 'perl', 'r', 'matlab', 'c',
            'objective-c', 'dart', 'lua', 'haskell', 'clojure', 'f#', 'elixir',

            # Frontend Frameworks & Libraries
            'react', 'reactjs', 'react.js', 'angular', 'angularjs', 'vue', 'vuejs', 'vue.js',
            'next.js', 'nextjs', 'nuxt', 'gatsby', 'svelte', 'ember', 'backbone',
            'jquery', 'bootstrap', 'tailwind', 'material-ui', 'ant-design', 'chakra-ui',
            'styled-components', 'emotion', 'sass', 'scss', 'less', 'stylus',

            # Backend Frameworks
            'django', 'flask', 'fastapi', 'express', 'express.js', 'koa', 'hapi',
            'spring', 'spring boot', 'struts', 'hibernate', 'laravel', 'symfony',
            'codeigniter', 'rails', 'ruby on rails', 'sinatra', 'gin', 'echo',
            'asp.net', '.net core', 'nancy', 'actix', 'axum', 'warp',

            # Databases
            'mysql', 'postgresql', 'postgres', 'sqlite', 'mongodb', 'redis',
            'elasticsearch', 'cassandra', 'dynamodb', 'neo4j', 'influxdb',
            'mariadb', 'oracle', 'sql server', 'couchdb', 'rethinkdb',

            # Cloud Platforms
            'aws', 'azure', 'gcp', 'google cloud', 'heroku', 'digitalocean',
            'linode', 'vultr', 'cloudflare', 'vercel', 'netlify',

            # DevOps & Tools
            'docker', 'kubernetes', 'k8s', 'jenkins', 'gitlab ci', 'github actions',
            'travis ci', 'circleci', 'terraform', 'ansible', 'chef', 'puppet',
            'vagrant', 'nginx', 'apache', 'iis', 'tomcat', 'gunicorn', 'uwsgi',

            # Version Control
            'git', 'github', 'gitlab', 'bitbucket', 'svn', 'mercurial',

            # Testing Frameworks
            'jest', 'mocha', 'chai', 'cypress', 'selenium', 'puppeteer',
            'junit', 'testng', 'pytest', 'unittest', 'nose', 'rspec',
            'jasmine', 'karma', 'protractor',

            # Mobile Development
            'android', 'ios', 'react native', 'flutter', 'xamarin', 'cordova',
            'phonegap', 'ionic', 'nativescript', 'unity', 'unreal engine',

            # Data Science & ML
            'pandas', 'numpy', 'scipy', 'scikit-learn', 'sklearn', 'tensorflow',
            'pytorch', 'keras', 'opencv', 'matplotlib', 'seaborn', 'plotly',
            'jupyter', 'anaconda', 'spark', 'hadoop', 'kafka', 'airflow',

            # Operating Systems
            'linux', 'ubuntu', 'debian', 'centos', 'redhat', 'fedora',
            'windows', 'macos', 'unix', 'freebsd',

            # Other Technologies
            'graphql', 'rest api', 'grpc', 'websockets', 'oauth', 'jwt',
            'microservices', 'serverless', 'lambda', 'api gateway',
            'elasticsearch', 'solr', 'kibana', 'grafana', 'prometheus',
            'websocket', 'socket.io', 'webrtc'
        ]

        # Non-technical terms that should NOT be considered skills
        self.excluded_terms = [
            'team', 'work', 'working', 'experience', 'development', 'management',
            'project', 'business', 'client', 'customer', 'communication', 'leadership',
            'problem', 'solving', 'analysis', 'design', 'implementation', 'testing',
            'debugging', 'optimization', 'performance', 'scalability', 'security',
            'quality', 'assurance', 'documentation', 'training', 'mentoring',
            'collaboration', 'agile', 'scrum', 'waterfall', 'methodology',
            'english', 'spanish', 'french', 'german', 'hindi', 'mandarin',
            'writing', 'speaking', 'reading', 'listening', 'presentation',
            'microsoft', 'office', 'word', 'excel', 'powerpoint', 'outlook',
            'windows', 'mac', 'internet', 'email', 'browser', 'typing'
        ]

    def parse_resume(self, file_path: str, original_filename: str = None) -> Dict[str, Any]:
        """
        Enhanced parse resume with filename analysis and better extraction.

        Args:
            file_path: Path to the resume file
            original_filename: Original filename for experience extraction

        Returns:
            Dictionary containing parsed resume data
        """
        # Get the base parsing results
        parsed_data = self._parse_resume_basic(file_path)

        if 'error' in parsed_data:
            return parsed_data

        # Use original filename if provided, otherwise extract from file_path
        filename = original_filename if original_filename else os.path.basename(file_path)

        # PRIORITY 1: Filename experience extraction (highest priority)
        filename_experience = self._extract_experience_from_filename(filename)
        if filename_experience and filename_experience.get('months'):
            # Convert months to years for consistency
            experience_years = round(filename_experience['months'] / 12, 1)
            if experience_years > 0:
                # Override any previous experience extraction with filename data
                parsed_data['experience'] = {
                    'years': experience_years,
                    'extraction_method': 'filename',
                    'months': filename_experience['months'],
                    'source': filename_experience.get('source', 'filename'),
                    'companies': parsed_data['experience'].get('companies', [])
                }
                print(f"FILENAME PRIORITY: Extracted {experience_years} years from filename: {filename}")
                # When filename has experience, we don't need to extract from content
                return parsed_data

        # Enhanced job title extraction from summary
        text = parsed_data.get('text', '')
        if not parsed_data.get('current_position'):
            enhanced_title = self._extract_enhanced_job_title(text)
            if enhanced_title:
                parsed_data['current_position'] = enhanced_title

        # Enhanced skills extraction
        enhanced_skills = self._extract_enhanced_skills(text)
        if enhanced_skills:
            parsed_data['skills'] = enhanced_skills

        return parsed_data

    def _extract_experience_from_filename(self, filename: str) -> Dict[str, Any]:
        """
        Extract experience information from the filename itself.
        Looks for patterns like "John_Doe_2_years_experience.pdf" or "resume_24_months.pdf"
        """
        filename_lower = filename.lower()

        # Enhanced patterns to match experience in filename (more comprehensive)
        filename_patterns = [
            # Years patterns (enhanced)
            r'(\d+)[\s_-]*(?:years?|yrs?)[\s_-]*(?:experience|exp|work)',
            r'(\d+)[\s_-]*(?:years?|yrs?)(?:[\s_-]*of)?[\s_-]*(?:experience|exp|work)',
            r'(?:experience|exp|work)[\s_-]*(\d+)[\s_-]*(?:years?|yrs?)',
            r'(\d+)[\s_-]*(?:y|yr|years?|yrs?)(?![a-z])',  # End with word boundary

            # Months patterns (enhanced)
            r'(\d+)[\s_-]*(?:months?|mos?)[\s_-]*(?:experience|exp|work)',
            r'(\d+)[\s_-]*(?:months?|mos?)(?:[\s_-]*of)?[\s_-]*(?:experience|exp|work)',
            r'(?:experience|exp|work)[\s_-]*(\d+)[\s_-]*(?:months?|mos?)',
            r'(\d+)[\s_-]*(?:m|mo|months?|mos?)(?![a-z])',

            # Combined patterns like "2y6m", "3yr2mo", "2_5_years"
            r'(\d+)[\s_-]*(?:y|yr|year)[\s_-]*(\d+)[\s_-]*(?:m|mo|month)',
            r'(\d+)[\s_-]*[._][\s_-]*(\d+)[\s_-]*(?:years?|yrs?)',
            r'(\d+)[\s_-]*(?:years?|yrs?)[\s_-]*(\d+)[\s_-]*(?:months?|mos?)',

            # Special formats like "2.5years", "3-5yrs"
            r'(\d+)\.(\d+)[\s_-]*(?:years?|yrs?)',
            r'(\d+)[\s_-]*to[\s_-]*(\d+)[\s_-]*(?:years?|yrs?)',  # "2 to 3 years"
            r'(\d+)[\s_-]*-[\s_-]*(\d+)[\s_-]*(?:years?|yrs?)',   # "2-3 years"

            # React/technology specific patterns like "React_3_Years", "Python_2yrs"
            r'(?:react|python|java|javascript|node|angular|vue)[\s_-]*(\d+)[\s_-]*(?:years?|yrs?)',
            r'(\d+)[\s_-]*(?:years?|yrs?)[\s_-]*(?:react|python|java|javascript|node|angular|vue)',
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
                        # Check if pattern is month-specific
                        if any(month_indicator in pattern for month_indicator in ['month', 'mo']):
                            experience_data['months'] = value
                            experience_data['source'] = 'filename_months'
                        else:
                            # Assume years and convert to months
                            experience_data['months'] = value * 12
                            experience_data['source'] = 'filename_years'
                        break
                except (ValueError, IndexError) as e:
                    print(f"Error parsing filename pattern {pattern}: {e}")
                    continue

        return experience_data

    def _extract_enhanced_job_title(self, text: str) -> str:
        """
        Enhanced job title extraction focusing specifically on summary sections
        and professional profiles at the top of resumes.
        """
        lines = text.split('\n')

        # Strategy 1: Look for job title in the first 3 lines (header area)
        for i, line in enumerate(lines[:3]):
            line_clean = line.strip()
            if len(line_clean) > 5 and len(line_clean) < 80:
                # Check if this looks like a job title
                job_title = self._validate_job_title(line_clean)
                if job_title:
                    return job_title

        # Strategy 2: Look for explicit summary sections
        summary_text = self._extract_summary_section(text)
        if summary_text:
            # Look for job title patterns in summary
            title_patterns = [
                # "I am a Senior Software Engineer" patterns
                r'(?:i\s+am\s+(?:a\s+|an\s+)?)([\w\s]{10,50})(?:\s+with|\s+having|\s+who)',

                # "Experienced React Developer" patterns
                r'^(?:experienced\s+|seasoned\s+|skilled\s+|professional\s+)([\w\s]{10,50})(?:\s+with|\s+having)',

                # "Senior Software Engineer with X years" patterns
                r'^((?:senior|lead|principal|staff|chief|head)\s+[\w\s]{5,40})(?:\s+with|\s+having)',
                r'^([\w\s]{10,50}(?:engineer|developer|analyst|architect|manager|designer|specialist))(?:\s+with|\s+having)',

                # "Working as a Developer at" patterns
                r'(?:working\s+as\s+(?:a\s+|an\s+)?)([\w\s]{10,50})(?:\s+at|\s+with|\s+for)',
                r'(?:currently\s+(?:a\s+|an\s+)?)([\w\s]{10,50})(?:\s+at|\s+with|\s+for)',

                # Job title followed by description patterns
                r'^([\w\s]{10,50}(?:developer|engineer|analyst|architect|manager|designer|specialist))[\s,]',
            ]

            summary_lower = summary_text.lower()
            for pattern in title_patterns:
                matches = re.findall(pattern, summary_lower, re.IGNORECASE | re.MULTILINE)
                if matches:
                    job_title = matches[0].strip()
                    validated_title = self._validate_job_title(job_title)
                    if validated_title:
                        return validated_title

        # Strategy 3: Look for job titles in experience section headers
        return self._extract_title_from_experience_headers(text)

    def _extract_summary_section(self, text: str) -> str:
        """Extract the professional summary/objective section from resume."""
        lines = text.split('\n')
        summary_lines = []
        in_summary = False

        summary_indicators = [
            'professional summary', 'career summary', 'summary', 'profile',
            'professional profile', 'career profile', 'objective', 'career objective',
            'professional objective', 'about me', 'overview', 'introduction'
        ]

        stop_indicators = [
            'experience', 'work experience', 'employment', 'education',
            'skills', 'technical skills', 'projects', 'achievements'
        ]

        for line in lines:
            line_clean = line.strip()
            line_lower = line_clean.lower()

            # Check if we're starting a summary section
            if not in_summary and any(indicator in line_lower for indicator in summary_indicators):
                if len(line_clean) < 60:  # Likely a header
                    in_summary = True
                    continue
                elif any(indicator in line_lower[:20] for indicator in summary_indicators):
                    # Summary content on same line as header
                    in_summary = True
                    # Extract content after the header
                    for indicator in summary_indicators:
                        if indicator in line_lower:
                            content_start = line_lower.find(indicator) + len(indicator)
                            content = line_clean[content_start:].strip(' :-')
                            if content:
                                summary_lines.append(content)
                            break
                    continue

            # Check if we're leaving summary section
            if in_summary and any(indicator in line_lower for indicator in stop_indicators):
                if len(line_clean) < 50:  # Likely a new section header
                    break

            # Collect summary content
            if in_summary and line_clean:
                summary_lines.append(line_clean)

                # Limit summary length to avoid reading entire resume
                if len(summary_lines) > 8:
                    break

        return ' '.join(summary_lines)

    def _validate_job_title(self, potential_title: str) -> str:
        """
        Validate if a string looks like a legitimate job title.
        Returns formatted job title if valid, empty string if not.
        """
        potential_title = potential_title.strip()

        # Basic validation
        if len(potential_title) < 5 or len(potential_title) > 60:
            return ""

        # Check for common job title words
        job_indicators = [
            'developer', 'engineer', 'analyst', 'architect', 'manager', 'director',
            'designer', 'specialist', 'consultant', 'lead', 'senior', 'principal',
            'chief', 'head', 'coordinator', 'administrator', 'technician', 'scientist',
            'researcher', 'programmer', 'tester', 'qa', 'devops', 'data', 'software',
            'web', 'mobile', 'frontend', 'backend', 'fullstack', 'full stack'
        ]

        title_lower = potential_title.lower()
        if not any(indicator in title_lower for indicator in job_indicators):
            return ""

        # Exclude non-job-title strings
        exclude_patterns = [
            r'^\d+', r'@', r'\.com', r'\.org', r'http', r'www\.',
            r'^phone', r'^email', r'^address', r'^location'
        ]

        for pattern in exclude_patterns:
            if re.search(pattern, title_lower):
                return ""

        # Format the job title properly
        return ' '.join(word.capitalize() for word in potential_title.split())

    def _extract_title_from_experience_headers(self, text: str) -> str:
        """Extract job title from experience section headers."""
        lines = text.split('\n')
        in_experience = False

        experience_indicators = [
            'work experience', 'professional experience', 'experience',
            'employment history', 'career history', 'work history'
        ]

        for i, line in enumerate(lines):
            line_clean = line.strip()
            line_lower = line_clean.lower()

            # Check if we're entering experience section
            if any(indicator in line_lower for indicator in experience_indicators):
                if len(line_clean) < 50:
                    in_experience = True
                    continue

            # Look for job titles in experience section
            if in_experience and line_clean:
                # Stop at education or other major sections
                if any(stop in line_lower for stop in ['education', 'skills', 'projects']):
                    if len(line_clean) < 40:
                        break

                # Check if this line looks like a job title
                validated_title = self._validate_job_title(line_clean)
                if validated_title:
                    return validated_title

                # Look for patterns like "Job Title - Company Name"
                if ' - ' in line_clean or ' | ' in line_clean or ' at ' in line_clean:
                    separator = ' - ' if ' - ' in line_clean else (' | ' if ' | ' in line_clean else ' at ')
                    parts = line_clean.split(separator)
                    if len(parts) >= 2:
                        potential_title = parts[0].strip()
                        validated_title = self._validate_job_title(potential_title)
                        if validated_title:
                            return validated_title

                # Limit how far we read into experience section
                if len([l for l in lines[:i+10] if l.strip()]) > 15:
                    break

        return ""

    def _extract_enhanced_skills(self, text: str) -> List[str]:
        """
        Enhanced skills extraction that focuses only on technical skills
        and filters out non-technical terms.
        """
        text_lower = text.lower()
        found_skills = set()

        # Primary matching: exact technical skills
        for skill in self.technical_skills:
            # Use word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, text_lower):
                # Format skill name properly
                formatted_skill = self._format_skill_name(skill)
                found_skills.add(formatted_skill)

        # Secondary matching: look in skills sections for additional technical terms
        skills_section_content = self._extract_skills_section_content(text)
        if skills_section_content:
            additional_skills = self._parse_skills_section(skills_section_content)
            found_skills.update(additional_skills)

        # Filter out excluded terms and validate
        filtered_skills = []
        for skill in found_skills:
            if self._is_valid_technical_skill(skill):
                filtered_skills.append(skill)

        return sorted(filtered_skills)

    def _extract_skills_section_content(self, text: str) -> str:
        """Extract content specifically from skills sections."""
        lines = text.split('\n')
        skills_lines = []
        in_skills = False

        skills_indicators = [
            'technical skills', 'skills', 'core skills', 'key skills',
            'competencies', 'technologies', 'tools and technologies',
            'programming languages', 'frameworks', 'technical competencies'
        ]

        stop_indicators = [
            'experience', 'education', 'projects', 'achievements',
            'certifications', 'awards', 'interests', 'references'
        ]

        for line in lines:
            line_clean = line.strip()
            line_lower = line_clean.lower()

            # Check if we're starting skills section
            if not in_skills and any(indicator in line_lower for indicator in skills_indicators):
                if len(line_clean) < 60:
                    in_skills = True
                    continue

            # Check if we're leaving skills section
            if in_skills and any(indicator in line_lower for indicator in stop_indicators):
                if len(line_clean) < 50:
                    break

            # Collect skills content
            if in_skills and line_clean:
                skills_lines.append(line_clean)

                # Limit skills section reading
                if len(skills_lines) > 15:
                    break

        return ' '.join(skills_lines)

    def _parse_skills_section(self, skills_text: str) -> set:
        """Parse skills from skills section content."""
        skills = set()

        # Split by common separators
        separators = [',', '|', '*', '-', '\n', ';', '/']
        text_parts = [skills_text]

        for sep in separators:
            new_parts = []
            for part in text_parts:
                new_parts.extend(part.split(sep))
            text_parts = new_parts

        # Clean and validate each potential skill
        for part in text_parts:
            part_clean = part.strip(' \t\n\r*-')
            if len(part_clean) > 2 and len(part_clean) < 30:
                # Check if it looks like a technical skill
                if self._looks_like_technical_skill(part_clean):
                    formatted_skill = self._format_skill_name(part_clean)
                    skills.add(formatted_skill)

        return skills

    def _looks_like_technical_skill(self, text: str) -> bool:
        """Determine if a text looks like a technical skill."""
        text_lower = text.lower()

        # Exclude common non-technical terms
        if text_lower in self.excluded_terms:
            return False

        # Check for technical indicators
        technical_indicators = [
            '.js', '.py', '.java', '.net', '.php', 'js', 'css', 'html',
            'api', 'sql', 'db', 'aws', 'cloud', 'docker', 'git'
        ]

        if any(indicator in text_lower for indicator in technical_indicators):
            return True

        # Check against our known technical skills (fuzzy match)
        for skill in self.technical_skills:
            if skill in text_lower or text_lower in skill:
                return True

        # Check for version numbers (often indicates technical tools)
        if re.search(r'\d+(\.\d+)*', text):
            return True

        return False

    def _is_valid_technical_skill(self, skill: str) -> bool:
        """Final validation for technical skills."""
        skill_lower = skill.lower()

        # Must not be in excluded terms
        if skill_lower in self.excluded_terms:
            return False

        # Must be reasonable length
        if len(skill) < 2 or len(skill) > 25:
            return False

        # Should not be common English words
        common_words = [
            'the', 'and', 'for', 'with', 'have', 'this', 'that', 'from',
            'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time',
            'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make',
            'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'
        ]

        if skill_lower in common_words:
            return False

        return True

    def _format_skill_name(self, skill: str) -> str:
        """Format skill name consistently."""
        skill = skill.strip()

        # Special cases for common technologies
        special_cases = {
            'javascript': 'JavaScript',
            'typescript': 'TypeScript',
            'nodejs': 'Node.js',
            'node.js': 'Node.js',
            'reactjs': 'React',
            'react.js': 'React',
            'angularjs': 'Angular',
            'vue.js': 'Vue.js',
            'vuejs': 'Vue.js',
            'next.js': 'Next.js',
            'nextjs': 'Next.js',
            'express.js': 'Express.js',
            'asp.net': 'ASP.NET',
            '.net': '.NET',
            'c#': 'C#',
            'c++': 'C++',
            'mysql': 'MySQL',
            'postgresql': 'PostgreSQL',
            'mongodb': 'MongoDB',
            'graphql': 'GraphQL',
            'css3': 'CSS3',
            'html5': 'HTML5',
            'jquery': 'jQuery'
        }

        skill_lower = skill.lower()
        if skill_lower in special_cases:
            return special_cases[skill_lower]

        # Default formatting: title case
        return skill.title()

    def _parse_resume_basic(self, file_path: str) -> Dict[str, Any]:
        """Basic resume parsing functionality."""
        try:
            # Extract text from the file
            text = self._extract_text_from_file(file_path)
            if not text or len(text.strip()) < 10:
                return {'error': 'Could not extract text from file or file is too short'}

            # Basic parsing
            parsed_data = {
                'name': self._extract_name_basic(text),
                'email': self._extract_email_basic(text),
                'phone': self._extract_phone_basic(text),
                'skills': self._extract_skills_basic(text),
                'experience': self._extract_experience_basic(text),
                'education': self._extract_education_basic(text),
                'current_position': self._extract_position_basic(text),
                'current_company': self._extract_company_basic(text),
                'text': text[:1000]  # First 1000 characters for preview
            }

            return parsed_data

        except Exception as e:
            return {'error': f'Error parsing resume: {str(e)}'}

    def _extract_text_from_file(self, file_path: str) -> str:
        """Extract text from PDF or DOCX file."""
        file_extension = os.path.splitext(file_path)[1].lower()

        try:
            if file_extension == '.pdf':
                return self._extract_from_pdf(file_path)
            elif file_extension == '.docx':
                return self._extract_from_docx(file_path)
            else:
                return ''
        except Exception as e:
            print(f"Error extracting text: {e}")
            return ''

    def _extract_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file."""
        text = ''
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() + '\n'
        return text

    def _extract_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file."""
        doc = Document(file_path)
        text = ''
        for paragraph in doc.paragraphs:
            text += paragraph.text + '\n'
        return text

    def _extract_name_basic(self, text: str) -> str:
        """Basic name extraction."""
        # Simple approach - get first line that looks like a name
        lines = text.split('\n')[:3]  # Check first 3 lines
        for line in lines:
            line = line.strip()
            if len(line) > 5 and len(line) < 50 and ' ' in line:
                # Check if it's likely a name (not an email, phone, etc.)
                if not re.search(r'[@\d]', line):
                    return line
        return ''

    def _extract_email_basic(self, text: str) -> str:
        """Basic email extraction."""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        return emails[0] if emails else ''

    def _extract_phone_basic(self, text: str) -> str:
        """Basic phone extraction."""
        phone_pattern = r'[\+]?[1-9]?[\d\s\(\)-]{8,15}\d'
        phones = re.findall(phone_pattern, text)
        return phones[0].strip() if phones else ''

    def _extract_skills_basic(self, text: str) -> List[str]:
        """Basic skills extraction."""
        found_skills = []
        text_lower = text.lower()

        for skill in self.technical_skills:
            if skill.lower() in text_lower:
                found_skills.append(self._format_skill(skill))

        return list(set(found_skills))  # Remove duplicates

    def _extract_experience_basic(self, text: str) -> Dict[str, Any]:
        """Basic experience extraction."""
        # Look for year patterns that might indicate experience
        year_pattern = r'(\d{4})\s*[-]\s*(\d{4}|present|current)'
        matches = re.findall(year_pattern, text.lower())

        experience_years = 0
        current_year = 2024

        for start_year, end_year in matches:
            try:
                start = int(start_year)
                end = current_year if end_year in ['present', 'current'] else int(end_year)
                years = max(0, end - start)
                experience_years = max(experience_years, years)
            except ValueError:
                continue

        return {
            'years': experience_years,
            'extraction_method': 'basic',
            'companies': []
        }

    def _extract_education_basic(self, text: str) -> List[str]:
        """Basic education extraction."""
        education_keywords = ['bachelor', 'master', 'phd', 'degree', 'university', 'college', 'diploma', 'certification']
        education = []

        lines = text.split('\n')
        for line in lines:
            line_lower = line.lower()
            if any(keyword in line_lower for keyword in education_keywords):
                education.append(line.strip())

        return education[:3]  # Return max 3 education entries

    def _extract_position_basic(self, text: str) -> str:
        """Basic position extraction."""
        # Look for common job title keywords
        job_titles = ['developer', 'engineer', 'manager', 'analyst', 'consultant', 'designer', 'architect']

        lines = text.split('\n')[:5]  # Check first 5 lines
        for line in lines:
            line_lower = line.lower()
            if any(title in line_lower for title in job_titles):
                return line.strip()

        return ''

    def _extract_company_basic(self, text: str) -> str:
        """Basic company extraction."""
        # Simple heuristic - look for lines with "at Company" or similar patterns
        at_pattern = r'at\s+([A-Z][A-Za-z\s&]+)'
        matches = re.findall(at_pattern, text)
        return matches[0].strip() if matches else ''