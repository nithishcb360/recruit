"""
AI Service for generating job descriptions using OpenAI API
"""
from openai import OpenAI
from django.conf import settings
from decouple import config
import logging

logger = logging.getLogger(__name__)

class AIJobDescriptionGenerator:
    """Service class for generating job descriptions using OpenAI GPT"""
    
    def __init__(self):
        api_key = config('OPENAI_API_KEY', default='')
        if api_key:
            try:
                # Initialize OpenAI client with just the API key
                self.client = OpenAI(api_key=api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI client: {str(e)}")
                self.client = None
        else:
            self.client = None
        self.model = "gpt-3.5-turbo"
        
    def generate_job_description(self, title, department, level, location, work_type, company_info=None):
        """
        Generate a comprehensive job description using OpenAI
        
        Args:
            title (str): Job title
            department (str): Department name
            level (str): Experience level (entry, mid, senior, lead, executive)
            location (str): Job location
            work_type (str): Work type (remote, onsite, hybrid)
            company_info (str, optional): Additional company information
            
        Returns:
            dict: Generated job description with sections
        """
        
        if not self.client or not getattr(self.client, 'api_key', None):
            logger.warning("OpenAI API key not configured, falling back to template generation")
            return self._fallback_generation(title, department, level, location, work_type)
        
        try:
            # Create the prompt
            prompt = self._create_prompt(title, department, level, location, work_type, company_info)
            
            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert HR professional and technical recruiter with 15+ years of experience creating compelling job descriptions. You write clear, engaging, and comprehensive job descriptions that attract top talent."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                temperature=0.7
            )
            
            # Parse the response
            content = response.choices[0].message.content
            return self._parse_ai_response(content)
            
        except Exception as e:
            logger.error(f"Error generating job description with AI: {str(e)}")
            # Fallback to template generation
            return self._fallback_generation(title, department, level, location, work_type)
    
    def _create_prompt(self, title, department, level, location, work_type, company_info):
        """Create a detailed prompt for the AI"""
        
        level_descriptions = {
            'entry': 'entry-level (0-2 years experience)',
            'mid': 'mid-level (3-5 years experience)', 
            'senior': 'senior-level (5-8 years experience)',
            'lead': 'lead/principal level (8+ years experience)',
            'executive': 'executive level (10+ years experience)'
        }
        
        level_desc = level_descriptions.get(level, 'mid-level')
        company_context = f"\n\nCompany Information: {company_info}" if company_info else ""
        
        prompt = f"""
Create a comprehensive job description for the following position:

Job Title: {title}
Department: {department}
Experience Level: {level_desc}
Location: {location}
Work Type: {work_type}
{company_context}

Please structure the job description in the following format and sections:

**DESCRIPTION:**
Write a compelling 2-3 paragraph overview that:
- Describes the role and its importance
- Mentions the work environment and location
- Highlights growth opportunities
- Creates excitement about the position

**RESPONSIBILITIES:**
List 7-10 key responsibilities that are:
- Specific to the experience level
- Relevant to the department/function
- Action-oriented and clear
- Progressively complex based on seniority

**REQUIREMENTS:**
List the required qualifications including:
- Years of experience needed
- Technical skills and competencies
- Educational requirements
- Soft skills and attributes
- Tools and technologies
- Any certifications if relevant

Make the job description:
- Professional yet engaging
- Specific to the role and level
- Free of bias and inclusive
- Realistic and achievable
- Appealing to top candidates

Format the response with clear section headers exactly as shown above.
        """
        
        return prompt.strip()
    
    def _parse_ai_response(self, content):
        """Parse the AI response into structured sections"""
        
        sections = {
            'description': '',
            'responsibilities': '',
            'requirements': ''
        }
        
        # Split content by section headers
        content = content.strip()
        current_section = None
        current_content = []
        
        for line in content.split('\n'):
            line = line.strip()
            
            # Check for section headers
            if line.upper().startswith('**DESCRIPTION:'):
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = 'description'
                current_content = []
            elif line.upper().startswith('**RESPONSIBILITIES:'):
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = 'responsibilities'
                current_content = []
            elif line.upper().startswith('**REQUIREMENTS:'):
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = 'requirements'
                current_content = []
            else:
                # Add content to current section
                if current_section and line:
                    current_content.append(line)
        
        # Add the last section
        if current_section and current_content:
            sections[current_section] = '\n'.join(current_content).strip()
        
        # If parsing failed, try to extract content more liberally
        if not any(sections.values()):
            # Fallback: use the entire content as description
            sections['description'] = content
            
        return sections
    
    def _fallback_generation(self, title, department, level, location, work_type):
        """Fallback to template-based generation when AI is not available"""
        
        # Experience level mappings
        experience_mapping = {
            'entry': {'years': '0-2', 'description': 'entry-level', 'complexity': 'basic'},
            'mid': {'years': '3-5', 'description': 'mid-level', 'complexity': 'intermediate'},
            'senior': {'years': '5-8', 'description': 'senior-level', 'complexity': 'advanced'},
            'lead': {'years': '8+', 'description': 'lead/principal', 'complexity': 'leadership'},
            'executive': {'years': '10+', 'description': 'executive', 'complexity': 'strategic'}
        }
        
        exp_data = experience_mapping.get(level, experience_mapping['mid'])
        
        # Department-specific content
        dept_templates = {
            'engineering': {
                'skills': ['software development', 'programming', 'system design', 'code review'],
                'tools': ['Git', 'CI/CD', 'cloud platforms', 'testing frameworks'],
                'focus': 'technical excellence and scalable solutions'
            },
            'design': {
                'skills': ['UI/UX design', 'user research', 'prototyping', 'design systems'],
                'tools': ['Figma', 'Sketch', 'Adobe Creative Suite', 'prototyping tools'],
                'focus': 'exceptional user experiences'
            },
            'marketing': {
                'skills': ['digital marketing', 'content strategy', 'campaign management', 'analytics'],
                'tools': ['Google Analytics', 'marketing automation', 'social media platforms'],
                'focus': 'brand growth and customer engagement'
            },
            'sales': {
                'skills': ['relationship building', 'negotiation', 'pipeline management', 'client communication'],
                'tools': ['CRM systems', 'sales automation tools', 'communication platforms'],
                'focus': 'revenue generation and client success'
            },
            'hr': {
                'skills': ['talent acquisition', 'employee relations', 'performance management', 'policy development'],
                'tools': ['HRIS systems', 'applicant tracking systems', 'performance tools'],
                'focus': 'people development and organizational culture'
            }
        }
        
        dept_key = department.lower() if department.lower() in dept_templates else 'engineering'
        dept_data = dept_templates[dept_key]
        
        # Generate sections
        description = f"""We are seeking a talented {exp_data['description']} {title} to join our {department or 'dynamic'} team. In this role, you will drive {dept_data['focus']} while working in a {work_type} environment from {location}.

This position offers excellent growth opportunities and the chance to make a meaningful impact in a collaborative, innovative environment. You'll work alongside experienced professionals and contribute to cutting-edge projects that shape our industry.

Join us to advance your career while building solutions that matter."""

        # Generate responsibilities
        base_responsibilities = [
            f"Drive {dept_data['skills'][0]} initiatives and best practices",
            f"Collaborate with cross-functional teams on {dept_data['skills'][1]} projects",
            f"Contribute to {dept_data['skills'][2]} strategy and implementation",
            f"Ensure quality standards and delivery excellence",
            f"Participate in team meetings and planning sessions",
            f"Stay current with industry trends and technologies"
        ]
        
        if exp_data['complexity'] in ['advanced', 'leadership', 'strategic']:
            base_responsibilities.extend([
                "Mentor and guide junior team members",
                "Lead complex projects from conception to delivery",
                "Drive process improvements and optimization"
            ])
        
        if exp_data['complexity'] in ['leadership', 'strategic']:
            base_responsibilities.extend([
                "Define strategic direction and roadmaps",
                "Collaborate with leadership on organizational initiatives"
            ])
        
        responsibilities = "Key Responsibilities:\n" + "\n".join([f"• {resp}" for resp in base_responsibilities])

        # Generate requirements
        base_requirements = [
            f"{exp_data['years']} years of experience in {dept_data['skills'][0]}",
            f"Strong expertise in {dept_data['skills'][1]} and {dept_data['skills'][2]}",
            f"Proficiency with {dept_data['tools'][0]} and {dept_data['tools'][1]}",
            "Excellent communication and collaboration skills",
            "Strong problem-solving and analytical abilities",
            "Bachelor's degree in relevant field or equivalent experience"
        ]
        
        if level in ['senior', 'lead', 'executive']:
            base_requirements.extend([
                "Proven track record of successful project delivery",
                f"Experience with {dept_data['tools'][2]} and related technologies",
                "Leadership and team management experience"
            ])
        
        requirements = "Required Qualifications:\n" + "\n".join([f"• {req}" for req in base_requirements])
        
        return {
            'description': description,
            'responsibilities': responsibilities,
            'requirements': requirements
        }


# Initialize the service
ai_generator = AIJobDescriptionGenerator()