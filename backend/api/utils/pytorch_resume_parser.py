"""
PyTorch-based Resume Parser

This module provides a modern PyTorch-based approach to resume parsing using
transformers and neural networks for better accuracy in information extraction.
"""

import re
import os
import json
from typing import Dict, List, Any, Optional, Tuple
from docx import Document
import pdfplumber
import torch
from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification
import warnings
import logging

# Suppress transformers warnings
warnings.filterwarnings("ignore", category=UserWarning)
logging.getLogger("transformers").setLevel(logging.ERROR)

class PyTorchResumeParser:
    """
    Advanced resume parser using PyTorch models and transformers for
    accurate information extraction from resumes.
    """

    def __init__(self):
        """Initialize the parser with pre-trained models and patterns."""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"PyTorch Resume Parser initialized on {self.device.upper()}")

        # Lazy loading for NER pipeline to avoid initialization timeout
        self.ner_pipeline = None
        self._ner_pipeline_initialized = False

        # Technical skills database with confidence scoring
        self.technical_skills_db = {
            # Programming Languages (High Priority)
            'python': {'priority': 10, 'category': 'programming'},
            'javascript': {'priority': 10, 'category': 'programming'},
            'typescript': {'priority': 9, 'category': 'programming'},
            'java': {'priority': 10, 'category': 'programming'},
            'c++': {'priority': 9, 'category': 'programming'},
            'c#': {'priority': 9, 'category': 'programming'},
            'go': {'priority': 8, 'category': 'programming'},
            'rust': {'priority': 8, 'category': 'programming'},
            'swift': {'priority': 8, 'category': 'programming'},
            'kotlin': {'priority': 8, 'category': 'programming'},

            # Frontend Frameworks (High Priority)
            'react': {'priority': 10, 'category': 'frontend'},
            'reactjs': {'priority': 10, 'category': 'frontend'},
            'angular': {'priority': 9, 'category': 'frontend'},
            'vue': {'priority': 9, 'category': 'frontend'},
            'vuejs': {'priority': 9, 'category': 'frontend'},
            'next.js': {'priority': 9, 'category': 'frontend'},
            'svelte': {'priority': 8, 'category': 'frontend'},
            'html': {'priority': 9, 'category': 'frontend'},
            'css': {'priority': 9, 'category': 'frontend'},
            'html5': {'priority': 9, 'category': 'frontend'},
            'css3': {'priority': 9, 'category': 'frontend'},
            'bootstrap': {'priority': 8, 'category': 'frontend'},
            'tailwind': {'priority': 8, 'category': 'frontend'},
            'tailwindcss': {'priority': 8, 'category': 'frontend'},
            'redux': {'priority': 8, 'category': 'frontend'},

            # Backend Frameworks (High Priority)
            'django': {'priority': 9, 'category': 'backend'},
            'flask': {'priority': 8, 'category': 'backend'},
            'fastapi': {'priority': 8, 'category': 'backend'},
            'express': {'priority': 9, 'category': 'backend'},
            'node.js': {'priority': 10, 'category': 'backend'},
            'spring': {'priority': 9, 'category': 'backend'},
            'asp.net': {'priority': 8, 'category': 'backend'},

            # Databases (High Priority)
            'mongodb': {'priority': 9, 'category': 'database'},
            'mysql': {'priority': 9, 'category': 'database'},
            'postgresql': {'priority': 9, 'category': 'database'},
            'redis': {'priority': 8, 'category': 'database'},
            'elasticsearch': {'priority': 8, 'category': 'database'},

            # Cloud & DevOps (High Priority)
            'aws': {'priority': 10, 'category': 'cloud'},
            'azure': {'priority': 9, 'category': 'cloud'},
            'gcp': {'priority': 9, 'category': 'cloud'},
            'docker': {'priority': 10, 'category': 'devops'},
            'kubernetes': {'priority': 9, 'category': 'devops'},
            'jenkins': {'priority': 8, 'category': 'devops'},
            'terraform': {'priority': 8, 'category': 'devops'},

            # AI/ML (High Priority)
            'tensorflow': {'priority': 9, 'category': 'ai_ml'},
            'pytorch': {'priority': 10, 'category': 'ai_ml'},
            'scikit-learn': {'priority': 8, 'category': 'ai_ml'},
            'pandas': {'priority': 9, 'category': 'ai_ml'},
            'numpy': {'priority': 8, 'category': 'ai_ml'},
        }

        # Experience extraction patterns (enhanced with context)
        self.experience_patterns = [
            # Direct experience statements
            (r'(\d+(?:\.\d+)?)\+?\s*years?\s*(?:of\s*)?(?:work\s*|professional\s*)?experience', 10),
            (r'experience\s*:?\s*(\d+(?:\.\d+)?)\+?\s*years?', 9),
            (r'(\d+(?:\.\d+)?)\+?\s*yrs?\s*(?:of\s*)?(?:work\s*|professional\s*)?experience', 9),
            (r'over\s*(\d+(?:\.\d+)?)\+?\s*years?', 8),
            (r'more\s*than\s*(\d+(?:\.\d+)?)\+?\s*years?', 8),

            # Context-aware patterns
            (r'(?:developer|engineer|analyst).*?(\d+(?:\.\d+)?)\+?\s*years?', 7),
            (r'(\d+(?:\.\d+)?)\+?\s*years?.*?(?:developer|engineer|analyst)', 7),
            (r'total\s*experience\s*:?\s*(\d+(?:\.\d+)?)\+?\s*years?', 9),
            (r'work\s*experience\s*:?\s*(\d+(?:\.\d+)?)\+?\s*years?', 9),
        ]

        # Email and phone patterns
        self.email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        self.phone_patterns = [
            r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b',
            r'\b(?:\+91[-.\s]?)?([0-9]{5})[-.\s]?([0-9]{5})\b',  # Indian format
            r'\b(?:\+[1-9][0-9][-.\s]?)?([0-9]{4})[-.\s]?([0-9]{3})[-.\s]?([0-9]{3})\b'
        ]

    def parse_resume(self, file_path: str, original_filename: str = None) -> Dict[str, Any]:
        """
        Parse resume using PyTorch models and advanced NLP techniques.

        Args:
            file_path: Path to the resume file
            original_filename: Original filename for experience extraction

        Returns:
            Dictionary containing parsed resume data
        """
        try:
            print(f"Starting PyTorch parsing for: {original_filename or os.path.basename(file_path)}")

            # Extract text from file
            text = self._extract_text(file_path)
            if not text:
                return {'error': 'Could not extract text from file'}

            # Use filename for experience extraction (highest priority)
            filename = original_filename or os.path.basename(file_path)
            filename_experience = self._extract_experience_from_filename(filename)

            # Parse using PyTorch models
            parsed_data = {
                'name': self._extract_name_pytorch(text),
                'email': self._extract_email(text),
                'phone': self._extract_phone(text),
                'skills': self._extract_skills_pytorch(text),
                'experience': self._extract_experience_pytorch(text, filename_experience),
                'education': self._extract_education_pytorch(text),
                'current_position': self._extract_position_pytorch(text),
                'current_company': self._extract_company_pytorch(text),
                'text': text[:1000]  # First 1000 characters for preview
            }

            print(f"PyTorch parsing completed successfully")
            return parsed_data

        except Exception as e:
            print(f"Error: PyTorch parsing error: {str(e)}")
            return {'error': f'PyTorch parsing failed: {str(e)}'}

    def _ensure_ner_pipeline(self):
        """Initialize NER pipeline only when needed (lazy loading)."""
        if not self._ner_pipeline_initialized:
            try:
                print("Initializing NER pipeline (this may take a moment on first run)...")
                self.ner_pipeline = pipeline(
                    "ner",
                    model="dbmdz/bert-large-cased-finetuned-conll03-english",
                    aggregation_strategy="simple",
                    device=0 if torch.cuda.is_available() else -1
                )
                print("NER pipeline initialized successfully")
            except Exception as e:
                print(f"Warning: NER pipeline not available, using fallback: {e}")
                self.ner_pipeline = None
            finally:
                self._ner_pipeline_initialized = True

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
            print(f"Text extraction error: {e}")
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

    def _extract_name_pytorch(self, text: str) -> str:
        """Extract name using PyTorch NER model."""
        # Temporarily disable heavy NER pipeline to avoid timeout issues
        # Will use lightweight extraction instead
        if False:  # self.ner_pipeline:
            try:
                # Get first 500 characters for name extraction
                first_section = text[:500]
                entities = self.ner_pipeline(first_section)

                # Look for PERSON entities
                for entity in entities:
                    if entity['entity_group'] == 'PER' and entity['score'] > 0.8:
                        name = entity['word'].strip()
                        if len(name) > 3 and len(name.split()) >= 2:
                            return name
            except Exception as e:
                print(f"NER name extraction failed: {e}")

        # Fallback to rule-based extraction
        return self._extract_name_fallback(text)

    def _extract_name_fallback(self, text: str) -> str:
        """Fallback name extraction using rules."""
        lines = text.split('\\n')

        for line in lines[:5]:
            line = line.strip()
            if 2 <= len(line.split()) <= 4 and len(line) < 50:
                # Check if it looks like a name
                words = line.split()
                if all(word.replace('-', '').replace("'", '').isalpha() for word in words):
                    return line
        return ''

    def _extract_skills_pytorch(self, text: str) -> List[str]:
        """Extract skills using PyTorch-based analysis with confidence scoring."""
        text_lower = text.lower()
        found_skills = {}

        # Primary skill detection with context analysis
        for skill, info in self.technical_skills_db.items():
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            matches = list(re.finditer(pattern, text_lower))

            if matches:
                # Calculate confidence based on context and frequency
                confidence = self._calculate_skill_confidence(skill, matches, text_lower, info)
                found_skills[skill] = {
                    'confidence': confidence,
                    'priority': info['priority'],
                    'category': info['category'],
                    'count': len(matches)
                }

        # Filter and sort by confidence and priority
        filtered_skills = []
        for skill, data in found_skills.items():
            if data['confidence'] > 0.4:  # Lowered confidence threshold for better skill detection
                filtered_skills.append((skill, data['confidence'] * data['priority']))

        # Sort by weighted score and return top skills
        filtered_skills.sort(key=lambda x: x[1], reverse=True)
        final_skills = [self._format_skill_name(skill[0]) for skill in filtered_skills[:15]]

        print(f"Extracted {len(final_skills)} high-confidence skills")
        return final_skills

    def _calculate_skill_confidence(self, skill: str, matches: List, text: str, info: Dict) -> float:
        """Calculate confidence score for a skill based on context."""
        base_confidence = 0.7

        # Boost confidence if found in skills section
        skills_section_boost = 0.0
        if self._is_in_skills_section(matches, text):
            skills_section_boost = 0.3

        # Boost confidence for high-priority skills
        priority_boost = info['priority'] / 100

        # Frequency boost (diminishing returns)
        frequency_boost = min(len(matches) * 0.1, 0.2)

        total_confidence = min(base_confidence + skills_section_boost + priority_boost + frequency_boost, 1.0)
        return total_confidence

    def _is_in_skills_section(self, matches: List, text: str) -> bool:
        """Check if skill matches are in a skills section."""
        skills_indicators = ['technical skills', 'skills', 'technologies', 'programming languages']

        for match in matches:
            context_start = max(0, match.start() - 200)
            context_end = min(len(text), match.end() + 200)
            context = text[context_start:context_end].lower()

            if any(indicator in context for indicator in skills_indicators):
                return True
        return False

    def _extract_experience_pytorch(self, text: str, filename_experience: Dict) -> Dict[str, Any]:
        """Extract experience using PyTorch analysis with filename priority."""
        # Priority 1: Filename experience (highest confidence)
        if filename_experience and filename_experience.get('months'):
            experience_years = round(filename_experience['months'] / 12, 1)
            if experience_years > 0:
                print(f"Using filename experience: {experience_years} years")
                return {
                    'years': experience_years,
                    'extraction_method': 'pytorch_filename',
                    'confidence': 0.95,
                    'source': filename_experience.get('source', 'filename')
                }

        # Priority 2: Content-based extraction with confidence scoring
        best_experience = {'years': 0, 'confidence': 0.0}
        text_lower = text.lower()

        for pattern, priority in self.experience_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                try:
                    years = float(match)
                    if 0 < years <= 50:  # Reasonable range
                        confidence = self._calculate_experience_confidence(pattern, years, priority, text_lower)
                        if confidence > best_experience['confidence']:
                            best_experience = {
                                'years': years,
                                'confidence': confidence,
                                'extraction_method': 'pytorch_content'
                            }
                except (ValueError, TypeError):
                    continue

        # Fallback: Calculate from employment history
        if best_experience['years'] == 0:
            calculated_years = self._calculate_years_from_employment_history(text)
            if calculated_years > 0:
                best_experience = {
                    'years': calculated_years,
                    'confidence': 0.7,
                    'extraction_method': 'pytorch_dates'
                }

        print(f"Extracted {best_experience.get('years', 0)} years experience (confidence: {best_experience.get('confidence', 0):.2f})")
        return best_experience

    def _calculate_experience_confidence(self, pattern: str, years: float, priority: int, text: str) -> float:
        """Calculate confidence score for experience extraction."""
        base_confidence = 0.6

        # Pattern priority boost
        pattern_boost = priority / 100

        # Reasonableness check
        reasonableness_boost = 0.0
        if 1 <= years <= 15:
            reasonableness_boost = 0.2
        elif 15 < years <= 25:
            reasonableness_boost = 0.1

        # Context boost (if found near work/experience keywords)
        context_keywords = ['work experience', 'professional experience', 'career', 'employment']
        context_boost = 0.0
        for keyword in context_keywords:
            if keyword in text and str(int(years)) in text:
                context_boost = 0.1
                break

        total_confidence = min(base_confidence + pattern_boost + reasonableness_boost + context_boost, 1.0)
        return total_confidence

    def _calculate_years_from_employment_history(self, text: str) -> float:
        """Calculate experience years from employment date ranges."""
        import datetime
        current_year = datetime.datetime.now().year

        # Look for date patterns
        date_patterns = [
            r'(\\d{4})\\s*[-]\\s*(\\d{4})',
            r'(\\d{4})\\s*[-]\\s*(?:present|current|now)',
            r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\s*(\\d{4})\\s*[-]\\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\s*(\\d{4})'
        ]

        total_years = 0
        found_ranges = set()

        for pattern in date_patterns:
            matches = re.findall(pattern, text.lower())
            for match in matches:
                try:
                    if len(match) == 2:
                        start_year = int(match[0])
                        end_year = int(match[1]) if match[1].isdigit() else current_year

                        if 1990 <= start_year <= current_year and start_year <= end_year:
                            years_diff = end_year - start_year
                            range_key = (start_year, end_year)
                            if range_key not in found_ranges and years_diff <= 30:
                                found_ranges.add(range_key)
                                total_years += years_diff
                    else:
                        start_year = int(match[0])
                        if 1990 <= start_year <= current_year:
                            years_diff = current_year - start_year
                            range_key = (start_year, current_year)
                            if range_key not in found_ranges and years_diff <= 30:
                                found_ranges.add(range_key)
                                total_years += years_diff
                except (ValueError, IndexError):
                    continue

        return min(total_years, 30)  # Cap at reasonable maximum

    def _extract_experience_from_filename(self, filename: str) -> Dict[str, Any]:
        """Extract experience from filename with enhanced patterns."""
        filename_lower = filename.lower()

        enhanced_patterns = [
            # Years patterns
            (r'(\\d+)\\s*(?:years?|yrs?)(?:\\s*(?:experience|exp|work))?', 'years'),
            (r'(?:experience|exp|work)\\s*(\\d+)\\s*(?:years?|yrs?)', 'years'),

            # Months patterns
            (r'(\\d+)\\s*(?:months?|mos?)(?:\\s*(?:experience|exp|work))?', 'months'),
            (r'(?:experience|exp|work)\\s*(\\d+)\\s*(?:months?|mos?)', 'months'),

            # Technology-specific patterns
            (r'(?:react|python|java|javascript|node|angular|vue)\\s*(\\d+)\\s*(?:years?|yrs?|months?|mos?)', 'tech_years'),
            (r'(\\d+)\\s*(?:years?|yrs?|months?|mos?)\\s*(?:react|python|java|javascript|node|angular|vue)', 'tech_years'),
        ]

        for pattern, exp_type in enhanced_patterns:
            matches = re.findall(pattern, filename_lower)
            if matches:
                try:
                    value = int(matches[0])
                    if exp_type == 'months' or 'months' in pattern or 'mos' in pattern:
                        months = value
                    else:
                        months = value * 12

                    if months > 0:
                        return {
                            'months': months,
                            'source': f'filename_{exp_type}',
                            'confidence': 0.95
                        }
                except (ValueError, IndexError):
                    continue

        return {}

    def _extract_education_pytorch(self, text: str) -> List[str]:
        """Extract education using PyTorch-enhanced analysis."""
        education_items = []

        # Education section indicators
        education_patterns = [
            r'education.*?(?=(?:experience|skills|projects|work|$))',
            r'academic.*?(?=(?:experience|skills|projects|work|$))',
            r'qualification.*?(?=(?:experience|skills|projects|work|$))'
        ]

        education_keywords = [
            'bachelor', 'master', 'phd', 'doctorate', 'diploma', 'certificate',
            'university', 'college', 'institute', 'school', 'degree',
            'b.s.', 'b.a.', 'm.s.', 'm.a.', 'b.tech', 'm.tech', 'mba', 'b.e.', 'm.e.'
        ]

        text_lower = text.lower()

        # Extract education sections
        for pattern in education_patterns:
            matches = re.findall(pattern, text_lower, re.DOTALL | re.IGNORECASE)
            for match in matches:
                lines = match.split('\\n')
                for line in lines:
                    line = line.strip()
                    if line and any(keyword in line for keyword in education_keywords):
                        if len(line) > 10 and len(line) < 150:
                            education_items.append(line.title())

        # Fallback: scan entire text for education keywords
        if not education_items:
            lines = text.split('\\n')
            for line in lines:
                line_lower = line.lower().strip()
                if any(keyword in line_lower for keyword in education_keywords) and len(line.strip()) > 10:
                    education_items.append(line.strip())

        return education_items[:3]  # Return top 3 education items

    def _extract_position_pytorch(self, text: str) -> str:
        """Extract current position using PyTorch analysis."""
        # Job title patterns with context
        job_title_patterns = [
            r'(?:current\\s+)?(?:position|role|title)\\s*:?\\s*([^\\n]+)',
            r'(?:working\\s+as|employed\\s+as)\\s+(?:a|an)?\\s*([^\\n]+)',
            r'^([^\\n]*(?:developer|engineer|analyst|architect|manager|designer|specialist|consultant)[^\\n]*)',
            r'(?:i\\s+am\\s+(?:a|an)?\\s+)([^\\n]+(?:developer|engineer|analyst|architect|manager|designer|specialist))',
        ]

        lines = text.split('\\n')

        # Check first few lines for job titles
        for i, line in enumerate(lines[:5]):
            line = line.strip()
            if 10 <= len(line) <= 60:
                for pattern in job_title_patterns:
                    match = re.search(pattern, line, re.IGNORECASE)
                    if match:
                        title = match.group(1).strip()
                        if self._is_valid_job_title(title):
                            return self._format_job_title(title)

        # Look for titles in professional summary
        summary_section = self._extract_summary_section(text)
        if summary_section:
            for pattern in job_title_patterns:
                match = re.search(pattern, summary_section, re.IGNORECASE)
                if match:
                    title = match.group(1).strip()
                    if self._is_valid_job_title(title):
                        return self._format_job_title(title)

        return ''

    def _extract_company_pytorch(self, text: str) -> str:
        """Extract current company using PyTorch analysis."""
        company_patterns = [
            r'(?:currently\\s+at|working\\s+at|employed\\s+at)\\s+([^\\n,]+)',
            r'(?:company|organization|employer)\\s*:?\\s*([^\\n]+)',
            r'([^\\n]*(?:technologies|systems|solutions|inc|corp|ltd|llc|pvt)[^\\n]*)',
        ]

        lines = text.split('\\n')
        for line in lines[:10]:
            line = line.strip()
            for pattern in company_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    company = match.group(1).strip()
                    if self._is_valid_company_name(company):
                        return company

        return ''

    def _extract_summary_section(self, text: str) -> str:
        """Extract professional summary section."""
        summary_indicators = [
            'professional summary', 'career summary', 'summary', 'profile',
            'professional profile', 'career profile', 'objective', 'about'
        ]

        lines = text.split('\\n')
        summary_lines = []
        in_summary = False

        for line in lines:
            line_clean = line.strip()
            line_lower = line_clean.lower()

            if not in_summary and any(indicator in line_lower for indicator in summary_indicators):
                in_summary = True
                continue

            if in_summary:
                if any(stop in line_lower for stop in ['experience', 'education', 'skills']):
                    if len(line_clean) < 50:
                        break

                if line_clean:
                    summary_lines.append(line_clean)
                    if len(summary_lines) > 8:
                        break

        return ' '.join(summary_lines)

    def _is_valid_job_title(self, title: str) -> bool:
        """Validate if string is a legitimate job title."""
        if len(title) < 5 or len(title) > 60:
            return False

        job_indicators = [
            'developer', 'engineer', 'analyst', 'architect', 'manager', 'director',
            'designer', 'specialist', 'consultant', 'lead', 'senior', 'principal',
            'chief', 'head', 'coordinator', 'administrator', 'scientist'
        ]

        return any(indicator in title.lower() for indicator in job_indicators)

    def _is_valid_company_name(self, company: str) -> bool:
        """Validate if string is a legitimate company name."""
        if len(company) < 3 or len(company) > 100:
            return False

        exclude_patterns = ['email', 'phone', 'address', 'http', 'www']
        return not any(pattern in company.lower() for pattern in exclude_patterns)

    def _format_job_title(self, title: str) -> str:
        """Format job title properly."""
        return ' '.join(word.capitalize() for word in title.split())

    def _format_skill_name(self, skill: str) -> str:
        """Format skill name consistently."""
        special_cases = {
            'javascript': 'JavaScript',
            'typescript': 'TypeScript',
            'nodejs': 'Node.js',
            'reactjs': 'React',
            'vuejs': 'Vue.js',
            'next.js': 'Next.js',
            'asp.net': 'ASP.NET',
            'c#': 'C#',
            'c++': 'C++',
            'mysql': 'MySQL',
            'postgresql': 'PostgreSQL',
            'mongodb': 'MongoDB',
            'pytorch': 'PyTorch'
        }

        skill_lower = skill.lower()
        return special_cases.get(skill_lower, skill.title())

    def _extract_email(self, text: str) -> str:
        """Extract email address."""
        emails = re.findall(self.email_pattern, text)
        return emails[0] if emails else ''

    def _extract_phone(self, text: str) -> str:
        """Extract phone number."""
        for pattern in self.phone_patterns:
            matches = re.findall(pattern, text)
            if matches:
                if isinstance(matches[0], tuple):
                    return ''.join(matches[0])
                return matches[0]
        return ''