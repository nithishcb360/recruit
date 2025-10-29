"""
Job-Candidate Matching System using Sentence Transformers
Uses all-MiniLM-L6-v2 model for semantic similarity matching
"""

import numpy as np
import logging
import os
from typing import List, Dict, Tuple

logger = logging.getLogger(__name__)

class JobCandidateMatcher:
    """
    A semantic matching system that uses sentence transformers to match
    job descriptions with candidate profiles based on semantic similarity.
    """

    def __init__(self, model_name: str = 'sentence-transformers/all-MiniLM-L6-v2'):
        """
        Initialize the matcher with the specified sentence transformer model.

        Args:
            model_name: Name of the sentence transformer model to use
        """
        self.model_name = model_name
        self.model = None
        self._load_model()

    def _load_model(self):
        """Load the sentence transformer model"""
        try:
            logger.info(f"Loading sentence transformer model: {self.model_name}")
            # Import here to avoid import issues during Django startup
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(self.model_name)
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model {self.model_name}: {str(e)}")
            raise

    def create_job_text(self, job_data: Dict) -> str:
        """
        Create a comprehensive text representation of a job for embedding.

        Args:
            job_data: Dictionary containing job information

        Returns:
            Combined text representation of the job
        """
        text_parts = []

        # Job title and department
        if job_data.get('title'):
            text_parts.append(f"Job Title: {job_data['title']}")

        if job_data.get('department') and isinstance(job_data['department'], dict):
            text_parts.append(f"Department: {job_data['department'].get('name', '')}")
        elif job_data.get('department'):
            text_parts.append(f"Department: {job_data['department']}")

        # Job description
        if job_data.get('description'):
            text_parts.append(f"Description: {job_data['description']}")

        # Requirements
        if job_data.get('requirements'):
            text_parts.append(f"Requirements: {job_data['requirements']}")

        # Responsibilities
        if job_data.get('responsibilities'):
            text_parts.append(f"Responsibilities: {job_data['responsibilities']}")

        # Skills
        if job_data.get('required_skills'):
            skills = job_data['required_skills']
            if isinstance(skills, list):
                skills_text = ', '.join(skills)
            else:
                skills_text = str(skills)
            text_parts.append(f"Required Skills: {skills_text}")

        if job_data.get('preferred_skills'):
            skills = job_data['preferred_skills']
            if isinstance(skills, list):
                skills_text = ', '.join(skills)
            else:
                skills_text = str(skills)
            text_parts.append(f"Preferred Skills: {skills_text}")

        # Experience and job details
        if job_data.get('experience_level'):
            text_parts.append(f"Experience Level: {job_data['experience_level']}")

        if job_data.get('job_type'):
            text_parts.append(f"Job Type: {job_data['job_type']}")

        if job_data.get('location'):
            text_parts.append(f"Location: {job_data['location']}")

        if job_data.get('work_type'):
            text_parts.append(f"Work Type: {job_data['work_type']}")

        return ' | '.join(text_parts)

    def create_candidate_text(self, candidate_data: Dict) -> str:
        """
        Create a comprehensive text representation of a candidate for embedding.

        Args:
            candidate_data: Dictionary containing candidate information

        Returns:
            Combined text representation of the candidate
        """
        text_parts = []

        # Basic info
        name_parts = []
        if candidate_data.get('first_name'):
            name_parts.append(candidate_data['first_name'])
        if candidate_data.get('last_name'):
            name_parts.append(candidate_data['last_name'])
        if name_parts:
            text_parts.append(f"Name: {' '.join(name_parts)}")

        # Current position and company
        if candidate_data.get('current_position'):
            text_parts.append(f"Current Position: {candidate_data['current_position']}")

        if candidate_data.get('current_company'):
            text_parts.append(f"Current Company: {candidate_data['current_company']}")

        # Experience
        if candidate_data.get('experience_years'):
            text_parts.append(f"Experience: {candidate_data['experience_years']} years")

        if candidate_data.get('experience_level'):
            text_parts.append(f"Experience Level: {candidate_data['experience_level']}")

        # Skills
        if candidate_data.get('skills'):
            skills = candidate_data['skills']
            if isinstance(skills, list):
                skills_text = ', '.join(skills)
            elif isinstance(skills, str):
                skills_text = skills
            else:
                skills_text = str(skills)
            text_parts.append(f"Skills: {skills_text}")

        # Education
        if candidate_data.get('education'):
            education = candidate_data['education']
            if isinstance(education, list):
                education_text = ', '.join(education)
            elif isinstance(education, str):
                education_text = education
            else:
                education_text = str(education)
            text_parts.append(f"Education: {education_text}")

        # Certifications
        if candidate_data.get('certifications'):
            certifications = candidate_data['certifications']
            if isinstance(certifications, list):
                cert_text = ', '.join(certifications)
            elif isinstance(certifications, str):
                cert_text = certifications
            else:
                cert_text = str(certifications)
            text_parts.append(f"Certifications: {cert_text}")

        # Location
        if candidate_data.get('location'):
            text_parts.append(f"Location: {candidate_data['location']}")

        # Resume text (if available and not too long)
        if candidate_data.get('resume_text'):
            resume_text = candidate_data['resume_text']
            if len(resume_text) > 1000:  # Truncate very long resume text
                resume_text = resume_text[:1000] + "..."
            text_parts.append(f"Resume: {resume_text}")

        return ' | '.join(text_parts)

    def get_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for a list of texts.

        Args:
            texts: List of text strings to embed

        Returns:
            Numpy array of embeddings
        """
        if not self.model:
            raise ValueError("Model not loaded")

        if not texts:
            return np.array([])

        try:
            embeddings = self.model.encode(texts, convert_to_numpy=True)
            return embeddings
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            raise

    def calculate_similarity(self, job_embedding: np.ndarray, candidate_embeddings: np.ndarray) -> np.ndarray:
        """
        Calculate cosine similarity between job and candidate embeddings.

        Args:
            job_embedding: Single job embedding
            candidate_embeddings: Array of candidate embeddings

        Returns:
            Array of similarity scores (0-1 range)
        """
        # Import here to avoid import issues during Django startup
        from sklearn.metrics.pairwise import cosine_similarity
        import random

        if job_embedding.ndim == 1:
            job_embedding = job_embedding.reshape(1, -1)

        if candidate_embeddings.ndim == 1:
            candidate_embeddings = candidate_embeddings.reshape(1, -1)

        similarities = cosine_similarity(job_embedding, candidate_embeddings)[0]

        # Convert from [-1, 1] to [0, 1] range
        normalized_similarities = (similarities + 1) / 2

        # Add small random variation to prevent identical scores
        # This ensures each candidate gets a unique score even if they're very similar
        for i in range(len(normalized_similarities)):
            # Add ±0.5% random variation
            variation = (random.random() - 0.5) * 0.01
            normalized_similarities[i] += variation
            # Ensure we stay within bounds
            normalized_similarities[i] = max(0.0, min(1.0, normalized_similarities[i]))

        return normalized_similarities

    def calculate_enhanced_score(self, base_score: float, job_data: Dict, candidate_data: Dict, candidate_index: int) -> float:
        """
        Calculate enhanced score by considering multiple factors beyond semantic similarity.

        Args:
            base_score: Base semantic similarity score (0-1)
            job_data: Job requirements
            candidate_data: Candidate information
            candidate_index: Index for consistent randomization

        Returns:
            Enhanced score (0-1)
        """
        import random

        # Set seed based on candidate index for consistency
        random.seed(hash(str(candidate_data.get('id', candidate_index))) % 2147483647)

        score_adjustments = []

        # 1. Experience level matching
        job_exp_level = job_data.get('experience_level', '').lower()
        candidate_exp_level = candidate_data.get('experience_level', '').lower()

        if job_exp_level and candidate_exp_level:
            exp_levels = {'entry': 1, 'junior': 2, 'mid': 3, 'senior': 4, 'lead': 5, 'principal': 6}
            job_level = exp_levels.get(job_exp_level, 3)
            candidate_level = exp_levels.get(candidate_exp_level, 3)

            # Calculate experience match (closer levels = better score)
            level_diff = abs(job_level - candidate_level)
            exp_bonus = max(0, (5 - level_diff) / 5 * 0.1)  # Up to 10% bonus
            score_adjustments.append(exp_bonus)

        # 2. Skills overlap bonus
        job_skills = set()
        if job_data.get('required_skills'):
            if isinstance(job_data['required_skills'], list):
                job_skills.update([s.lower().strip() for s in job_data['required_skills']])

        candidate_skills = set()
        if candidate_data.get('skills'):
            if isinstance(candidate_data['skills'], list):
                candidate_skills.update([s.lower().strip() for s in candidate_data['skills']])

        if job_skills and candidate_skills:
            overlap = len(job_skills.intersection(candidate_skills))
            total_job_skills = len(job_skills)
            if total_job_skills > 0:
                skill_match_ratio = overlap / total_job_skills
                skill_bonus = skill_match_ratio * 0.15  # Up to 15% bonus
                score_adjustments.append(skill_bonus)

        # 3. Experience years consideration
        candidate_exp_years = candidate_data.get('experience_years')
        if candidate_exp_years and isinstance(candidate_exp_years, (int, float)):
            # Moderate experience gets slight bonus
            if 2 <= candidate_exp_years <= 8:
                exp_years_bonus = 0.05  # 5% bonus for reasonable experience
                score_adjustments.append(exp_years_bonus)
            elif candidate_exp_years > 10:
                exp_years_bonus = 0.03  # 3% bonus for senior experience
                score_adjustments.append(exp_years_bonus)

        # 4. Location preference (if available)
        job_location = job_data.get('location', '').lower()
        candidate_location = candidate_data.get('location', '').lower()

        if job_location and candidate_location:
            if 'remote' in job_location or 'remote' in candidate_location:
                location_bonus = 0.02  # 2% bonus for remote flexibility
                score_adjustments.append(location_bonus)
            elif job_location in candidate_location or candidate_location in job_location:
                location_bonus = 0.05  # 5% bonus for location match
                score_adjustments.append(location_bonus)

        # 5. Add unique identifier-based variation to ensure uniqueness
        # Use candidate ID or index to generate consistent but unique variations
        unique_variation = (hash(str(candidate_data.get('id', candidate_index))) % 100) / 10000  # 0-0.01 range
        score_adjustments.append(unique_variation)

        # 6. Random factor for final uniqueness (small but ensures no ties)
        random_factor = random.uniform(-0.005, 0.005)  # ±0.5% variation
        score_adjustments.append(random_factor)

        # Apply all adjustments
        final_score = base_score + sum(score_adjustments)

        # Ensure score stays within bounds
        return max(0.0, min(1.0, final_score))

    def match_job_with_candidates(self, job_data: Dict, candidates_data: List[Dict]) -> List[Dict]:
        """
        Match a single job with multiple candidates and return similarity scores.

        Args:
            job_data: Dictionary containing job information
            candidates_data: List of dictionaries containing candidate information

        Returns:
            List of dictionaries with candidate info and match scores
        """
        if not candidates_data:
            return []

        try:
            # Create text representations
            job_text = self.create_job_text(job_data)
            candidate_texts = [self.create_candidate_text(candidate) for candidate in candidates_data]

            # Generate embeddings
            all_texts = [job_text] + candidate_texts
            embeddings = self.get_embeddings(all_texts)

            job_embedding = embeddings[0]
            candidate_embeddings = embeddings[1:]

            # Calculate base similarities
            similarities = self.calculate_similarity(job_embedding, candidate_embeddings)

            # Combine with candidate data and apply enhanced scoring
            results = []
            for i, candidate in enumerate(candidates_data):
                base_score = float(similarities[i])

                # Apply enhanced scoring for better differentiation
                enhanced_score = self.calculate_enhanced_score(base_score, job_data, candidate, i)
                match_score = enhanced_score * 100  # Convert to percentage

                result = {
                    'candidate': candidate,
                    'match_score': round(match_score, 2),
                    'match_percentage': f"{round(match_score, 1)}%"
                }
                results.append(result)

            # Sort by match score (highest first)
            results.sort(key=lambda x: x['match_score'], reverse=True)

            logger.info(f"Matched job '{job_data.get('title', 'Unknown')}' with {len(candidates_data)} candidates")
            return results

        except Exception as e:
            logger.error(f"Error in job-candidate matching: {str(e)}")
            raise

    def match_candidate_with_jobs(self, candidate_data: Dict, jobs_data: List[Dict]) -> List[Dict]:
        """
        Match a single candidate with multiple jobs and return similarity scores.

        Args:
            candidate_data: Dictionary containing candidate information
            jobs_data: List of dictionaries containing job information

        Returns:
            List of dictionaries with job info and match scores
        """
        if not jobs_data:
            return []

        try:
            # Create text representations
            candidate_text = self.create_candidate_text(candidate_data)
            job_texts = [self.create_job_text(job) for job in jobs_data]

            # Generate embeddings
            all_texts = [candidate_text] + job_texts
            embeddings = self.get_embeddings(all_texts)

            candidate_embedding = embeddings[0]
            job_embeddings = embeddings[1:]

            # Calculate similarities (swap the order for candidate-to-jobs matching)
            similarities = self.calculate_similarity(candidate_embedding, job_embeddings)

            # Combine with job data and apply enhanced scoring
            results = []
            for i, job in enumerate(jobs_data):
                base_score = float(similarities[i])

                # Apply enhanced scoring for better differentiation
                enhanced_score = self.calculate_enhanced_score(base_score, job, candidate_data, i)
                match_score = enhanced_score * 100  # Convert to percentage

                result = {
                    'job': job,
                    'match_score': round(match_score, 2),
                    'match_percentage': f"{round(match_score, 1)}%"
                }
                results.append(result)

            # Sort by match score (highest first)
            results.sort(key=lambda x: x['match_score'], reverse=True)

            candidate_name = f"{candidate_data.get('first_name', '')} {candidate_data.get('last_name', '')}".strip()
            logger.info(f"Matched candidate '{candidate_name}' with {len(jobs_data)} jobs")
            return results

        except Exception as e:
            logger.error(f"Error in candidate-job matching: {str(e)}")
            raise


# Global matcher instance
_matcher_instance = None

def get_matcher() -> JobCandidateMatcher:
    """
    Get or create a global matcher instance (singleton pattern).

    Returns:
        JobCandidateMatcher instance
    """
    global _matcher_instance
    if _matcher_instance is None:
        try:
            _matcher_instance = JobCandidateMatcher()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to initialize matcher: {str(e)}")
            raise
    return _matcher_instance


def match_job_candidates(job_data: Dict, candidates_data: List[Dict]) -> List[Dict]:
    """
    Convenience function to match a job with candidates.

    Args:
        job_data: Job information
        candidates_data: List of candidate information

    Returns:
        List of candidates with match scores
    """
    try:
        matcher = get_matcher()
        return matcher.match_job_with_candidates(job_data, candidates_data)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in match_job_candidates: {str(e)}")
        # Return empty results instead of crashing
        return []


def match_candidate_jobs(candidate_data: Dict, jobs_data: List[Dict]) -> List[Dict]:
    """
    Convenience function to match a candidate with jobs.

    Args:
        candidate_data: Candidate information
        jobs_data: List of job information

    Returns:
        List of jobs with match scores
    """
    try:
        matcher = get_matcher()
        return matcher.match_candidate_with_jobs(candidate_data, jobs_data)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in match_candidate_jobs: {str(e)}")
        # Return empty results instead of crashing
        return []