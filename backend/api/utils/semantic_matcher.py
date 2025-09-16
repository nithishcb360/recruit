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
    
    def generate_embedding(self, text: str) -> Optional[np.ndarray]:
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
    
    def calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
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
def generate_text_embedding(text: str) -> Optional[np.ndarray]:
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