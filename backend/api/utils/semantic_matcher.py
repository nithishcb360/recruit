import numpy as np
import json
import logging
from typing import List, Dict, Tuple, Optional
from django.conf import settings
import os

logger = logging.getLogger(__name__)

class SemanticMatcher:
    """
    Semantic matching utility using sentence-transformers for job-candidate matching.
    Provides functionality for text embedding generation and similarity scoring.
    """
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initialize the semantic matcher with a pre-trained model.
        
        Args:
            model_name: Name of the sentence-transformers model to use
        """
        self.model_name = model_name
        self.model = None
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the sentence transformer model with error handling."""
        try:
            # Import here to avoid issues if dependencies aren't fully installed
            from sentence_transformers import SentenceTransformer
            
            self.model = SentenceTransformer(self.model_name)
            logger.info(f"Semantic matcher initialized with model: {self.model_name}")
            
        except ImportError:
            logger.warning("sentence-transformers not available. Using fallback similarity.")
            self.model = None
        except Exception as e:
            logger.error(f"Failed to initialize semantic model: {e}")
            self.model = None
    
    def generate_embedding(self, text: str) -> Optional[np.ndarray]: # pyright: ignore[reportInvalidTypeForm]
        """
        Generate embedding vector for input text.
        
        Args:
            text: Input text to encode
            
        Returns:
            Numpy array of embeddings or None if model unavailable
        """
        if not self.model or not text:
            return None
            
        try:
            # Clean and preprocess text
            cleaned_text = self._preprocess_text(text)
            embedding = self.model.encode(cleaned_text)
            return embedding
            
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None
    
    def _preprocess_text(self, text: str) -> str:
        """
        Preprocess text for better embedding quality.
        
        Args:
            text: Raw input text
            
        Returns:
            Cleaned and preprocessed text
        """
        if not text:
            return ""
            
        # Remove extra whitespace and normalize
        text = ' '.join(text.split())
        
        # Truncate if too long (models have token limits)
        if len(text) > 5000:
            text = text[:5000] + "..."
            
        return text
    
    def calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float: # pyright: ignore[reportInvalidTypeForm]
        """
        Calculate cosine similarity between two embeddings.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Cosine similarity score between 0 and 1
        """
        if embedding1 is None or embedding2 is None:
            return 0.0
            
        try:
            # Ensure embeddings are numpy arrays
            if not isinstance(embedding1, np.ndarray):
                embedding1 = np.array(embedding1)
            if not isinstance(embedding2, np.ndarray):
                embedding2 = np.array(embedding2)
                
            # Calculate cosine similarity
            dot_product = np.dot(embedding1, embedding2)
            norm1 = np.linalg.norm(embedding1)
            norm2 = np.linalg.norm(embedding2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
                
            similarity = dot_product / (norm1 * norm2)
            
            # Normalize to 0-1 range (cosine similarity is -1 to 1)
            return max(0.0, (similarity + 1) / 2)
            
        except Exception as e:
            logger.error(f"Failed to calculate similarity: {e}")
            return 0.0
    
    def match_candidate_to_job(self, candidate_text: str, job_text: str) -> Dict[str, float]:
        """
        Calculate semantic match score between candidate and job.
        
        Args:
            candidate_text: Candidate resume/profile text
            job_text: Job description text
            
        Returns:
            Dictionary with match scores and details
        """
        # Generate embeddings
        candidate_embedding = self.generate_embedding(candidate_text)
        job_embedding = self.generate_embedding(job_text)
        
        # Calculate overall similarity
        overall_score = self.calculate_similarity(candidate_embedding, job_embedding)
        
        # Extract key sections for detailed matching
        candidate_skills = self._extract_skills_section(candidate_text)
        candidate_experience = self._extract_experience_section(candidate_text)
        
        job_requirements = self._extract_requirements_section(job_text)
        job_skills = self._extract_skills_section(job_text)
        
        # Calculate section-specific scores
        skills_score = 0.0
        experience_score = 0.0
        requirements_score = 0.0
        
        if candidate_skills and job_skills:
            skills_emb1 = self.generate_embedding(candidate_skills)
            skills_emb2 = self.generate_embedding(job_skills)
            skills_score = self.calculate_similarity(skills_emb1, skills_emb2)
        
        if candidate_experience and job_requirements:
            exp_emb = self.generate_embedding(candidate_experience)
            req_emb = self.generate_embedding(job_requirements)
            experience_score = self.calculate_similarity(exp_emb, req_emb)
            requirements_score = experience_score
        
        return {
            'overall_score': round(overall_score * 100, 2),
            'skills_match': round(skills_score * 100, 2),
            'experience_match': round(experience_score * 100, 2),
            'requirements_match': round(requirements_score * 100, 2),
            'weighted_score': round(self._calculate_weighted_score(
                overall_score, skills_score, experience_score
            ) * 100, 2)
        }
    
    def _calculate_weighted_score(self, overall: float, skills: float, experience: float) -> float:
        """
        Calculate weighted score giving different importance to different aspects.
        
        Args:
            overall: Overall semantic similarity
            skills: Skills match score
            experience: Experience match score
            
        Returns:
            Weighted final score
        """
        # Weights: overall 40%, skills 35%, experience 25%
        weighted = (overall * 0.4) + (skills * 0.35) + (experience * 0.25)
        return min(1.0, weighted)
    
    def _extract_skills_section(self, text: str) -> str:
        """Extract skills section from text."""
        text_lower = text.lower()
        skills_patterns = [
            'skills:', 'technical skills:', 'core competencies:',
            'technologies:', 'programming languages:', 'tools:'
        ]
        
        for pattern in skills_patterns:
            if pattern in text_lower:
                start_idx = text_lower.find(pattern)
                # Extract next 500 characters after skills keyword
                skills_text = text[start_idx:start_idx + 500]
                return skills_text
        
        return ""
    
    def _extract_experience_section(self, text: str) -> str:
        """Extract experience section from text."""
        text_lower = text.lower()
        exp_patterns = [
            'experience:', 'work experience:', 'professional experience:',
            'employment history:', 'career summary:'
        ]
        
        for pattern in exp_patterns:
            if pattern in text_lower:
                start_idx = text_lower.find(pattern)
                # Extract next 1000 characters after experience keyword
                exp_text = text[start_idx:start_idx + 1000]
                return exp_text
        
        return ""
    
    def _extract_requirements_section(self, text: str) -> str:
        """Extract requirements section from job description."""
        text_lower = text.lower()
        req_patterns = [
            'requirements:', 'qualifications:', 'preferred qualifications:',
            'must have:', 'required skills:', 'job requirements:'
        ]
        
        for pattern in req_patterns:
            if pattern in text_lower:
                start_idx = text_lower.find(pattern)
                # Extract next 800 characters after requirements keyword
                req_text = text[start_idx:start_idx + 800]
                return req_text
        
        return ""
    
    def batch_match_candidates(self, candidates: List[Dict], job_text: str) -> List[Dict]:
        """
        Match multiple candidates against a single job.
        
        Args:
            candidates: List of candidate dictionaries with 'id' and 'text' keys
            job_text: Job description text
            
        Returns:
            List of candidates with match scores added
        """
        results = []
        
        for candidate in candidates:
            candidate_text = candidate.get('text', '')
            match_scores = self.match_candidate_to_job(candidate_text, job_text)
            
            candidate_result = candidate.copy()
            candidate_result.update(match_scores)
            results.append(candidate_result)
        
        # Sort by weighted score descending
        results.sort(key=lambda x: x.get('weighted_score', 0), reverse=True)
        
        return results
    
    def get_model_info(self) -> Dict[str, str]:
        """
        Get information about the current model.
        
        Returns:
            Dictionary with model information
        """
        return {
            'model_name': self.model_name,
            'status': 'loaded' if self.model else 'not_available',
            'description': 'Sentence transformer model for semantic similarity'
        }


# Global instance
semantic_matcher = SemanticMatcher()


def get_semantic_matcher() -> SemanticMatcher:
    """
    Get the global semantic matcher instance.
    
    Returns:
        SemanticMatcher instance
    """
    return semantic_matcher


# Utility functions for easy use in views
def generate_text_embedding(text: str) -> Optional[np.ndarray]: # pyright: ignore[reportInvalidTypeForm]
    """Generate embedding for text using global matcher."""
    return semantic_matcher.generate_embedding(text)


def calculate_text_similarity(text1: str, text2: str) -> float:
    """Calculate similarity between two texts."""
    emb1 = semantic_matcher.generate_embedding(text1)
    emb2 = semantic_matcher.generate_embedding(text2)
    return semantic_matcher.calculate_similarity(emb1, emb2)


def match_resume_to_job(resume_text: str, job_description: str) -> Dict[str, float]:
    """Match a resume to a job description."""
    return semantic_matcher.match_candidate_to_job(resume_text, job_description)
"""
Semantic Job Matching using Sentence Transformers

This module implements advanced semantic matching between candidates and jobs
using the all-MiniLM-L6-v2 model for better accuracy than keyword-based matching.
"""

import os
import logging
from typing import List, Dict, Tuple, Optional
from django.core.cache import cache
import hashlib

# Try importing ML dependencies with fallback
try:
    import numpy as np
    from sklearn.metrics.pairwise import cosine_similarity
    from sentence_transformers import SentenceTransformer
    ML_DEPENDENCIES_AVAILABLE = True
    logging.info("ML dependencies loaded successfully")
except ImportError as e:
    logging.warning(f"ML dependencies not available: {e}")
    logging.warning("Using enhanced keyword matching with improved business rules")
    ML_DEPENDENCIES_AVAILABLE = False
    # Create mock objects to prevent import errors
    np = None
    cosine_similarity = None
    SentenceTransformer = None

logger = logging.getLogger(__name__)

class SemanticJobMatcher:
    """
    Advanced job matching using semantic similarity with sentence transformers.
    Uses all-MiniLM-L6-v2 model for efficient and accurate semantic embeddings.
    """
    
    def __init__(self):
        """Initialize the semantic matcher with the specified model."""
        self.model_name = "all-MiniLM-L6-v2"
        self.model = None
        self.available = ML_DEPENDENCIES_AVAILABLE
        
        if self.available:
            self._load_model()
        else:
            logger.warning("SemanticJobMatcher initialized without ML dependencies - falling back to keyword matching")
        
        # Cache settings
        self.embedding_cache_timeout = 3600 * 24  # 24 hours
        self.similarity_cache_timeout = 3600 * 2  # 2 hours
    
    def _load_model(self):
        """Load the sentence transformer model with error handling."""
        if not self.available:
            return
            
        try:
            logger.info(f"Loading sentence transformer model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model {self.model_name}: {e}")
            self.available = False
            logger.warning("Semantic matching disabled due to model loading failure")
    
    def _get_cache_key(self, text: str, prefix: str = "embedding") -> str:
        """Generate deterministic cache key for text embeddings."""
        # Normalize text to ensure consistent caching
        normalized_text = text.strip().lower()
        # Use SHA256 for better collision resistance
        text_hash = hashlib.sha256(normalized_text.encode('utf-8')).hexdigest()[:16]
        return f"{prefix}_{self.model_name}_{text_hash}"
    
    def _get_embedding(self, text: str):
        """Get embedding for text with caching."""
        if not self.available:
            return None
            
        if not text or not text.strip():
            return np.zeros(384)  # all-MiniLM-L6-v2 has 384 dimensions
        
        # Check cache first
        cache_key = self._get_cache_key(text)
        cached_embedding = cache.get(cache_key)
        
        if cached_embedding is not None:
            return np.array(cached_embedding)
        
        try:
            # Generate embedding
            embedding = self.model.encode([text.strip()])[0]
            
            # Cache the embedding
            cache.set(cache_key, embedding.tolist(), self.embedding_cache_timeout)
            
            return embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding for text: {e}")
            return np.zeros(384)
    
    def _prepare_candidate_text(self, candidate_data: Dict) -> str:
        """Prepare comprehensive candidate text for embedding."""
        text_parts = []
        
        # Add skills with emphasis
        skills = candidate_data.get('skills', [])
        if skills:
            skills_text = f"Technical skills: {', '.join(skills)}"
            text_parts.append(skills_text)
        
        # Add current position
        current_position = candidate_data.get('current_position', '')
        if current_position:
            text_parts.append(f"Current role: {current_position}")
        
        # Add experience level context
        experience_years = candidate_data.get('experience_years', 0)
        if experience_years:
            if experience_years >= 8:
                level = "senior experienced"
            elif experience_years >= 5:
                level = "senior"
            elif experience_years >= 2:
                level = "mid-level"
            else:
                level = "junior"
            text_parts.append(f"Experience level: {level} with {experience_years} years")
        
        # Add education if available
        education = candidate_data.get('education', [])
        if education:
            # Take first education entry
            edu_text = education[0] if isinstance(education, list) else str(education)
            if edu_text and len(edu_text) < 200:  # Avoid overly long education descriptions
                text_parts.append(f"Education: {edu_text}")
        
        # Add current company context
        current_company = candidate_data.get('current_company', '')
        if current_company:
            text_parts.append(f"Working at: {current_company}")
        
        return " | ".join(text_parts)
    
    def _prepare_job_text(self, job_data: Dict) -> str:
        """Prepare comprehensive job text for embedding with role hierarchy weighting."""
        text_parts = []

        # Job title with heavy emphasis (appears 3 times for importance)
        title = job_data.get('title', '')
        if title:
            text_parts.append(f"Primary role: {title} {title} {title}")

        # Extract and emphasize core technology stack from job title
        core_tech = self._extract_core_technology(title)
        if core_tech:
            text_parts.append(f"Core technology stack: {core_tech} {core_tech}")

        # Job description with primary requirements emphasis
        description = job_data.get('description', '')
        if description:
            # Extract first 500 chars for primary focus, then add rest
            primary_desc = description[:500] if len(description) > 500 else description
            text_parts.append(f"Primary role focus: {primary_desc}")

            # Add remaining description with less weight
            if len(description) > 500:
                secondary_desc = description[500:1000]
                text_parts.append(f"Additional context: {secondary_desc}")

        # Requirements with primary/secondary separation
        requirements = job_data.get('requirements', '')
        if requirements:
            # Extract required vs preferred sections
            primary_reqs, secondary_reqs = self._separate_requirements(requirements)

            if primary_reqs:
                text_parts.append(f"Required skills: {primary_reqs}")
            if secondary_reqs:
                text_parts.append(f"Nice to have: {secondary_reqs}")

        # Experience level
        experience_level = job_data.get('experience_level', '')
        if experience_level:
            text_parts.append(f"Experience level: {experience_level}")

        # Department context
        department = job_data.get('department', {})
        if isinstance(department, dict) and department.get('name'):
            text_parts.append(f"Department: {department['name']}")
        elif isinstance(department, str) and department:
            text_parts.append(f"Department: {department}")

        # Job type context
        job_type = job_data.get('job_type', '') or job_data.get('work_type', '')
        if job_type:
            text_parts.append(f"Job type: {job_type}")

        return " | ".join(text_parts)

    def _extract_core_technology(self, job_title: str) -> str:
        """Extract core technology stack from job title."""
        if not job_title:
            return ""

        title_lower = job_title.lower()

        # Technology stack mapping
        tech_mappings = {
            '.net': 'C# .NET Microsoft',
            'java': 'Java Spring JVM',
            'python': 'Python Django Flask',
            'javascript': 'JavaScript Node.js',
            'node': 'Node.js JavaScript',
            'react': 'React JavaScript Frontend',
            'angular': 'Angular TypeScript Frontend',
            'vue': 'Vue.js JavaScript Frontend',
            'php': 'PHP Laravel Symfony',
            'ruby': 'Ruby Rails',
            'go': 'Go Golang',
            'rust': 'Rust Systems',
            'c++': 'C++ Systems',
            'c#': 'C# .NET Microsoft',
            'swift': 'Swift iOS',
            'kotlin': 'Kotlin Android',
            'devops': 'Docker Kubernetes AWS Azure',
            'frontend': 'HTML CSS JavaScript React',
            'backend': 'API Database Server',
            'fullstack': 'Frontend Backend Database',
            'data': 'Python SQL Analytics ML',
            'mobile': 'iOS Android React Native',
            'cloud': 'AWS Azure GCP Docker'
        }

        for tech, stack in tech_mappings.items():
            if tech in title_lower:
                return stack

        return ""

    def _separate_requirements(self, requirements_text: str) -> tuple:
        """Separate required vs preferred/nice-to-have requirements."""
        if not requirements_text:
            return "", ""

        text_lower = requirements_text.lower()

        # Split on common separators for preferred vs required
        preferred_keywords = [
            'preferred qualifications:', 'nice to have:', 'bonus:',
            'preferred:', 'plus:', 'additional:', 'optional:'
        ]

        required_section = requirements_text
        preferred_section = ""

        # Find the split point
        split_pos = len(requirements_text)
        for keyword in preferred_keywords:
            pos = text_lower.find(keyword)
            if pos != -1 and pos < split_pos:
                split_pos = pos

        if split_pos < len(requirements_text):
            required_section = requirements_text[:split_pos].strip()
            preferred_section = requirements_text[split_pos:].strip()

        # Limit length to avoid overwhelming embeddings
        if len(required_section) > 600:
            required_section = required_section[:600] + "..."
        if len(preferred_section) > 400:
            preferred_section = preferred_section[:400] + "..."

        return required_section, preferred_section

    def calculate_job_match_score(self, candidate_data: Dict, job_data: Dict) -> float:
        """
        Calculate similarity score between candidate and job.
        Uses semantic similarity when available, falls back to keyword matching.
        
        Args:
            candidate_data: Dictionary containing candidate information
            job_data: Dictionary containing job information
        
        Returns:
            Float score between 0-100 representing match percentage
        """
        try:
            # If semantic matching is not available, use keyword-based matching
            if not self.available:
                return self._calculate_keyword_match_score(candidate_data, job_data)
            
            # Prepare text representations
            candidate_text = self._prepare_candidate_text(candidate_data)
            job_text = self._prepare_job_text(job_data)
            
            # Handle empty texts
            if not candidate_text.strip() or not job_text.strip():
                return 0.0
            
            # Generate deterministic cache key for this specific match
            match_key = f"{candidate_text}||{job_text}"
            cache_key = self._get_cache_key(match_key, "similarity_v2")  # v2 for new algorithm
            cached_score = cache.get(cache_key)
            if cached_score is not None:
                logger.debug(f"Using cached similarity score: {cached_score}")
                return cached_score
            
            # Get embeddings
            candidate_embedding = self._get_embedding(candidate_text)
            job_embedding = self._get_embedding(job_text)
            
            # Handle case where embeddings failed
            if candidate_embedding is None or job_embedding is None:
                return self._calculate_keyword_match_score(candidate_data, job_data)
            
            # Calculate cosine similarity
            similarity = cosine_similarity(
                candidate_embedding.reshape(1, -1), 
                job_embedding.reshape(1, -1)
            )[0][0]
            
            # Convert to percentage (0-100) with some enhancement for better UX
            score = float(similarity) * 100
            
            # Apply some business logic adjustments
            score = self._apply_business_rules(candidate_data, job_data, score)
            
            # Ensure score is within bounds
            score = max(0.0, min(100.0, score))
            
            # Cache the result
            cache.set(cache_key, score, self.similarity_cache_timeout)
            
            return round(score, 2)
            
        except Exception as e:
            logger.error(f"Failed to calculate job match score: {e}")
            return self._calculate_keyword_match_score(candidate_data, job_data)
    
    def _apply_business_rules(self, candidate_data: Dict, job_data: Dict, base_score: float) -> float:
        """Apply enhanced business logic with technology stack penalties and role hierarchy."""
        adjusted_score = base_score

        # Technology Stack Compatibility Check (CRITICAL)
        tech_penalty = self._calculate_technology_mismatch_penalty(candidate_data, job_data)
        adjusted_score -= tech_penalty

        # Experience level matching bonus
        candidate_years = candidate_data.get('experience_years', 0)
        job_level = job_data.get('experience_level', '').lower()

        experience_bonus = 0
        if job_level == 'entry' and 0 <= candidate_years <= 2:
            experience_bonus = 5
        elif job_level == 'junior' and 1 <= candidate_years <= 3:
            experience_bonus = 5
        elif job_level == 'mid' and 2 <= candidate_years <= 6:
            experience_bonus = 5
        elif job_level == 'senior' and candidate_years >= 5:
            experience_bonus = 5
        elif job_level == 'lead' and candidate_years >= 7:
            experience_bonus = 5
        elif job_level == 'principal' and candidate_years >= 10:
            experience_bonus = 5

        # Enhanced skills matching with primary/secondary weighting
        primary_skills_bonus = self._calculate_primary_skills_match(candidate_data, job_data)
        secondary_skills_bonus = self._calculate_secondary_skills_match(candidate_data, job_data)

        # Role alignment bonus/penalty
        role_alignment = self._calculate_role_alignment(candidate_data, job_data)

        # Current position relevance (enhanced)
        position_bonus = self._calculate_position_relevance(candidate_data, job_data)

        # Apply all adjustments
        adjusted_score += (experience_bonus + primary_skills_bonus + secondary_skills_bonus +
                         role_alignment + position_bonus)

        return adjusted_score

    def _calculate_technology_mismatch_penalty(self, candidate_data: Dict, job_data: Dict) -> float:
        """Calculate penalty for technology stack mismatches."""
        job_title = job_data.get('title', '').lower()
        candidate_skills = set(skill.lower() for skill in candidate_data.get('skills', []))
        current_position = candidate_data.get('current_position', '').lower()

        # Define technology stack conflicts
        stack_conflicts = {
            '.net': {'react', 'vue', 'angular'} if 'backend' in job_title or 'api' in job_title else set(),
            'java': {'react', 'vue', 'angular'} if 'backend' in job_title or 'api' in job_title else set(),
            'python': {'react', 'vue', 'angular'} if 'backend' in job_title or 'django' in job_title else set(),
            'devops': {'react', 'vue', 'angular', 'html', 'css'} if 'devops' in job_title else set(),
            'frontend': {'java', '.net', 'c#', 'spring'} if 'frontend' in job_title else set(),
            'backend': {'html', 'css', 'bootstrap'} if 'backend' in job_title else set()
        }

        penalty = 0.0

        # Check for major stack mismatches
        for job_tech, conflicting_skills in stack_conflicts.items():
            if job_tech in job_title:
                conflict_count = sum(1 for skill in candidate_skills if skill in conflicting_skills)
                if conflict_count > 0:
                    # High penalty for major technology mismatches
                    penalty += min(conflict_count * 10, 25)  # Max 25 point penalty

        # Specific role mismatch penalties
        if '.net' in job_title and 'frontend' in current_position:
            penalty += 15  # Frontend dev applying for .NET role
        elif 'devops' in job_title and 'frontend' in current_position:
            penalty += 20  # Frontend dev applying for DevOps role
        elif 'backend' in job_title and 'frontend' in current_position:
            penalty += 10  # Some overlap but still misaligned

        return penalty

    def _calculate_primary_skills_match(self, candidate_data: Dict, job_data: Dict) -> float:
        """Calculate bonus for primary skills match."""
        candidate_skills = set(skill.lower() for skill in candidate_data.get('skills', []))

        # Extract required skills section
        requirements = job_data.get('requirements', '')
        primary_reqs, _ = self._separate_requirements(requirements)
        primary_text = (job_data.get('title', '') + ' ' + primary_reqs).lower()

        # Count matches in primary requirements
        primary_matches = sum(1 for skill in candidate_skills if skill in primary_text)
        return min(primary_matches * 3, 15)  # Max 15 points for primary skills

    def _calculate_secondary_skills_match(self, candidate_data: Dict, job_data: Dict) -> float:
        """Calculate bonus for secondary/nice-to-have skills match."""
        candidate_skills = set(skill.lower() for skill in candidate_data.get('skills', []))

        # Extract preferred skills section
        requirements = job_data.get('requirements', '')
        _, secondary_reqs = self._separate_requirements(requirements)

        if secondary_reqs:
            secondary_matches = sum(1 for skill in candidate_skills if skill in secondary_reqs.lower())
            return min(secondary_matches * 1, 5)  # Max 5 points for secondary skills

        return 0.0

    def _calculate_role_alignment(self, candidate_data: Dict, job_data: Dict) -> float:
        """Calculate role type alignment bonus/penalty."""
        current_position = candidate_data.get('current_position', '').lower()
        job_title = job_data.get('title', '').lower()

        # Role hierarchy mapping
        role_categories = {
            'frontend': ['frontend', 'ui', 'ux', 'react', 'angular', 'vue'],
            'backend': ['backend', 'api', 'server', '.net', 'java', 'python'],
            'fullstack': ['fullstack', 'full-stack', 'full stack'],
            'devops': ['devops', 'sre', 'infrastructure', 'cloud'],
            'mobile': ['mobile', 'ios', 'android', 'react native'],
            'data': ['data', 'analyst', 'scientist', 'ml', 'ai']
        }

        candidate_category = None
        job_category = None

        # Determine candidate category
        for category, keywords in role_categories.items():
            if any(keyword in current_position for keyword in keywords):
                candidate_category = category
                break

        # Determine job category
        for category, keywords in role_categories.items():
            if any(keyword in job_title for keyword in keywords):
                job_category = category
                break

        # Calculate alignment bonus
        if candidate_category and job_category:
            if candidate_category == job_category:
                return 8  # Perfect role alignment
            elif candidate_category == 'fullstack' or job_category == 'fullstack':
                return 5  # Fullstack can fit many roles
            elif (candidate_category == 'frontend' and job_category == 'backend') or \
                 (candidate_category == 'backend' and job_category == 'frontend'):
                return -5  # Opposite specializations
            else:
                return -2  # Different but not opposite

        return 0

    def _calculate_position_relevance(self, candidate_data: Dict, job_data: Dict) -> float:
        """Enhanced position relevance calculation."""
        current_position = candidate_data.get('current_position', '').lower()
        job_title = job_data.get('title', '').lower()

        if not current_position or not job_title:
            return 0

        # Exact or high similarity matches
        if current_position in job_title or job_title in current_position:
            return 10

        # Word overlap with weighted importance
        position_words = set(current_position.split())
        title_words = set(job_title.split())
        common_words = position_words.intersection(title_words)

        # Weight important role words higher
        important_words = {'senior', 'lead', 'principal', 'developer', 'engineer', 'manager'}
        weighted_score = 0

        for word in common_words:
            if word in important_words:
                weighted_score += 3
            else:
                weighted_score += 1

        return min(weighted_score, 8)
    
    def _calculate_keyword_match_score(self, candidate_data: Dict, job_data: Dict) -> float:
        """
        Enhanced keyword-based matching with improved business rules when semantic matching is unavailable.
        """
        try:
            # Get candidate skills and convert to lowercase
            candidate_skills = set()
            for skill in candidate_data.get('skills', []):
                if isinstance(skill, str):
                    candidate_skills.add(skill.lower().strip())

            # Separate job requirements into primary vs secondary using our enhanced method
            primary_reqs, secondary_reqs = self._separate_requirements(job_data.get('requirements', ''))

            # Weight job content by importance
            job_title = job_data.get('title', '').lower()
            primary_text = (job_title + ' ' + primary_reqs).lower()
            secondary_text = (job_data.get('description', '') + ' ' + secondary_reqs).lower()

            # Calculate weighted skill matches
            primary_matches = sum(1 for skill in candidate_skills if skill in primary_text)
            secondary_matches = sum(1 for skill in candidate_skills if skill in secondary_text)

            # Calculate base score with weighted importance
            if candidate_skills:
                # Primary skills worth more than secondary
                primary_score = (primary_matches / len(candidate_skills)) * 50  # Max 50 from primary
                secondary_score = (secondary_matches / len(candidate_skills)) * 20  # Max 20 from secondary
                base_score = primary_score + secondary_score
            else:
                base_score = 10  # Small base score for having any profile

            # Apply our enhanced business rules (includes technology penalties)
            adjusted_score = self._apply_business_rules(candidate_data, job_data, base_score)

            # Ensure score is within bounds
            final_score = max(0.0, min(100.0, round(adjusted_score, 2)))

            logger.info(f"Enhanced keyword matching: {candidate_data.get('current_position', 'Unknown')} -> {job_data.get('title', 'Unknown')}: {final_score}%")

            return final_score

        except Exception as e:
            logger.error(f"Error in enhanced keyword matching: {e}")
            return 0.0
    
    def find_best_matching_jobs(self, candidate_data: Dict, jobs: List[Dict], top_k: int = 5) -> List[Tuple[Dict, float]]:
        """
        Find the best matching jobs for a candidate.
        
        Args:
            candidate_data: Dictionary containing candidate information
            jobs: List of job dictionaries
            top_k: Number of top matches to return
        
        Returns:
            List of tuples (job_dict, match_score) sorted by match score descending
        """
        job_scores = []
        
        for job in jobs:
            try:
                score = self.calculate_job_match_score(candidate_data, job)
                job_scores.append((job, score))
            except Exception as e:
                logger.error(f"Error calculating score for job {job.get('id', 'unknown')}: {e}")
                job_scores.append((job, 0.0))
        
        # Sort by score descending and return top_k
        job_scores.sort(key=lambda x: x[1], reverse=True)
        return job_scores[:top_k]
    
    def find_matching_candidates(self, job_data: Dict, candidates: List[Dict], threshold: float = 50.0) -> List[Tuple[Dict, float]]:
        """
        Find candidates that match a job above a certain threshold.
        
        Args:
            job_data: Dictionary containing job information
            candidates: List of candidate dictionaries
            threshold: Minimum match score to include in results
        
        Returns:
            List of tuples (candidate_dict, match_score) sorted by match score descending
        """
        candidate_scores = []
        
        for candidate in candidates:
            try:
                score = self.calculate_job_match_score(candidate, job_data)
                if score >= threshold:
                    candidate_scores.append((candidate, score))
            except Exception as e:
                logger.error(f"Error calculating score for candidate {candidate.get('id', 'unknown')}: {e}")
        
        # Sort by score descending
        candidate_scores.sort(key=lambda x: x[1], reverse=True)
        return candidate_scores
    
    def batch_calculate_matches(self, candidates: List[Dict], jobs: List[Dict]) -> Dict[int, List[Tuple[int, float]]]:
        """
        Calculate match scores between all candidates and jobs in batch.
        
        Args:
            candidates: List of candidate dictionaries with 'id' field
            jobs: List of job dictionaries with 'id' field
        
        Returns:
            Dictionary mapping candidate_id to list of (job_id, score) tuples
        """
        results = {}
        
        for candidate in candidates:
            candidate_id = candidate.get('id')
            if not candidate_id:
                continue
            
            candidate_matches = []
            for job in jobs:
                job_id = job.get('id')
                if not job_id:
                    continue
                
                try:
                    score = self.calculate_job_match_score(candidate, job)
                    candidate_matches.append((job_id, score))
                except Exception as e:
                    logger.error(f"Error in batch calculation for candidate {candidate_id}, job {job_id}: {e}")
                    candidate_matches.append((job_id, 0.0))
            
            # Sort by score descending
            candidate_matches.sort(key=lambda x: x[1], reverse=True)
            results[candidate_id] = candidate_matches
        
        return results

    def clear_caches(self):
        """Clear all cached embeddings and similarity scores for testing."""
        try:
            # Clear Django cache with our prefixes
            from django.core.cache import cache
            cache.clear()  # This clears all cache, but ensures fresh results
            logger.info("Cleared all semantic matching caches")
        except Exception as e:
            logger.warning(f"Could not clear caches: {e}")


# Global instance to reuse the model across requests
_semantic_matcher_instance = None

def get_semantic_matcher() -> SemanticJobMatcher:
    """Get or create a global semantic matcher instance."""
    global _semantic_matcher_instance
    if _semantic_matcher_instance is None:
        _semantic_matcher_instance = SemanticJobMatcher()
    return _semantic_matcher_instance

def clear_semantic_matching_cache():
    """Clear semantic matching cache for testing."""
    matcher = get_semantic_matcher()
    matcher.clear_caches()
    matcher.clear_caches()
