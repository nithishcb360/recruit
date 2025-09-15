'use client';

import { useState, useEffect } from 'react';
import { createJob, getDepartments, createDepartment, type JobCreateData, type Department, type Job, type DepartmentCreateData } from '@/lib/api/jobs';
import { searchLocations, type Location } from '@/lib/api/locations';
import { generateJobDescriptionWithAI } from '@/lib/api/claude';

interface FormData {
  jobTitle: string;
  department: string;
  experienceLevel: string;
  location: string;
  workType: string;
  minSalary: number;
  maxSalary: number;
  experienceRange: string;
  jobDescription: string;
  requirements: string;
  responsibilities: string;
}

interface JobPostingFormProps {
  onJobCreated?: () => void;
  onSuccess?: () => void;
  onClose?: () => void;
  isModal?: boolean;
  editingJob?: Job | null;
}

export default function JobPostingForm({ onJobCreated, onSuccess, onClose, isModal = false, editingJob = null }: JobPostingFormProps) {
  const [formData, setFormData] = useState<FormData>({
    jobTitle: '',
    department: '',
    experienceLevel: '',
    location: '',
    workType: '',
    minSalary: 80000,
    maxSalary: 120000,
    experienceRange: '',
    jobDescription: '',
    requirements: '',
    responsibilities: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [focusedField, setFocusedField] = useState<keyof FormData | ''>('');
  const [activeStep, setActiveStep] = useState(1);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newDepartmentDescription, setNewDepartmentDescription] = useState('');
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<Location[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState(false);

  const steps = [
    { number: 1, name: 'Job Details', active: activeStep === 1 },
    { number: 2, name: 'Job Description', active: activeStep === 2 }
  ];

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await getDepartments();
        setDepartments(response.results);
      } catch (error) {
        console.error('Failed to load departments:', error);
      }
    };
    loadDepartments();
  }, []);

  // Populate form when editing a job
  useEffect(() => {
    if (editingJob) {
      setFormData({
        jobTitle: editingJob.title || '',
        department: editingJob.department.id.toString() || '',
        experienceLevel: (editingJob as any).experience_level || '',
        location: (editingJob as any).location || '',
        workType: (editingJob as any).work_type || '',
        minSalary: (editingJob as any).salary_min || 80000,
        maxSalary: (editingJob as any).salary_max || 120000,
        experienceRange: '',
        jobDescription: editingJob.description || '',
        requirements: editingJob.requirements || '',
        responsibilities: editingJob.responsibilities || ''
      });
    }
  }, [editingJob]);

  const departmentOptions = [
    { value: '', label: 'Select department' },
    ...departments.map(dept => ({ value: dept.id.toString(), label: dept.name }))
  ];

  const experienceLevelOptions = [
    { value: '', label: 'Select level' },
    { value: 'entry', label: 'Entry Level' },
    { value: 'junior', label: 'Junior' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior' },
    { value: 'lead', label: 'Lead' },
    { value: 'principal', label: 'Principal' },
    { value: 'director', label: 'Director' },
    { value: 'vp', label: 'VP' }
  ];

  const workTypeOptions = [
    { value: '', label: 'Select work type' },
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'internship', label: 'Internship' },
    { value: 'temporary', label: 'Temporary' }
  ];

  const experienceRangeOptions = [
    { value: '', label: 'Select experience range' },
    { value: '0-1', label: '0-1 years' },
    { value: '1-3', label: '1-3 years' },
    { value: '3-5', label: '3-5 years' },
    { value: '5-8', label: '5-8 years' },
    { value: '8-12', label: '8-12 years' },
    { value: '12+', label: '12+ years' }
  ];

  const handleInputChange = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: false
      }));
    }

    // Handle location search
    if (field === 'location' && typeof value === 'string') {
      handleLocationSearch(value);
    }

    // Handle salary validation - only for number fields
    if (field === 'minSalary' && typeof value === 'number') {
      const numValue = value as number;
      if (numValue > formData.maxSalary) {
        setFormData(prev => ({
          ...prev,
          maxSalary: numValue
        }));
      }
    }
    if (field === 'maxSalary' && typeof value === 'number') {
      const numValue = value as number;
      if (numValue < formData.minSalary) {
        setFormData(prev => ({
          ...prev,
          minSalary: numValue
        }));
      }
    }
  };

  const handleLocationSearch = async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    setIsSearchingLocations(true);
    try {
      const suggestions = await searchLocations(query);
      setLocationSuggestions(suggestions);
      setShowLocationSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Error searching locations:', error);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    } finally {
      setIsSearchingLocations(false);
    }
  };

  const handleLocationSelect = (location: Location) => {
    setFormData(prev => ({
      ...prev,
      location: location.full_name || location.name
    }));
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
    // Clear the location input focus to ensure dropdown closes properly
    const locationInput = document.querySelector('input[placeholder*="search locations"]') as HTMLInputElement;
    if (locationInput) {
      locationInput.blur();
    }
  };

  const handleFieldFocus = (field: keyof FormData) => {
    setFocusedField(field);
  };

  const handleFieldBlur = (field: keyof FormData) => {
    setFocusedField('');
  };

  const validateForm = () => {
    const requiredFields: (keyof FormData)[] = ['jobTitle', 'department', 'experienceLevel', 'location', 'workType'];
    const errors: Record<string, boolean> = {};
    let isValid = true;

    requiredFields.forEach(field => {
      if (!formData[field] || !formData[field].toString().trim()) {
        errors[field] = true;
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  const handleNextStep = () => {
    if (activeStep === 1) {
      if (validateForm()) {
        setActiveStep(2);
      } else {
        alert('Please fill in all required fields.');
      }
    } else if (activeStep === 2) {
      handleSubmit();
    }
  };

  const handlePreviousStep = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.jobDescription.trim()) {
      alert('Please enter a job description.');
      return;
    }
    
    if (!formData.department) {
      alert('Please select a department.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const jobData: JobCreateData = {
        title: formData.jobTitle,
        department: parseInt(formData.department),
        description: formData.jobDescription,
        requirements: formData.requirements || '',
        responsibilities: formData.responsibilities || '',
        job_type: formData.workType.replace('-', '_'), // Convert 'full-time' to 'full_time'
        experience_level: formData.experienceLevel,
        location: formData.location,
        work_type: 'remote', // Default to remote, could be made configurable
        is_remote: formData.location.toLowerCase().includes('remote'),
        salary_min: formData.minSalary || undefined,
        salary_max: formData.maxSalary || undefined,
        salary_currency: 'USD',
        show_salary: formData.minSalary > 0 || formData.maxSalary > 0,
        required_skills: [], // Could be made configurable
        preferred_skills: [], // Could be made configurable
        urgency: 'medium',
        openings: 1,
        sla_days: 30,
        screening_questions: [],
        publish_internal: true,
        publish_external: false,
        publish_company_website: true,
      };

      if (editingJob) {
        // For now, we'll just simulate updating the job
        alert('Job updated successfully!');
        console.log('Updated job:', jobData);
      } else {
        const createdJob = await createJob(jobData);
        alert('Job created successfully!');
        console.log('Created job:', createdJob);
      }
      
      // Reset form
      setFormData({
        jobTitle: '',
        department: '',
        experienceLevel: '',
        location: '',
        workType: '',
        minSalary: 80000,
        maxSalary: 120000,
        experienceRange: '',
        jobDescription: '',
        requirements: '',
        responsibilities: ''
      });
      setActiveStep(1);
      
      // Trigger refresh of job list
      if (onJobCreated) {
        onJobCreated();
      }
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal if in modal mode
      if (isModal && onClose) {
        onClose();
      }
      
    } catch (error) {
      console.error('Error creating job:', error);
      alert('Error creating job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJDUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a .txt, .pdf, .doc, or .docx file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Please upload a file smaller than 5MB');
      return;
    }

    try {
      // For now, just read text files directly
      if (file.type === 'text/plain') {
        const text = await file.text();
        
        // Split the content into description and requirements
        const lines = text.split('\n');
        const descriptionEnd = lines.findIndex(line => 
          line.toLowerCase().includes('requirement') || 
          line.toLowerCase().includes('qualification') ||
          line.toLowerCase().includes('skill')
        );
        
        if (descriptionEnd > 0) {
          const description = lines.slice(0, descriptionEnd).join('\n').trim();
          const requirements = lines.slice(descriptionEnd).join('\n').trim();
          
          setFormData(prev => ({
            ...prev,
            jobDescription: description,
            requirements: requirements
          }));
        } else {
          // If can't split, put everything in description
          setFormData(prev => ({
            ...prev,
            jobDescription: text
          }));
        }
        
        alert('Job description uploaded successfully!');
      } else {
        // For PDF/Word files, show a message that parsing is not implemented
        alert('PDF and Word file parsing will be implemented soon. Please use .txt files for now.');
      }
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading file. Please try again.');
    }

    // Reset the input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleGenerateWithAI = async () => {
    // Validate required fields first
    if (!formData.jobTitle || !formData.department) {
      alert('Please fill in Job Title and Department first before generating with AI.');
      return;
    }

    if (!formData.experienceLevel) {
      alert('Please select an Experience Level before generating with AI.');
      return;
    }

    if (!formData.experienceRange) {
      alert('Please select an Experience Range before generating with AI.');
      return;
    }

    setIsGeneratingWithAI(true);

    try {
      const department = departments.find(d => d.id.toString() === formData.department)?.name || formData.department;
      
      const generatedContent = await generateJobDescriptionWithAI({
        jobTitle: formData.jobTitle,
        department: department,
        experienceLevel: formData.experienceLevel,
        experienceRange: formData.experienceRange,
        workType: formData.workType || undefined,
        location: formData.location || undefined
      });

      setFormData(prev => ({
        ...prev,
        jobDescription: generatedContent.description,
        requirements: generatedContent.requirements
      }));

      alert('Job description generated successfully with AI!');
    } catch (error) {
      console.error('Error generating with AI:', error);
      alert(`Error generating job description: ${error instanceof Error ? error.message : 'Please check your Claude AI API configuration and try again.'}`);
    } finally {
      setIsGeneratingWithAI(false);
    }
  };

  // Helper functions for dynamic content generation
  const extractRoleKeywords = (title: string) => {
    const keywords = [];
    if (title.includes('senior') || title.includes('sr')) keywords.push('senior-level');
    if (title.includes('lead') || title.includes('manager')) keywords.push('leadership');
    if (title.includes('developer') || title.includes('engineer')) keywords.push('technical');
    if (title.includes('analyst') || title.includes('data')) keywords.push('analytical');
    if (title.includes('designer') || title.includes('ui') || title.includes('ux')) keywords.push('creative');
    if (title.includes('marketing') || title.includes('sales')) keywords.push('growth-oriented');
    if (title.includes('product')) keywords.push('product-focused');
    return keywords;
  };

  const extractPrimaryFunction = (title: string) => {
    if (title.includes('developer') || title.includes('engineer')) return 'developing innovative software solutions';
    if (title.includes('designer')) return 'creating exceptional user experiences';
    if (title.includes('analyst')) return 'analyzing data and providing strategic insights';
    if (title.includes('manager') || title.includes('lead')) return 'leading high-performing teams';
    if (title.includes('marketing')) return 'driving marketing initiatives and brand growth';
    if (title.includes('sales')) return 'building client relationships and driving revenue';
    if (title.includes('product')) return 'defining product strategy and roadmaps';
    if (title.includes('consultant')) return 'providing strategic consulting services';
    if (title.includes('coordinator')) return 'coordinating projects and ensuring seamless execution';
    return 'delivering exceptional results in your area of expertise';
  };

  const extractFocusArea = (title: string) => {
    if (title.includes('frontend') || title.includes('ui')) return 'user interface development';
    if (title.includes('backend') || title.includes('api')) return 'backend systems and APIs';
    if (title.includes('fullstack') || title.includes('full stack')) return 'end-to-end application development';
    if (title.includes('data') || title.includes('analytics')) return 'data analysis and insights';
    if (title.includes('mobile')) return 'mobile application development';
    if (title.includes('cloud') || title.includes('devops')) return 'cloud infrastructure and deployment';
    if (title.includes('security')) return 'cybersecurity and risk management';
    if (title.includes('qa') || title.includes('test')) return 'quality assurance and testing';
    return 'core business objectives';
  };

  const generateSpecificSkills = (title: string) => {
    const skills = [];
    if (title.includes('react') || title.includes('frontend')) skills.push('React', 'JavaScript', 'TypeScript', 'HTML/CSS');
    if (title.includes('node') || title.includes('backend')) skills.push('Node.js', 'Express', 'API Development');
    if (title.includes('python')) skills.push('Python', 'Django/Flask', 'Data Analysis');
    if (title.includes('java')) skills.push('Java', 'Spring Framework', 'Microservices');
    if (title.includes('data') || title.includes('analyst')) skills.push('SQL', 'Excel', 'Tableau', 'Power BI');
    if (title.includes('aws') || title.includes('cloud')) skills.push('AWS', 'Docker', 'Kubernetes');
    if (title.includes('designer')) skills.push('Figma', 'Adobe Creative Suite', 'Prototyping');
    return skills;
  };

  const generateDynamicResponsibilities = (title: string, primaryFunction: string, focusArea: string) => {
    // Generate varied base responsibilities
    const baseResponsibilityPools = [
      [
        `Drive innovation in ${focusArea} through strategic planning and execution`,
        `Foster collaboration across departments to achieve shared objectives`,
        `Champion best practices and continuous improvement initiatives`,
        `Provide mentorship and guidance to team members at various levels`,
        `Contribute to long-term strategic planning and organizational growth`
      ],
      [
        `Lead transformative projects in ${focusArea} that enhance business value`,
        `Build strong partnerships with stakeholders to ensure project success`,
        `Stay ahead of industry trends and emerging technologies in your domain`,
        `Develop and implement innovative solutions to complex challenges`,
        `Support talent development and knowledge transfer within the organization`
      ],
      [
        `Execute high-impact initiatives in ${focusArea} with measurable outcomes`,
        `Collaborate with diverse teams to deliver exceptional results`,
        `Monitor industry developments and apply relevant insights to your work`,
        `Share expertise and best practices to elevate team performance`,
        `Participate in strategic decision-making processes and planning sessions`
      ]
    ];

    const selectedBasePool = baseResponsibilityPools[Math.floor(Math.random() * baseResponsibilityPools.length)];

    const roleSpecificResponsibilities = [];
    
    if (title.includes('developer') || title.includes('engineer')) {
      const techResponsibilities = [
        ['Architect and develop robust, scalable software solutions using modern technologies',
         'Implement comprehensive testing strategies to ensure code quality and reliability',
         'Optimize application performance through code refactoring and technical improvements',
         'Lead technical discussions and provide guidance on complex development challenges'],
        ['Design and build innovative software applications that meet business requirements',
         'Establish and maintain coding standards, documentation, and development workflows',
         'Troubleshoot and resolve technical issues with creative problem-solving approaches',
         'Collaborate with product teams to translate requirements into technical specifications'],
        ['Create efficient, maintainable code following industry best practices and standards',
         'Conduct thorough code reviews and provide constructive feedback to team members',
         'Research and evaluate new technologies to enhance development processes',
         'Contribute to system architecture decisions and technical roadmap planning']
      ];
      roleSpecificResponsibilities.push(...techResponsibilities[Math.floor(Math.random() * techResponsibilities.length)]);
    } else if (title.includes('analyst')) {
      const analystResponsibilities = [
        ['Transform complex datasets into actionable business intelligence and strategic insights',
         'Develop comprehensive analytical models and predictive algorithms',
         'Create compelling data visualizations and reports for executive leadership',
         'Identify trends, patterns, and opportunities that drive business growth'],
        ['Conduct in-depth analysis of business metrics and key performance indicators',
         'Design and implement data collection processes and analytical frameworks',
         'Present findings and recommendations to stakeholders through clear storytelling',
         'Collaborate with various departments to understand analytical needs and requirements'],
        ['Analyze market trends, customer behavior, and operational data to support decision-making',
         'Build automated reporting systems and interactive dashboards',
         'Validate data accuracy and implement quality assurance processes',
         'Translate complex analytical findings into practical business recommendations']
      ];
      roleSpecificResponsibilities.push(...analystResponsibilities[Math.floor(Math.random() * analystResponsibilities.length)]);
    } else if (title.includes('designer')) {
      const designResponsibilities = [
        ['Conceptualize and create exceptional user experiences that delight customers',
         'Conduct user research and usability testing to inform design decisions',
         'Develop comprehensive design systems and maintain visual brand consistency',
         'Collaborate closely with development teams to ensure seamless design implementation'],
        ['Design intuitive interfaces that balance user needs with business objectives',
         'Create prototypes and wireframes to communicate design concepts effectively',
         'Establish design guidelines and standards that enhance product consistency',
         'Lead design thinking workshops and facilitate creative problem-solving sessions'],
        ['Craft visually compelling designs that align with brand identity and user expectations',
         'Perform user journey mapping and interaction design optimization',
         'Maintain design documentation and asset libraries for team collaboration',
         'Stay current with design trends and emerging technologies in the UX/UI space']
      ];
      roleSpecificResponsibilities.push(...designResponsibilities[Math.floor(Math.random() * designResponsibilities.length)]);
    } else if (title.includes('manager') || title.includes('lead')) {
      const managementResponsibilities = [
        ['Build and lead high-performing teams through effective coaching and development',
         'Establish clear performance expectations and provide regular feedback',
         'Drive strategic initiatives from conception through successful completion',
         'Foster an inclusive, collaborative culture that promotes innovation and growth'],
        ['Manage team resources and workflows to optimize productivity and outcomes',
         'Develop talent through targeted training, mentoring, and career advancement opportunities',
         'Lead change management initiatives and guide teams through organizational transitions',
         'Communicate vision and strategy effectively to align team efforts with company goals'],
        ['Oversee project planning, execution, and delivery to ensure successful outcomes',
         'Create and maintain strong relationships with stakeholders and cross-functional partners',
         'Implement process improvements that enhance team efficiency and effectiveness',
         'Support individual team member growth through personalized development planning']
      ];
      roleSpecificResponsibilities.push(...managementResponsibilities[Math.floor(Math.random() * managementResponsibilities.length)]);
    } else {
      const genericResponsibilities = [
        ['Execute strategic initiatives that align with organizational objectives and values',
         'Implement process improvements that enhance operational efficiency and quality',
         'Build and maintain professional relationships with key stakeholders and partners',
         'Contribute specialized expertise to support organizational goals and success'],
        ['Drive excellence in your area of specialization through continuous improvement',
         'Develop and maintain strong working relationships across various departments',
         'Support organizational initiatives through dedicated expertise and collaboration',
         'Identify opportunities for innovation and implement solutions that add value'],
        ['Deliver exceptional results in your core area of responsibility',
         'Contribute to team success through expertise, collaboration, and professional growth',
         'Support business objectives through specialized knowledge and skill application',
         'Engage in professional development to stay current with industry best practices']
      ];
      roleSpecificResponsibilities.push(...genericResponsibilities[Math.floor(Math.random() * genericResponsibilities.length)]);
    }

    // Combine base and role-specific responsibilities
    const allResponsibilities = [...selectedBasePool, ...roleSpecificResponsibilities];
    
    // Shuffle and return a subset to ensure variety
    const shuffled = allResponsibilities.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 6 + Math.floor(Math.random() * 3)); // Return 6-8 responsibilities
  };

  const generateEducationRequirement = (title: string, dept: string) => {
    if (title.includes('senior') || title.includes('lead') || title.includes('manager')) {
      return '• Bachelor\'s degree in relevant field with 5+ years of experience, or Master\'s degree with 3+ years of experience';
    } else if (title.includes('engineer') || title.includes('developer')) {
      return '• Bachelor\'s degree in Computer Science, Engineering, or related technical field';
    } else if (title.includes('analyst') || title.includes('data')) {
      return '• Bachelor\'s degree in Analytics, Statistics, Mathematics, Economics, or related quantitative field';
    } else if (title.includes('designer')) {
      return '• Bachelor\'s degree in Design, Fine Arts, HCI, or related creative field';
    } else if (title.includes('marketing')) {
      return '• Bachelor\'s degree in Marketing, Communications, Business, or related field';
    }
    return '• Bachelor\'s degree in relevant field or equivalent professional experience';
  };

  const generateSpecificRequirements = (title: string, experienceRange: string) => {
    const requirements = [];
    const skills = generateSpecificSkills(title);
    
    // Varied experience descriptions
    const experienceDescriptions = [
      `${experienceRange} years of progressive experience in relevant field`,
      `Minimum ${experienceRange} years of professional experience with demonstrated success`,
      `${experienceRange}+ years of hands-on experience in similar roles`,
      `Strong background with ${experienceRange} years of industry experience`
    ];
    requirements.push(experienceDescriptions[Math.floor(Math.random() * experienceDescriptions.length)]);
    
    // Skills requirements with variety
    if (skills.length > 0) {
      const skillRequirements = [
        `Advanced proficiency in ${skills.slice(0, 3).join(', ')} and associated technologies`,
        `Strong technical expertise in ${skills.slice(0, 3).join(', ')} and related frameworks`,
        `Deep knowledge of ${skills.slice(0, 3).join(', ')} with practical application experience`,
        `Proven skills in ${skills.slice(0, 3).join(', ')} and modern development practices`
      ];
      requirements.push(skillRequirements[Math.floor(Math.random() * skillRequirements.length)]);
    }
    
    // Leadership requirements for senior roles
    if (title.includes('senior') || title.includes('lead')) {
      const leadershipReqs = [
        'Demonstrated ability to lead complex projects and guide technical decision-making',
        'Proven experience mentoring team members and fostering professional development',
        'Strong track record of successful project delivery and team leadership',
        'Experience in strategic planning and cross-functional collaboration'
      ];
      requirements.push(leadershipReqs[Math.floor(Math.random() * leadershipReqs.length)]);
      
      const strategicReqs = [
        'Exceptional analytical and problem-solving capabilities with strategic mindset',
        'Advanced critical thinking skills with ability to solve complex challenges',
        'Strong strategic thinking abilities and innovative problem-solving approach',
        'Excellent judgment and decision-making skills in high-pressure situations'
      ];
      requirements.push(strategicReqs[Math.floor(Math.random() * strategicReqs.length)]);
    }
    
    // Communication requirements with variety
    const communicationReqs = [
      'Outstanding written and verbal communication skills with stakeholders at all levels',
      'Exceptional interpersonal abilities and collaborative working style',
      'Strong communication skills with ability to present complex information clearly',
      'Excellent relationship-building skills and professional communication abilities'
    ];
    requirements.push(communicationReqs[Math.floor(Math.random() * communicationReqs.length)]);
    
    // Work environment requirements
    const environmentReqs = [
      'Thrives in dynamic, fast-paced environments with changing priorities',
      'Adaptable professional who excels in collaborative team settings',
      'Self-motivated individual comfortable with ambiguity and rapid change',
      'Results-driven professional with strong attention to detail and quality'
    ];
    requirements.push(environmentReqs[Math.floor(Math.random() * environmentReqs.length)]);
    
    // Remote work experience if applicable
    if (title.includes('remote') || title.includes('hybrid')) {
      const remoteReqs = [
        'Proven success working in distributed, remote team environments',
        'Experience with virtual collaboration tools and remote work best practices',
        'Self-directed work style with excellent time management in remote settings',
        'Strong digital communication skills and remote project management experience'
      ];
      requirements.push(remoteReqs[Math.floor(Math.random() * remoteReqs.length)]);
    }
    
    return requirements;
  };

  const generatePreferredQualifications = (title: string) => {
    const qualifications = [];
    
    // Advanced education for senior roles
    if (title.includes('senior') || title.includes('lead')) {
      const educationPrefs = [
        'Master\'s degree or higher in relevant field of study',
        'Advanced degree with specialized focus in your area of expertise',
        'Graduate-level education or equivalent advanced professional training',
        'Advanced degree with demonstrated academic excellence'
      ];
      qualifications.push(educationPrefs[Math.floor(Math.random() * educationPrefs.length)]);
      
      const certificationPrefs = [
        'Professional certifications and industry-recognized credentials',
        'Relevant industry certifications and continuing education achievements',
        'Professional development credentials and specialized training certificates',
        'Industry-specific certifications demonstrating expertise and commitment'
      ];
      qualifications.push(certificationPrefs[Math.floor(Math.random() * certificationPrefs.length)]);
    }
    
    // Technical roles preferences
    if (title.includes('engineer') || title.includes('developer')) {
      const methodologyPrefs = [
        'Extensive experience with Agile, Scrum, or other modern development methodologies',
        'Proven track record working in Agile environments with cross-functional teams',
        'Strong background in iterative development processes and best practices',
        'Experience leading or participating in Agile transformation initiatives'
      ];
      qualifications.push(methodologyPrefs[Math.floor(Math.random() * methodologyPrefs.length)]);
      
      const portfolioPrefs = [
        'Active contributions to open source projects and technical community involvement',
        'Portfolio of personal projects demonstrating technical creativity and innovation',
        'GitHub presence showcasing code quality and collaborative development skills',
        'Technical blog, speaking engagements, or other thought leadership activities'
      ];
      qualifications.push(portfolioPrefs[Math.floor(Math.random() * portfolioPrefs.length)]);
    }
    
    // Cloud-specific preferences
    if (title.includes('cloud') || title.includes('aws') || title.includes('devops')) {
      const cloudPrefs = [
        'Cloud platform certifications (AWS Solutions Architect, Azure Expert, GCP Professional)',
        'Advanced cloud infrastructure credentials and hands-on platform experience',
        'Multi-cloud expertise with relevant professional certifications',
        'Specialized cloud certifications demonstrating deep technical knowledge'
      ];
      qualifications.push(cloudPrefs[Math.floor(Math.random() * cloudPrefs.length)]);
    }
    
    // Industry experience
    const industryPrefs = [
      'Background in similar industry verticals with relevant domain knowledge',
      'Experience in comparable business environments and market segments',
      'Understanding of industry-specific challenges and regulatory requirements',
      'Previous work in organizations with similar scale, complexity, or business model'
    ];
    qualifications.push(industryPrefs[Math.floor(Math.random() * industryPrefs.length)]);
    
    // Analytical thinking
    const analyticalPrefs = [
      'Exceptional analytical mindset with data-driven decision-making approach',
      'Advanced critical thinking skills and systematic problem-solving abilities',
      'Strong quantitative analysis skills with attention to detail and accuracy',
      'Proven ability to synthesize complex information and identify key insights'
    ];
    qualifications.push(analyticalPrefs[Math.floor(Math.random() * analyticalPrefs.length)]);
    
    // Growth mindset
    const growthPrefs = [
      'Demonstrated commitment to lifelong learning and professional development',
      'Passion for staying current with emerging trends and technological advances',
      'Growth mindset with enthusiasm for acquiring new skills and knowledge',
      'Proactive approach to professional growth and skill enhancement'
    ];
    qualifications.push(growthPrefs[Math.floor(Math.random() * growthPrefs.length)]);
    
    return qualifications;
  };

  const generateUniqueCompanyIntros = (jobTitle: string, department: string, roleKeywords: string[]) => {
    const introStyles = [
      `Are you passionate about ${extractPassionArea(jobTitle)}? We're seeking a ${jobTitle} to join our ${department} team and drive innovation.`,
      `Our ${department} team is expanding! We need a dedicated ${jobTitle} who thrives in ${extractWorkEnvironment(roleKeywords)} environments.`,
      `Transform your career with us! We're looking for a ${jobTitle} who can ${extractKeyAction(jobTitle)} and make a real difference in our ${department} department.`,
      `Ready to tackle exciting challenges? Join our ${department} team as a ${jobTitle} and shape the future of ${extractIndustryFocus(department)}.`,
      `We believe in ${extractCompanyValue(roleKeywords)}. That's why we're seeking a ${jobTitle} to bring fresh perspectives to our ${department} team.`,
      `Excellence drives everything we do. We're recruiting a ${jobTitle} for our ${department} team who shares our commitment to ${extractQualityFocus(jobTitle)}.`
    ];
    
    return introStyles;
  };

  const generateUniqueRoleContexts = (workType: string, location: string, primaryFunction: string, experienceLevel: string) => {
    const contexts = [
      `This ${workType} role in ${location} is perfect for ${experienceLevel} professionals who want to ${primaryFunction} while enjoying work-life balance.`,
      `Based in ${location}, this ${workType} opportunity offers the flexibility to work on ${generateProjectType()} projects with cutting-edge technology.`,
      `Located in ${location}, you'll have the chance to ${primaryFunction} in a collaborative ${workType} setting with industry experts.`,
      `This ${workType} position in ${location} provides the perfect platform to advance your career in ${extractCareerPath(experienceLevel)}.`,
      `Working ${workType} from ${location}, you'll be part of a team that values ${generateTeamValue()} and professional growth.`,
      `Our ${location}-based ${workType} role offers unique opportunities to ${primaryFunction} while contributing to meaningful projects.`
    ];
    
    return contexts;
  };

  const generateUniqueValuePropositions = (jobTitle: string, department: string, focusArea: string) => {
    const valueProps = [
      `As our ${jobTitle}, you'll spearhead initiatives in ${focusArea} that directly impact our business success and customer satisfaction.`,
      `In this role, you'll leverage your expertise in ${focusArea} to solve complex challenges and drive innovation within our ${department} team.`,
      `You'll be at the forefront of ${focusArea}, collaborating with diverse teams to deliver solutions that exceed expectations.`,
      `This position offers the opportunity to master ${focusArea} while mentoring others and contributing to strategic decision-making.`,
      `Join us to revolutionize how we approach ${focusArea} and establish yourself as a thought leader in the ${department} space.`,
      `Your expertise in ${focusArea} will be instrumental in achieving our ambitious goals and delivering exceptional results.`
    ];
    
    return valueProps;
  };

  const generateUniqueClosingStatements = (jobTitle: string, primaryFunction: string) => {
    const closings = [
      `Ready to take your career to the next level? Apply now and become the ${jobTitle} who helps shape our future success.`,
      `If you're excited about ${primaryFunction} and making a meaningful impact, we'd love to hear from you!`,
      `Join our mission to excel in everything we do. Your journey as our next ${jobTitle} starts here.`,
      `We're committed to your professional growth and success. Apply today to begin your adventure with us!`,
      `Looking for a role where your skills in ${primaryFunction} truly matter? This is your opportunity to shine.`,
      `Be part of something extraordinary. Apply now and help us redefine what's possible in our industry.`
    ];
    
    return closings;
  };

  const extractPassionArea = (jobTitle: string) => {
    if (jobTitle.toLowerCase().includes('developer') || jobTitle.toLowerCase().includes('engineer')) return 'creating innovative software solutions';
    if (jobTitle.toLowerCase().includes('designer')) return 'crafting beautiful user experiences';
    if (jobTitle.toLowerCase().includes('analyst')) return 'uncovering insights from data';
    if (jobTitle.toLowerCase().includes('manager')) return 'leading high-performing teams';
    if (jobTitle.toLowerCase().includes('marketing')) return 'building compelling brand experiences';
    if (jobTitle.toLowerCase().includes('sales')) return 'driving revenue growth';
    return 'delivering exceptional results';
  };

  const extractWorkEnvironment = (roleKeywords: string[]) => {
    if (roleKeywords.includes('senior-level')) return 'fast-paced, senior-level';
    if (roleKeywords.includes('leadership')) return 'collaborative, leadership-focused';
    if (roleKeywords.includes('technical')) return 'innovative, technical';
    if (roleKeywords.includes('creative')) return 'dynamic, creative';
    return 'collaborative, growth-oriented';
  };

  const extractKeyAction = (jobTitle: string) => {
    if (jobTitle.toLowerCase().includes('developer')) return 'build scalable applications';
    if (jobTitle.toLowerCase().includes('designer')) return 'create intuitive designs';
    if (jobTitle.toLowerCase().includes('analyst')) return 'analyze complex data';
    if (jobTitle.toLowerCase().includes('manager')) return 'lead successful projects';
    if (jobTitle.toLowerCase().includes('consultant')) return 'provide strategic guidance';
    return 'drive impactful initiatives';
  };

  const extractIndustryFocus = (department: string) => {
    if (department.toLowerCase().includes('engineering')) return 'software development';
    if (department.toLowerCase().includes('design')) return 'user experience';
    if (department.toLowerCase().includes('marketing')) return 'digital marketing';
    if (department.toLowerCase().includes('sales')) return 'customer success';
    if (department.toLowerCase().includes('operations')) return 'operational excellence';
    return 'business innovation';
  };

  const extractCompanyValue = (roleKeywords: string[]) => {
    if (roleKeywords.includes('technical')) return 'technical excellence and innovation';
    if (roleKeywords.includes('creative')) return 'creativity and design thinking';
    if (roleKeywords.includes('leadership')) return 'strong leadership and collaboration';
    if (roleKeywords.includes('analytical')) return 'data-driven decision making';
    return 'continuous improvement and growth';
  };

  const extractQualityFocus = (jobTitle: string) => {
    if (jobTitle.toLowerCase().includes('developer')) return 'code quality and best practices';
    if (jobTitle.toLowerCase().includes('designer')) return 'design excellence and user satisfaction';
    if (jobTitle.toLowerCase().includes('analyst')) return 'data accuracy and insights';
    if (jobTitle.toLowerCase().includes('manager')) return 'team performance and results';
    return 'exceptional service delivery';
  };

  const generateProjectType = () => {
    const projectTypes = ['high-impact', 'strategic', 'innovative', 'cross-functional', 'transformative', 'customer-focused'];
    return projectTypes[Math.floor(Math.random() * projectTypes.length)];
  };

  const extractCareerPath = (experienceLevel: string) => {
    if (experienceLevel.toLowerCase().includes('senior')) return 'senior-level expertise and leadership';
    if (experienceLevel.toLowerCase().includes('mid')) return 'professional growth and skill development';
    if (experienceLevel.toLowerCase().includes('junior') || experienceLevel.toLowerCase().includes('entry')) return 'career foundation and learning';
    return 'professional development and expertise building';
  };

  const generateTeamValue = () => {
    const teamValues = ['innovation', 'collaboration', 'excellence', 'diversity', 'continuous learning', 'mutual respect'];
    return teamValues[Math.floor(Math.random() * teamValues.length)];
  };

  const generateIndustryTerms = (department: string, title: string) => {
    const industryTerms = {
      'technology': ['digital transformation', 'scalable solutions', 'agile methodologies', 'cloud-first approach', 'microservices architecture'],
      'finance': ['regulatory compliance', 'risk management', 'financial modeling', 'market analysis', 'portfolio optimization'],
      'healthcare': ['patient outcomes', 'healthcare innovation', 'regulatory standards', 'clinical excellence', 'care coordination'],
      'education': ['learning outcomes', 'curriculum development', 'educational technology', 'student engagement', 'academic excellence'],
      'retail': ['customer experience', 'omnichannel solutions', 'inventory optimization', 'brand loyalty', 'market positioning'],
      'manufacturing': ['operational efficiency', 'quality assurance', 'supply chain optimization', 'lean manufacturing', 'process improvement'],
      'marketing': ['brand awareness', 'customer acquisition', 'digital campaigns', 'market penetration', 'engagement strategies'],
      'sales': ['revenue generation', 'client relationship management', 'sales optimization', 'territory expansion', 'deal closure']
    };
    
    const deptLower = department.toLowerCase();
    for (const [key, terms] of Object.entries(industryTerms)) {
      if (deptLower.includes(key)) {
        return terms[Math.floor(Math.random() * terms.length)];
      }
    }
    return 'business excellence';
  };

  const generateCompanySize = (variationIndex: number) => {
    const sizes = [
      'fast-growing startup',
      'established mid-market company',
      'industry-leading enterprise',
      'innovative scale-up',
      'dynamic growth-stage company',
      'well-funded technology company',
      'market-leading organization',
      'forward-thinking enterprise',
      'agile technology firm',
      'established industry player'
    ];
    return sizes[variationIndex % sizes.length];
  };

  const generateTeamStructure = (variationIndex: number) => {
    const structures = [
      'cross-functional team environment',
      'collaborative, flat organizational structure',
      'diverse, multicultural team setting',
      'high-performing, results-driven team',
      'innovative, creative team culture',
      'autonomous, empowered team structure',
      'inclusive, supportive team environment',
      'dynamic, fast-paced team setting',
      'strategic, goal-oriented team culture',
      'flexible, adaptive team framework'
    ];
    return structures[variationIndex % structures.length];
  };

  const generateGrowthStage = (variationIndex: number) => {
    const stages = [
      'rapid expansion phase',
      'strategic growth initiative',
      'market expansion effort',
      'innovation-driven growth',
      'scaling operations globally',
      'entering new market segments',
      'digital transformation journey',
      'product portfolio expansion',
      'customer base diversification',
      'international market penetration'
    ];
    return stages[variationIndex % stages.length];
  };

  const generateToneVariation = (variationIndex: number) => {
    const tones = [
      { style: 'professional', descriptor: 'We maintain the highest standards of' },
      { style: 'innovative', descriptor: 'We\'re pioneering breakthrough approaches to' },
      { style: 'collaborative', descriptor: 'We believe in the power of teamwork to achieve' },
      { style: 'dynamic', descriptor: 'We thrive in fast-paced environments focused on' },
      { style: 'supportive', descriptor: 'We foster an environment where everyone can contribute to' },
      { style: 'results-driven', descriptor: 'We\'re committed to delivering exceptional outcomes in' },
      { style: 'forward-thinking', descriptor: 'We anticipate future trends and prepare for' },
      { style: 'inclusive', descriptor: 'We celebrate diverse perspectives that enhance' },
      { style: 'agile', descriptor: 'We adapt quickly to changing needs while maintaining' },
      { style: 'customer-centric', descriptor: 'We put our customers at the heart of everything we do in' }
    ];
    return tones[variationIndex % tones.length];
  };

  const generateCultureEmphasis = (variationIndex: number) => {
    const cultures = [
      'work-life balance and professional development',
      'continuous learning and skill advancement',
      'innovation and creative problem-solving',
      'collaboration and knowledge sharing',
      'diversity, equity, and inclusion',
      'sustainability and social responsibility',
      'customer success and satisfaction',
      'operational excellence and quality',
      'transparency and open communication',
      'entrepreneurial spirit and ownership mindset'
    ];
    return cultures[variationIndex % cultures.length];
  };

  const generateRoleSpecificContent = (jobTitle: string, department: string, experienceLevel: string, workType: string, location: string, experienceRange: string) => {
    const title = jobTitle.toLowerCase();
    const dept = department.toLowerCase();
    
    // Enhanced randomization system - create multiple sources of uniqueness
    const timestamp = Date.now();
    const randomSeed1 = Math.random() * 10000;
    const randomSeed2 = Math.random() * 10000;
    const hashSeed = Math.abs(jobTitle.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0));
    const combinedSeed = Math.floor((timestamp + randomSeed1 + randomSeed2 + hashSeed) % 1000);
    
    // DevOps Engineer with variations
    if (title.includes('devops') || title.includes('sre') || title.includes('site reliability')) {
      const devopsIntros = [
        `We are seeking a skilled ${jobTitle} to join our ${department} team. This ${workType} position is based in ${location}.`,
        `Join our dynamic ${department} team as a ${jobTitle}! This ${workType} role in ${location} offers exciting challenges.`,
        `Our ${department} team is looking for an experienced ${jobTitle} to drive innovation. This ${workType} position is located in ${location}.`,
        `Are you passionate about DevOps excellence? We're hiring a ${jobTitle} for our ${department} team. This ${workType} role is based in ${location}.`
      ];
      
      const devopsDescriptions = [
        `As a ${jobTitle}, you will be responsible for bridging the gap between development and operations teams, ensuring smooth deployment and operation of our software systems. You'll work with cutting-edge technologies to build and maintain scalable, reliable infrastructure.`,
        `In this role, you'll architect and maintain robust CI/CD pipelines while optimizing our cloud infrastructure for maximum performance and reliability. You'll be at the forefront of modern DevOps practices.`,
        `You'll lead the transformation of our development and deployment processes, implementing best practices in automation, monitoring, and infrastructure management. Your expertise will drive our technical excellence.`,
        `As our ${jobTitle}, you'll design resilient systems and automate complex workflows. You'll work closely with development teams to ensure seamless software delivery and operational excellence.`
      ];
      
      const selectedIntro = devopsIntros[combinedSeed % devopsIntros.length];
      const selectedDesc = devopsDescriptions[Math.floor((combinedSeed + randomSeed1) % devopsDescriptions.length)];
      
      return {
        description: `${selectedIntro}

${selectedDesc}

Key Responsibilities:
• Design, implement, and maintain CI/CD pipelines using tools like Jenkins, GitLab CI, or GitHub Actions
• Manage cloud infrastructure on AWS, Azure, or GCP using Infrastructure as Code (Terraform, CloudFormation)
• Monitor system performance and reliability using tools like Prometheus, Grafana, ELK stack, or Datadog
• Automate deployment processes and infrastructure provisioning
• Implement security best practices across development and deployment workflows
• Troubleshoot production issues and implement preventive measures
• Collaborate with development teams to optimize application performance and scalability
• Manage containerized applications using Docker and Kubernetes
• Implement backup and disaster recovery strategies`,

        requirements: `Required Qualifications:
• Bachelor's degree in Computer Science, Engineering, or related field
• ${experienceRange} of hands-on DevOps/SRE experience
• Strong experience with Linux/Unix systems administration
• Proficiency with cloud platforms (AWS, Azure, or GCP)
• Experience with containerization technologies (Docker, Kubernetes)
• Solid understanding of CI/CD concepts and tools
• Experience with Infrastructure as Code (Terraform, Ansible, CloudFormation)
• Knowledge of monitoring and logging tools (Prometheus, Grafana, ELK stack)
• Scripting skills in Python, Bash, or PowerShell
• Understanding of networking concepts and security best practices

Preferred Qualifications:
• Relevant certifications (AWS Certified DevOps Engineer, Kubernetes CKA/CKAD)
• Experience with microservices architecture
• Knowledge of database administration (MySQL, PostgreSQL, MongoDB)
• Experience with service mesh technologies (Istio, Consul Connect)
• Understanding of DevSecOps practices`
      };
    }

    // Software Engineer/Developer with variations
    if (title.includes('software') || title.includes('developer') || title.includes('engineer')) {
      const engineerIntros = [
        `We are seeking a talented ${jobTitle} to join our ${department} team. This ${workType} position is based in ${location}.`,
        `Join our innovative ${department} team as a ${jobTitle}! We're looking for someone passionate about building great software. This ${workType} role is in ${location}.`,
        `Are you ready to make an impact? Our ${department} team needs a skilled ${jobTitle} to help build the future. This ${workType} position is located in ${location}.`,
        `Calling all talented developers! We're expanding our ${department} team and need a ${jobTitle} to join our mission. This ${workType} role is based in ${location}.`
      ];
      
      const engineerDescriptions = [
        `As a ${jobTitle}, you will be responsible for designing, developing, and maintaining high-quality software solutions. You'll work in a collaborative environment using modern development practices and cutting-edge technologies.`,
        `In this role, you'll architect scalable applications and write clean, efficient code that makes a difference. You'll collaborate with cross-functional teams to deliver exceptional user experiences.`,
        `You'll be at the heart of our product development, crafting robust solutions that serve thousands of users. Your code will be the foundation of innovative features that drive our business forward.`,
        `As our ${jobTitle}, you'll solve complex technical challenges while mentoring team members and contributing to our engineering culture of excellence and continuous improvement.`
      ];
      
      const selectedIntro = engineerIntros[combinedSeed % engineerIntros.length];
      const selectedDesc = engineerDescriptions[Math.floor((combinedSeed + randomSeed1) % engineerDescriptions.length)];
      
      return {
        description: `${selectedIntro}

${selectedDesc}

Key Responsibilities:
• Design and develop scalable software applications using modern programming languages
• Write clean, maintainable, and well-documented code following best practices
• Participate in code reviews and provide constructive feedback to team members
• Collaborate with product managers and designers to translate requirements into technical solutions
• Implement automated testing strategies including unit, integration, and end-to-end tests
• Debug and optimize existing applications for performance and scalability
• Stay current with emerging technologies and industry trends
• Contribute to architectural decisions and technical documentation
• Mentor junior developers and share knowledge across the team`,

        requirements: `Required Qualifications:
• Bachelor's degree in Computer Science, Software Engineering, or related field
• ${experienceRange} of professional software development experience
• Proficiency in modern programming languages (JavaScript/TypeScript, Python, Java, C#, or Go)
• Experience with web development frameworks (React, Angular, Vue.js, Node.js, Django, Spring)
• Strong understanding of database design and SQL
• Experience with version control systems (Git)
• Knowledge of software development methodologies (Agile, Scrum)
• Understanding of RESTful API design and integration
• Experience with testing frameworks and methodologies

Preferred Qualifications:
• Experience with cloud platforms (AWS, Azure, GCP)
• Knowledge of DevOps practices and CI/CD pipelines
• Experience with microservices architecture
• Understanding of container technologies (Docker, Kubernetes)
• Experience with NoSQL databases (MongoDB, Redis)
• Knowledge of security best practices in software development`
      };
    }

    // Enhanced dynamic content generation for all other roles
    const roleKeywords = extractRoleKeywords(title);
    const primaryFunction = extractPrimaryFunction(title);
    const focusArea = extractFocusArea(title);
    const specificSkills = generateSpecificSkills(title);
    
    // Create multiple variation pools for true randomness
    const companyIntroVariations = [
      `We are seeking an exceptional ${jobTitle} to join our growing ${department} team. This ${workType} role is based in ${location} and offers incredible growth opportunities.`,
      `Join our dynamic ${department} team as a ${jobTitle}! This ${workType} position in ${location} is perfect for someone who wants to make a real impact.`,
      `Are you passionate about ${extractPassionArea(jobTitle)}? We're looking for a ${jobTitle} to join our innovative ${department} team. This ${workType} role is located in ${location}.`,
      `Our ${department} team is expanding, and we need a talented ${jobTitle} to help drive our mission forward. This ${workType} position is based in ${location}.`,
      `Ready for your next challenge? Join us as a ${jobTitle} in our ${department} team. This ${workType} opportunity in ${location} offers unlimited potential.`,
      `We believe in the power of great talent. That's why we're seeking a ${jobTitle} for our ${department} team. This ${workType} role is based in ${location}.`,
      `Transform your career with us! We're hiring a ${jobTitle} to join our ${department} team. This ${workType} position in ${location} offers exciting challenges.`,
      `Innovation starts with the right people. We're looking for a ${jobTitle} to join our ${department} team. This ${workType} role is located in ${location}.`,
    ];
    
    const roleDescriptionVariations = [
      `As our ${jobTitle}, you will ${primaryFunction} while contributing to strategic initiatives that drive business growth. You'll work in a collaborative environment with cutting-edge tools and technologies.`,
      `In this role, you'll ${primaryFunction} and play a key part in shaping the future of our ${department}. You'll have the opportunity to work on challenging projects with significant impact.`,
      `You'll be responsible for ${primaryFunction} while building strong relationships across our organization. This position offers the perfect blend of technical challenges and professional growth.`,
      `As a ${jobTitle}, you'll ${primaryFunction} and drive innovation in ${focusArea}. You'll work with a team of experts who are passionate about excellence and continuous improvement.`,
      `This role involves ${primaryFunction} while contributing to our company's mission of delivering exceptional results. You'll be part of a team that values creativity, collaboration, and professional development.`,
      `You'll ${primaryFunction} while working on projects that make a real difference. This position offers the opportunity to grow your skills while contributing to meaningful work.`,
      `As our ${jobTitle}, you'll be at the forefront of ${primaryFunction} and help establish new standards of excellence in our industry. You'll work with state-of-the-art tools and methodologies.`,
      `In this position, you'll ${primaryFunction} while collaborating with talented professionals who share your commitment to quality and innovation. You'll have access to ongoing learning opportunities.`
    ];
    
    const responsibilityPools = [
      [
        `Lead strategic initiatives in ${focusArea} that drive measurable business impact`,
        `Collaborate with cross-functional teams to deliver exceptional results and exceed expectations`,
        `Develop innovative solutions to complex challenges using industry best practices`,
        `Mentor team members and contribute to knowledge sharing across the organization`,
        `Stay current with industry trends and emerging technologies in your field`,
        `Participate in strategic planning and contribute to long-term organizational goals`,
        `Build and maintain strong relationships with key stakeholders and partners`
      ],
      [
        `Drive excellence in ${focusArea} through continuous improvement and innovation`,
        `Work closely with stakeholders to understand requirements and deliver solutions that exceed expectations`,
        `Implement best practices and establish new standards of quality in your area of expertise`,
        `Provide guidance and support to team members while fostering a collaborative environment`,
        `Research and evaluate new technologies and methodologies to enhance team capabilities`,
        `Contribute to project planning and execution while ensuring timely delivery of objectives`,
        `Communicate effectively with diverse audiences to ensure alignment and understanding`
      ],
      [
        `Execute high-impact projects in ${focusArea} that contribute to organizational success`,
        `Foster collaboration and teamwork while maintaining focus on quality and efficiency`,
        `Analyze complex problems and develop creative solutions that address business needs`,
        `Share expertise and best practices to elevate overall team performance`,
        `Monitor industry developments and apply relevant insights to improve processes`,
        `Support organizational initiatives through dedicated expertise and professional commitment`,
        `Maintain high standards of professional conduct while contributing to a positive work culture`
      ],
      [
        `Champion innovation in ${focusArea} while ensuring adherence to quality standards`,
        `Build consensus among stakeholders and facilitate effective decision-making processes`,
        `Optimize workflows and processes to improve efficiency and outcomes`,
        `Develop and maintain documentation that supports team knowledge and continuity`,
        `Identify opportunities for improvement and implement solutions that add value`,
        `Engage in professional development activities to enhance skills and expertise`,
        `Support organizational culture through active participation and positive contribution`
      ]
    ];
    
    // Use multiple randomization sources
    const introIndex = Math.floor((combinedSeed + timestamp) % companyIntroVariations.length);
    const descIndex = Math.floor((combinedSeed + randomSeed1 + randomSeed2) % roleDescriptionVariations.length);
    const respPoolIndex = Math.floor((combinedSeed + hashSeed) % responsibilityPools.length);
    
    const selectedIntro = companyIntroVariations[introIndex];
    const selectedDesc = roleDescriptionVariations[descIndex];
    const selectedResponsibilities = responsibilityPools[respPoolIndex];
    
    // Shuffle responsibilities for more variety
    const shuffledResponsibilities = selectedResponsibilities
      .map(resp => ({ resp, sort: Math.random() + combinedSeed / 1000 }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ resp }) => resp)
      .slice(0, 5 + (combinedSeed % 3)); // 5-7 responsibilities
    
    const educationReq = generateEducationRequirement(title, department);
    const specificReqs = generateSpecificRequirements(title, experienceRange);
    const preferredQuals = generatePreferredQualifications(title);

    return {
      description: `${selectedIntro}

${selectedDesc}

Key Responsibilities:
${shuffledResponsibilities.map(resp => `• ${resp}`).join('\n')}

What We Offer:
• Competitive compensation and comprehensive benefits package
• Professional development opportunities and career advancement
• Flexible work environment that promotes work-life balance
• Collaborative culture with talented professionals
• Access to cutting-edge tools and technologies
• Opportunity to make a meaningful impact in your field`,

      requirements: `Required Qualifications:
${educationReq}
${specificReqs.map(req => `• ${req}`).join('\n')}

Preferred Qualifications:
${preferredQuals.map(qual => `• ${qual}`).join('\n')}`
    };
  };

  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim()) {
      alert('Please enter a department name.');
      return;
    }

    setIsCreatingDepartment(true);
    
    try {
      const departmentData: DepartmentCreateData = {
        name: newDepartmentName.trim(),
        description: newDepartmentDescription.trim() || undefined
      };

      const newDepartment = await createDepartment(departmentData);
      
      // Add the new department to the list
      setDepartments(prev => [...prev, newDepartment]);
      
      // Select the new department
      setFormData(prev => ({
        ...prev,
        department: newDepartment.id.toString()
      }));
      
      // Reset form and close dialog
      setNewDepartmentName('');
      setNewDepartmentDescription('');
      setShowAddDepartment(false);
      
      alert(`Department "${newDepartment.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating department:', error);
      alert('Error creating department. Please try again.');
    } finally {
      setIsCreatingDepartment(false);
    }
  };

  const getInputClasses = (field: keyof FormData) => {
    const baseClasses = "w-full px-4 py-3 border-2 rounded-lg text-base transition-all duration-200 bg-white";
    
    if (validationErrors[field]) {
      return `${baseClasses} border-red-500 focus:border-red-500 focus:ring-red-100`;
    } else if (focusedField === field) {
      return `${baseClasses} border-blue-500 focus:border-blue-500 focus:ring-blue-100`;
    } else if (formData[field] && formData[field].toString().trim()) {
      return `${baseClasses} border-green-500 focus:border-blue-500 focus:ring-blue-100`;
    }
    
    return `${baseClasses} border-gray-300 focus:border-blue-500 focus:ring-blue-100`;
  };

  return (
    <div className={isModal ? "" : "max-w-6xl mx-auto px-4 py-8 md:px-8"}>
        {/* Header */}
        {!isModal && (
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3">
              Create New Job Posting
            </h1>
            <p className="text-lg text-slate-600">
              Define the details, description, screening questions, and publishing options for your new job.
            </p>
          </div>
        )}

        {/* Progress Steps */}
        <div className={`flex justify-center ${isModal ? "mb-8" : "mb-12"}`}>
          <div className="flex items-center space-x-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center space-x-2 ${
                  step.active ? 'text-blue-600' : 'text-slate-400'
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step.active 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {step.number}
                  </div>
                  <span className={`font-medium ${step.active ? 'font-semibold' : ''}`}>
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-8 h-px bg-slate-200 ml-4"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Section */}
        <div className={isModal ? "" : "bg-white rounded-xl shadow-sm p-8"}>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {activeStep === 1 ? 'Job Details' : 'Job Description'}
            </h2>
            <p className="text-slate-600">
              {activeStep === 1 
                ? 'Enter the basic information for your job posting.'
                : 'Provide detailed job description and requirements.'
              }
            </p>
          </div>

          {activeStep === 1 && (
          <div className="space-y-8">
            {/* Job Title - Full Width */}
            <div className="grid grid-cols-1">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  onFocus={() => handleFieldFocus('jobTitle')}
                  onBlur={() => handleFieldBlur('jobTitle')}
                  className={getInputClasses('jobTitle')}
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>
            </div>

            {/* Department and Experience Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Department
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddDepartment(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add New
                  </button>
                </div>
                <select
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  onFocus={() => handleFieldFocus('department')}
                  onBlur={() => handleFieldBlur('department')}
                  className={`${getInputClasses('department')} cursor-pointer appearance-none bg-no-repeat bg-right pr-10`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1.5em 1.5em'
                  }}
                >
                  {departmentOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Experience Level
                </label>
                <select
                  value={formData.experienceLevel}
                  onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
                  onFocus={() => handleFieldFocus('experienceLevel')}
                  onBlur={() => handleFieldBlur('experienceLevel')}
                  className={`${getInputClasses('experienceLevel')} cursor-pointer appearance-none bg-no-repeat bg-right pr-10`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1.5em 1.5em'
                  }}
                >
                  {experienceLevelOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location and Work Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    onFocus={() => handleFieldFocus('location')}
                    onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)}
                    className={getInputClasses('location')}
                    placeholder="Type 3+ letters to search locations..."
                    autoComplete="off"
                  />
                  {isSearchingLocations && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
                
                {/* Location Suggestions Dropdown */}
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div 
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    onMouseDown={(e) => e.preventDefault()} // Prevent input blur when clicking dropdown
                  >
                    {locationSuggestions.map((location) => (
                      <div
                        key={location.id}
                        onClick={() => handleLocationSelect(location)}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{location.name}</div>
                        {location.state && location.country && (
                          <div className="text-sm text-gray-600">
                            {location.state}, {location.country}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Work Type
                </label>
                <select
                  value={formData.workType}
                  onChange={(e) => handleInputChange('workType', e.target.value)}
                  onFocus={() => handleFieldFocus('workType')}
                  onBlur={() => handleFieldBlur('workType')}
                  className={`${getInputClasses('workType')} cursor-pointer appearance-none bg-no-repeat bg-right pr-10`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1.5em 1.5em'
                  }}
                >
                  {workTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Salary Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Min Salary
                </label>
                <input
                  type="number"
                  value={formData.minSalary}
                  onChange={(e) => handleInputChange('minSalary', parseInt(e.target.value) || 0)}
                  onFocus={() => handleFieldFocus('minSalary')}
                  onBlur={() => handleFieldBlur('minSalary')}
                  className={getInputClasses('minSalary')}
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max Salary
                </label>
                <input
                  type="number"
                  value={formData.maxSalary}
                  onChange={(e) => handleInputChange('maxSalary', parseInt(e.target.value) || 0)}
                  onFocus={() => handleFieldFocus('maxSalary')}
                  onBlur={() => handleFieldBlur('maxSalary')}
                  className={getInputClasses('maxSalary')}
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            {/* Experience Range */}
            <div className="grid grid-cols-1">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Experience Range
                </label>
                <select
                  value={formData.experienceRange}
                  onChange={(e) => handleInputChange('experienceRange', e.target.value)}
                  onFocus={() => handleFieldFocus('experienceRange')}
                  onBlur={() => handleFieldBlur('experienceRange')}
                  className={`${getInputClasses('experienceRange')} cursor-pointer appearance-none bg-no-repeat bg-right pr-10`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1.5em 1.5em'
                  }}
                >
                  {experienceRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Next Button */}
            <div className="flex justify-start pt-4">
              <button
                onClick={handleNextStep}
                className="bg-gray-800 hover:bg-gray-900 text-white font-semibold px-8 py-3.5 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-gray-300"
              >
                Next: Job Description
              </button>
            </div>
          </div>
          )}

          {activeStep === 2 && (
          <div className="space-y-8">
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <label htmlFor="jd-upload" className="flex-1">
                <input
                  id="jd-upload"
                  type="file"
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={handleJDUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('jd-upload')?.click()}
                  className="w-full bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload JD
                </button>
              </label>
              
              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isGeneratingWithAI}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-400 disabled:to-blue-400 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isGeneratingWithAI ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate with AI
                  </>
                )}
              </button>
            </div>

            {/* Job Description */}
            <div className="grid grid-cols-1">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Job Description
                </label>
                <textarea
                  value={formData.jobDescription}
                  onChange={(e) => handleInputChange('jobDescription', e.target.value)}
                  onFocus={() => handleFieldFocus('jobDescription')}
                  onBlur={() => handleFieldBlur('jobDescription')}
                  className={getInputClasses('jobDescription')}
                  rows={8}
                  placeholder="Describe the role, responsibilities, and what the candidate will be doing..."
                />
              </div>
            </div>

            {/* Requirements */}
            <div className="grid grid-cols-1">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Requirements
                </label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) => handleInputChange('requirements', e.target.value)}
                  onFocus={() => handleFieldFocus('requirements')}
                  onBlur={() => handleFieldBlur('requirements')}
                  className={getInputClasses('requirements')}
                  rows={6}
                  placeholder="List the required skills, qualifications, and experience..."
                />
              </div>
            </div>

            {/* Responsibilities */}
            <div className="grid grid-cols-1">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Responsibilities
                </label>
                <textarea
                  value={formData.responsibilities}
                  onChange={(e) => handleInputChange('responsibilities', e.target.value)}
                  onFocus={() => handleFieldFocus('responsibilities')}
                  onBlur={() => handleFieldBlur('responsibilities')}
                  className={getInputClasses('responsibilities')}
                  rows={6}
                  placeholder="Describe the key responsibilities and duties for this role..."
                />
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <button
                onClick={handlePreviousStep}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-8 py-3.5 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-gray-300"
              >
                Previous: Job Details
              </button>
              <button
                onClick={handleNextStep}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-8 py-3.5 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting 
                  ? (editingJob ? 'Updating Job...' : 'Creating Job...') 
                  : (editingJob ? 'Update Job' : 'Create Job')
                }
              </button>
            </div>
          </div>
          )}
        </div>

        {/* Add Department Modal */}
        {showAddDepartment && (
          <div className="fixed inset-0 z-50">
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowAddDepartment(false)} />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">Add New Department</h3>
                  <p className="text-sm text-gray-600 mt-1">Create a new department for your organization</p>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Department Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newDepartmentName}
                      onChange={(e) => setNewDepartmentName(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200"
                      placeholder="e.g., Data Science"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={newDepartmentDescription}
                      onChange={(e) => setNewDepartmentDescription(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200"
                      rows={3}
                      placeholder="Brief description of the department"
                    />
                  </div>
                </div>
                
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    onClick={() => setShowAddDepartment(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                    disabled={isCreatingDepartment}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateDepartment}
                    disabled={isCreatingDepartment || !newDepartmentName.trim()}
                    className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
                  >
                    {isCreatingDepartment ? 'Creating...' : 'Create Department'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}