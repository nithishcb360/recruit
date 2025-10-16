"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { 
  Building2, Users, Bell, Shield, Palette, FileText, Plus, Trash, Save, 
  Settings, Lock, Unlock, Eye, EyeOff, Key, Globe, Mail, Phone,
  AlertTriangle, CheckCircle, Clock, Upload, Download, Copy,
  Database, Server, Activity, BarChart3, UserPlus, UserX,
  Crown, Star, Zap, Loader2, Video, Calendar, User2, PhoneCall,
  Monitor, MessageSquare, ArrowRight, ArrowDown, GripVertical,
  Edit3, ChevronUp, ChevronDown
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Enhanced interfaces for enterprise features
interface Role {
  id: string
  name: string
  description: string
  level: 'admin' | 'manager' | 'user' | 'viewer'
  permissions: Permission[]
  userCount: number
  isCustom: boolean
}

interface Permission {
  id: string
  name: string
  category: 'users' | 'candidates' | 'jobs' | 'interviews' | 'reports' | 'settings' | 'billing'
  description: string
  level: 'read' | 'write' | 'admin'
}

interface SSOSettings {
  domain?: string
  clientId?: string
  clientSecret?: string
  [key: string]: string | number | boolean | undefined
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  type: string
}

interface OrganizationSettings {
  general: {
    name: string
    domain: string
    industry: string
    size: string
    website: string
    address: string
    contactEmail: string
    phone: string
    timezone: string
    locale: string
    aiProvider: string
    aiApiKey: string
    emailUser: string
    emailPassword: string
    emailHost: string
    emailPort: string
  }
  ai: {
    selectedImplementation: string
    implementations: {
      [key: string]: {
        name: string
        prompt: string
      }
    }
  }
  security: {
    mfaRequired: boolean
    ssoEnabled: boolean
    ssoProvider: string
    ssoSettings: SSOSettings
    passwordPolicy: {
      minLength: number
      requireUppercase: boolean
      requireNumbers: boolean
      requireSymbols: boolean
      maxAge: number
    }
    sessionTimeout: number
    ipWhitelist: string[]
    auditLogging: boolean
  }
  features: {
    aiMatching: boolean
    videoInterviews: boolean
    customBranding: boolean
    apiAccess: boolean
    dataExport: boolean
    advancedReporting: boolean
    webhooks: boolean
    slackIntegration: boolean
  }
  notifications: {
    email: boolean
    inApp: boolean
    slack: boolean
    webhooks: boolean
    slackWebhook: string
    emailTemplates: EmailTemplate[]
  }
  branding: {
    logo: string
    primaryColor: string
    secondaryColor: string
    accentColor: string
    customCss: string
    favicon: string
  }
  integrations: {
    slack: boolean
    gsuite: boolean
    office365: boolean
    ats: boolean
    hris: boolean
    background_check: boolean
  }
}

interface ComplianceSettings {
  gdprCompliant: boolean
  ccpaCompliant: boolean
  dataRetentionDays: number
  dataProcessingAgreement: boolean
  privacyPolicyUrl: string
  termsOfServiceUrl: string
  cookieConsent: boolean
}

interface InterviewRound {
  id: string
  name: string
  type: 'telephonic' | 'video' | 'technical' | 'hr' | 'panel' | 'assignment' | 'onsite' | 'cultural'
  description: string
  duration: number // in minutes
  isRequired: boolean
  order: number
  interviewers: string[]
  skills: string[]
  passingCriteria: {
    minScore: number
    requiredSkills: string[]
  }
  autoAdvance: boolean
  emailTemplate?: string
  instructions?: string
  interviewType?: 'AI Assisted' | 'Human Only' | 'Hybrid'
  feedbackFormId?: string
  feedbackFormName?: string
}

interface InterviewFlow {
  id: string
  name: string
  description: string
  isDefault: boolean
  jobTypes: string[]
  rounds: InterviewRound[]
  totalEstimatedTime: number
  createdAt: string
  lastModified: string
}

interface NewRole {
  name: string
  description: string
  level: 'admin' | 'manager' | 'user' | 'viewer'
  permissions: Permission[]
}

export default function ClientOrganizationSettings() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("general")
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Predefined permissions
  const [allPermissions] = useState<Permission[]>([
    { id: 'users_read', name: 'View Users', category: 'users', description: 'View user profiles and list', level: 'read' },
    { id: 'users_write', name: 'Manage Users', category: 'users', description: 'Create, edit, and delete users', level: 'write' },
    { id: 'users_admin', name: 'Admin Users', category: 'users', description: 'Full user administration including permissions', level: 'admin' },
    
    { id: 'candidates_read', name: 'View Candidates', category: 'candidates', description: 'View candidate profiles and applications', level: 'read' },
    { id: 'candidates_write', name: 'Manage Candidates', category: 'candidates', description: 'Create, edit, and manage candidates', level: 'write' },
    { id: 'candidates_admin', name: 'Admin Candidates', category: 'candidates', description: 'Full candidate administration and bulk operations', level: 'admin' },
    
    { id: 'jobs_read', name: 'View Jobs', category: 'jobs', description: 'View job postings and details', level: 'read' },
    { id: 'jobs_write', name: 'Manage Jobs', category: 'jobs', description: 'Create, edit, and publish jobs', level: 'write' },
    { id: 'jobs_admin', name: 'Admin Jobs', category: 'jobs', description: 'Full job administration and approval workflows', level: 'admin' },
    
    { id: 'interviews_read', name: 'View Interviews', category: 'interviews', description: 'View interview schedules and details', level: 'read' },
    { id: 'interviews_write', name: 'Conduct Interviews', category: 'interviews', description: 'Schedule and conduct interviews', level: 'write' },
    { id: 'interviews_admin', name: 'Admin Interviews', category: 'interviews', description: 'Full interview administration and platform settings', level: 'admin' },
    
    { id: 'reports_read', name: 'View Reports', category: 'reports', description: 'Access basic reporting and analytics', level: 'read' },
    { id: 'reports_write', name: 'Create Reports', category: 'reports', description: 'Create and customize reports', level: 'write' },
    { id: 'reports_admin', name: 'Admin Reports', category: 'reports', description: 'Full reporting access and export capabilities', level: 'admin' },
    
    { id: 'settings_read', name: 'View Settings', category: 'settings', description: 'View organization settings', level: 'read' },
    { id: 'settings_write', name: 'Manage Settings', category: 'settings', description: 'Modify organization settings', level: 'write' },
    { id: 'settings_admin', name: 'Admin Settings', category: 'settings', description: 'Full settings administration including security', level: 'admin' },
    
    { id: 'billing_read', name: 'View Billing', category: 'billing', description: 'View billing information and invoices', level: 'read' },
    { id: 'billing_write', name: 'Manage Billing', category: 'billing', description: 'Update payment methods and billing details', level: 'write' },
    { id: 'billing_admin', name: 'Admin Billing', category: 'billing', description: 'Full billing administration and plan management', level: 'admin' }
  ])

  // Role management
  const [roles, setRoles] = useState<Role[]>([
    {
      id: 'super_admin',
      name: 'Super Administrator',
      description: 'Full system access with all permissions',
      level: 'admin',
      permissions: allPermissions,
      userCount: 2,
      isCustom: false
    },
    {
      id: 'org_admin',
      name: 'Organization Administrator',
      description: 'Organization-wide administrative access',
      level: 'admin',
      permissions: allPermissions.filter(p => p.category !== 'billing' || p.level !== 'admin'),
      userCount: 3,
      isCustom: false
    },
    {
      id: 'hiring_manager',
      name: 'Hiring Manager',
      description: 'Manage jobs and candidates for their departments',
      level: 'manager',
      permissions: allPermissions.filter(p => 
        ['candidates_read', 'candidates_write', 'jobs_read', 'jobs_write', 'interviews_read', 'interviews_write', 'reports_read'].includes(p.id)
      ),
      userCount: 8,
      isCustom: false
    },
    {
      id: 'recruiter',
      name: 'Recruiter',
      description: 'Full recruitment workflow access',
      level: 'user',
      permissions: allPermissions.filter(p => 
        ['candidates_read', 'candidates_write', 'jobs_read', 'interviews_read', 'interviews_write', 'reports_read'].includes(p.id)
      ),
      userCount: 15,
      isCustom: false
    },
    {
      id: 'interviewer',
      name: 'Interviewer',
      description: 'Conduct interviews and provide feedback',
      level: 'user',
      permissions: allPermissions.filter(p => 
        ['candidates_read', 'interviews_read', 'interviews_write'].includes(p.id)
      ),
      userCount: 25,
      isCustom: false
    },
    {
      id: 'observer',
      name: 'Observer',
      description: 'Read-only access to recruitment data',
      level: 'viewer',
      permissions: allPermissions.filter(p => p.level === 'read'),
      userCount: 5,
      isCustom: false
    }
  ])

  // Organization settings
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>({
    general: {
      name: "Acme Corporation",
      domain: "acmecorp.com",
      industry: "Technology",
      size: "201-500",
      website: "https://www.acmecorp.com",
      address: "123 Innovation Drive, San Francisco, CA 94105",
      contactEmail: "hr@acmecorp.com",
      phone: "+1 (555) 123-4567",
      timezone: "America/Los_Angeles",
      locale: "en-US",
      aiProvider: "anthropic",
      aiApiKey: "",
      emailUser: "",
      emailPassword: "",
      emailHost: "smtp.gmail.com",
      emailPort: "587"
    },
    ai: {
      selectedImplementation: "jobDescription",
      implementations: {
        jobDescription: {
          name: "Job Description Generation",
          prompt: `You are an expert HR professional and job description writer. Create professional, engaging, and comprehensive job descriptions that attract qualified candidates.

Your task is to generate:
1. A detailed job description (3-4 paragraphs)
2. Comprehensive requirements list (both required and preferred qualifications)

Make the content:
- Professional yet engaging
- Specific to the role and industry
- Include relevant technologies and skills for the position
- Follow modern job posting best practices
- Be inclusive and welcoming

Format the response as JSON with two fields: "description" and "requirements".
For the requirements field, format it as a clean, readable text with sections like:
Required Qualifications:
• Item 1
• Item 2

Technical Skills:
• Skill 1
• Skill 2

Preferred Qualifications:
• Item 1
• Item 2

Make sure the requirements field contains properly formatted text, not JSON structure.`
        },
        questionGeneration: {
          name: "Questions Generation with AI",
          prompt: `You are an expert interview and feedback form designer. Generate professional, insightful questions for feedback forms.

Your task is to generate questions based on the provided topic.

Requirements:
- Create diverse, thoughtful questions
- Make questions specific and actionable
- Include a mix of question types if specified
- Questions should be professional and unbiased
- Provide sample answers if requested

Format your response as valid JSON with this structure:
{
  "questions": [
    {
      "text": "Your question here",
      "type": "text",
      "required": true,
      "answer": "Sample answer here (if requested)"
    }
  ]
}`
        },
        retellAgent: {
          name: "Retell AI Agent Prompt",
          prompt: `You are an AI recruiter conducting initial phone screening calls. Be professional, friendly, and conversational.

Your goals:
- Assess candidate fit for the role
- Gauge interest and availability
- Schedule technical interviews if qualified
- Collect relevant experience information

Conversation Flow:
1. Introduce yourself and the company
2. Confirm candidate's interest in the position
3. Ask about relevant experience and skills
4. Discuss availability for interviews
5. Schedule next steps if interested

Always be:
- Professional and respectful
- Clear and concise
- Empathetic to candidate's time
- Positive about the opportunity

If candidate is not interested or has accepted another offer, thank them gracefully and end the call.`
        }
      }
    },
    security: {
      mfaRequired: true,
      ssoEnabled: true,
      ssoProvider: "google",
      ssoSettings: {},
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireNumbers: true,
        requireSymbols: true,
        maxAge: 90
      },
      sessionTimeout: 480, // 8 hours
      ipWhitelist: [],
      auditLogging: true
    },
    features: {
      aiMatching: true,
      videoInterviews: true,
      customBranding: true,
      apiAccess: true,
      dataExport: true,
      advancedReporting: true,
      webhooks: true,
      slackIntegration: true
    },
    notifications: {
      email: true,
      inApp: true,
      slack: true,
      webhooks: true,
      slackWebhook: "https://hooks.slack.com/services/...",
      emailTemplates: []
    },
    branding: {
      logo: "/placeholder.svg?height=64&width=64&text=Acme+Logo",
      primaryColor: "#2563eb",
      secondaryColor: "#6b7280",
      accentColor: "#dc2626",
      customCss: "",
      favicon: "/favicon.ico"
    },
    integrations: {
      slack: true,
      gsuite: true,
      office365: false,
      ats: false,
      hris: false,
      background_check: true
    }
  })

  // Compliance settings
  const [complianceSettings, setComplianceSettings] = useState<ComplianceSettings>({
    gdprCompliant: true,
    ccpaCompliant: true,
    dataRetentionDays: 365,
    dataProcessingAgreement: true,
    privacyPolicyUrl: "https://acmecorp.com/privacy",
    termsOfServiceUrl: "https://acmecorp.com/terms",
    cookieConsent: true
  })

  // Interview Flows and Rounds
  const [interviewFlows, setInterviewFlows] = useState<InterviewFlow[]>([]);
  const [isLoadingFlows, setIsLoadingFlows] = useState(true);

  // Feedback Forms
  interface FeedbackForm {
    id: number
    name: string
    description: string
    status: "draft" | "published"
    is_active: boolean
    is_default: boolean
  }
  const [feedbackForms, setFeedbackForms] = useState<FeedbackForm[]>([]);

  // API functions for interview flows
  const fetchInterviewFlows = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoadingFlows(true);
      const response = await fetch('http://127.0.0.1:8000/api/interview-flows/');
      if (response.ok) {
        const data = await response.json();
        const flows = Array.isArray(data) ? data : data.results || [];
        // Transform backend data to frontend format
        const transformedFlows = flows.map((flow: any) => {
          const rounds = flow.rounds?.map((round: any) => ({
            id: round.id.toString(),
            name: round.name,
            type: round.type,
            description: round.description || '',
            duration: round.duration,
            isRequired: round.is_required,
            order: round.order,
            interviewers: round.interviewers || [],
            skills: round.skills || [],
            passingCriteria: round.passing_criteria || {},
            autoAdvance: round.auto_advance,
            emailTemplate: round.email_template || '',
            instructions: round.instructions || '',
            interviewType: round.interview_type || 'Human Only',
            feedbackFormId: round.feedback_form_id || '',
            feedbackFormName: round.feedback_form_name || ''
          })) || [];

          const transformedFlow = {
            id: flow.id.toString(),
            name: flow.name,
            description: flow.description || '',
            isDefault: flow.is_default,
            jobTypes: flow.job_types || [],
            rounds: rounds,
            totalEstimatedTime: flow.total_estimated_time || 0,
            createdAt: flow.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            lastModified: flow.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0]
          };

          // Debug logging for newly created flows with rounds
          if (rounds.length > 0) {
            console.log(`Flow "${flow.name}" has ${rounds.length} rounds:`, rounds.map(r => r.name));
          }

          return transformedFlow;
        });
        setInterviewFlows(transformedFlows);
      } else {
        console.error('Failed to fetch interview flows:', response.status, response.statusText);
        // Don't use default flows on error, just log it
        setInterviewFlows([]);
      }
    } catch (error) {
      console.error('Error fetching interview flows:', error);
      // Don't use default flows on error, just log it
      setInterviewFlows([]);
    } finally {
      if (showLoading) setIsLoadingFlows(false);
    }
  };

  // Fetch feedback forms
  const fetchFeedbackForms = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/feedback-templates/');
      if (response.ok) {
        const forms = await response.json();
        setFeedbackForms(forms.filter((form: any) => form.is_active));
      }
    } catch (error) {
      console.error('Error fetching feedback forms:', error);
    }
  };

  const createInterviewFlow = async (flowData: any) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/interview-flows/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: flowData.name,
          description: flowData.description || '',
          is_default: flowData.isDefault || false,
          job_types: flowData.jobTypes || [],
          total_estimated_time: flowData.totalEstimatedTime || 0
        })
      });

      if (response.ok) {
        const newFlow = await response.json();
        console.log('Created flow response:', newFlow);

        // The backend doesn't return the ID on creation, so we need to fetch it
        let flowWithId = newFlow;
        if (!newFlow.id) {
          console.log('Flow ID not returned, fetching flows to find the created one...');
          const flowsResponse = await fetch('http://127.0.0.1:8000/api/interview-flows/');
          if (flowsResponse.ok) {
            const flows = await flowsResponse.json();
            // Find the most recently created flow with matching name
            const matchingFlow = flows.find((f: any) => f.name === flowData.name);
            if (matchingFlow) {
              flowWithId = matchingFlow;
              console.log('Found created flow with ID:', flowWithId.id);
            }
          }
        }

        // Create rounds separately
        if (flowData.rounds && flowData.rounds.length > 0) {
          console.log('Creating rounds for flow:', flowWithId.id, flowData.rounds);
          const roundPromises = flowData.rounds.map(async (round: any) => {
            const roundData = {
              flow: flowWithId.id,
              name: round.name,
              type: round.type,
              description: round.description || '',
              duration: round.duration,
              is_required: round.isRequired,
              order: round.order,
              interviewers: round.interviewers || [],
              skills: round.skills || [],
              passing_criteria: round.passingCriteria || {},
              auto_advance: round.autoAdvance,
              email_template: round.emailTemplate || '',
              instructions: round.instructions || '',
              interview_type: round.interviewType || 'Human Only',
              feedback_form_id: round.feedbackFormId || null,
              feedback_form_name: round.feedbackFormName || ''
            };
            console.log('Creating round:', round.name, roundData);
            const roundResponse = await fetch('http://127.0.0.1:8000/api/interview-rounds/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(roundData)
            });

            if (!roundResponse.ok) {
              const errorText = await roundResponse.text();
              console.error(`Failed to create round "${round.name}":`, roundResponse.status, errorText);
              throw new Error(`Failed to create round: ${round.name}`);
            }
            return roundResponse.json();
          });

          await Promise.all(roundPromises);
          console.log('All rounds created successfully for flow:', flowWithId.id);
        }
        return flowWithId;
      } else {
        throw new Error('Failed to create interview flow');
      }
    } catch (error) {
      console.error('Error creating interview flow:', error);
      throw error;
    }
  };

  const updateInterviewFlow = async (flowId: string, flowData: any) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/interview-flows/${flowId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: flowData.name,
          description: flowData.description || '',
          is_default: flowData.isDefault || false,
          job_types: flowData.jobTypes || [],
          total_estimated_time: flowData.totalEstimatedTime || 0
        })
      });

      if (response.ok) {
        // Update rounds
        if (flowData.rounds) {
          // Delete existing rounds and create new ones (simple approach)
          const existingRounds = await fetch(`http://127.0.0.1:8000/api/interview-rounds/?flow=${flowId}`);
          if (existingRounds.ok) {
            const rounds = await existingRounds.json();
            await Promise.all(rounds.map((round: any) =>
              fetch(`http://127.0.0.1:8000/api/interview-rounds/${round.id}/`, { method: 'DELETE' })
            ));
          }

          // Create new rounds sequentially to avoid order conflicts
          for (const round of flowData.rounds) {
            await fetch('http://127.0.0.1:8000/api/interview-rounds/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                flow: flowId,
                name: round.name,
                type: round.type,
                description: round.description || '',
                duration: round.duration,
                is_required: round.isRequired,
                order: round.order,
                interviewers: round.interviewers || [],
                skills: round.skills || [],
                passing_criteria: round.passingCriteria || {},
                auto_advance: round.autoAdvance,
                email_template: round.emailTemplate || '',
                instructions: round.instructions || '',
                interview_type: round.interviewType || 'Human Only',
                feedback_form_id: round.feedbackFormId || null,
                feedback_form_name: round.feedbackFormName || ''
              })
            });
          }
        }
        return await response.json();
      } else {
        throw new Error('Failed to update interview flow');
      }
    } catch (error) {
      console.error('Error updating interview flow:', error);
      throw error;
    }
  };

  const deleteInterviewFlow = async (flowId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/interview-flows/${flowId}/`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete interview flow');
      }
    } catch (error) {
      console.error('Error deleting interview flow:', error);
      throw error;
    }
  };

  // Default flows fallback function
  const getDefaultFlows = (): InterviewFlow[] => [
    {
      id: 'flow_1',
      name: 'Standard Technical Flow',
      description: 'Default flow for technical positions',
      isDefault: true,
      jobTypes: ['Software Engineer', 'Frontend Developer', 'Backend Developer'],
      rounds: [
        {
          id: 'round_1',
          name: 'Initial Screening',
          type: 'telephonic',
          description: 'Basic technical and cultural fit assessment',
          duration: 30,
          isRequired: true,
          order: 1,
          interviewers: ['HR Team'],
          skills: ['Communication', 'Basic Technical Knowledge'],
          passingCriteria: {
            minScore: 70,
            requiredSkills: ['Communication']
          },
          autoAdvance: false,
          emailTemplate: 'initial_screening_invitation',
          instructions: 'Assess basic technical knowledge and communication skills'
        },
        {
          id: 'round_2',
          name: 'Technical Assessment',
          type: 'technical',
          description: 'In-depth technical evaluation and coding assessment',
          duration: 90,
          isRequired: true,
          order: 2,
          interviewers: ['Tech Lead', 'Senior Developer'],
          skills: ['Problem Solving', 'Coding', 'System Design'],
          passingCriteria: {
            minScore: 80,
            requiredSkills: ['Problem Solving', 'Coding']
          },
          autoAdvance: false,
          emailTemplate: 'technical_round_invitation',
          instructions: 'Conduct coding challenges and system design discussion'
        },
        {
          id: 'round_3',
          name: 'HR Final Round',
          type: 'hr',
          description: 'Final discussion on compensation, culture fit, and expectations',
          duration: 45,
          isRequired: true,
          order: 3,
          interviewers: ['HR Manager', 'Hiring Manager'],
          skills: ['Cultural Fit', 'Communication', 'Negotiation'],
          passingCriteria: {
            minScore: 75,
            requiredSkills: ['Cultural Fit']
          },
          autoAdvance: false,
          emailTemplate: 'hr_final_invitation',
          instructions: 'Discuss role expectations, compensation, and culture fit'
        }
      ],
      totalEstimatedTime: 165,
      createdAt: '2024-01-15',
      lastModified: '2024-01-20'
    },
    {
      id: 'flow_2',
      name: 'Executive Flow',
      description: 'Interview flow for senior and executive positions',
      isDefault: false,
      jobTypes: ['Engineering Manager', 'CTO', 'VP Engineering'],
      rounds: [
        {
          id: 'round_4',
          name: 'Executive Screening',
          type: 'video',
          description: 'Leadership and strategic thinking assessment',
          duration: 60,
          isRequired: true,
          order: 1,
          interviewers: ['CEO', 'VP Engineering'],
          skills: ['Leadership', 'Strategic Thinking', 'Communication'],
          passingCriteria: {
            minScore: 85,
            requiredSkills: ['Leadership', 'Strategic Thinking']
          },
          autoAdvance: false,
          emailTemplate: 'executive_screening_invitation',
          instructions: 'Assess leadership capabilities and strategic vision'
        },
        {
          id: 'round_5',
          name: 'Panel Interview',
          type: 'panel',
          description: 'Multi-stakeholder interview with key team members',
          duration: 120,
          isRequired: true,
          order: 2,
          interviewers: ['CEO', 'CTO', 'VP Product', 'Senior Engineers'],
          skills: ['Leadership', 'Technical Vision', 'Team Building'],
          passingCriteria: {
            minScore: 80,
            requiredSkills: ['Leadership', 'Technical Vision']
          },
          autoAdvance: false,
          emailTemplate: 'panel_interview_invitation',
          instructions: 'Comprehensive evaluation by leadership team'
        }
      ],
      totalEstimatedTime: 180,
      createdAt: '2024-01-10',
      lastModified: '2024-01-25'
    }
  ]

  // Interview Flow Modal states
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false)
  const [selectedFlow, setSelectedFlow] = useState<InterviewFlow | null>(null)
  const [isEditingFlow, setIsEditingFlow] = useState(false)
  const [draggedRound, setDraggedRound] = useState<string | null>(null)

  // New Flow state for creation
  const [newFlow, setNewFlow] = useState<Partial<InterviewFlow>>({
    name: '',
    description: '',
    isDefault: false,
    jobTypes: [],
    rounds: [],
    totalEstimatedTime: 0
  })

  // Round modal states
  const [isRoundModalOpen, setIsRoundModalOpen] = useState(false)
  const [selectedRound, setSelectedRound] = useState<InterviewRound | null>(null)
  const [isEditingRound, setIsEditingRound] = useState(false)

  // Modal states
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isEditingRole, setIsEditingRole] = useState(false)

  // Preview modal states
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [previewFeedbackData, setPreviewFeedbackData] = useState<any>(null)

  const [newRole, setNewRole] = useState<NewRole>({
    name: '',
    description: '',
    level: 'user',
    permissions: []
  })

  // Load settings from localStorage on component mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('organizationSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);

        // Migration logic: convert old jobGenerationPrompt to new structure
        if (parsedSettings.ai && parsedSettings.ai.jobGenerationPrompt && !parsedSettings.ai.implementations) {
          console.log('Migrating old AI settings to new structure');
          parsedSettings.ai = {
            selectedImplementation: "jobDescription",
            implementations: {
              jobDescription: {
                name: "Job Description Generation",
                prompt: parsedSettings.ai.jobGenerationPrompt
              }
            }
          };
          // Save the migrated settings
          localStorage.setItem('organizationSettings', JSON.stringify(parsedSettings));
        }

        // Ensure ai.implementations exists
        if (parsedSettings.ai && !parsedSettings.ai.implementations) {
          parsedSettings.ai.implementations = {
            jobDescription: {
              name: "Job Description Generation",
              prompt: parsedSettings.ai.jobGenerationPrompt || `You are an expert HR professional and job description writer. Create professional, engaging, and comprehensive job descriptions that attract qualified candidates.

Your task is to generate:
1. A detailed job description (3-4 paragraphs)
2. Comprehensive requirements list (both required and preferred qualifications)

Make the content:
- Professional yet engaging
- Specific to the role and industry
- Include relevant technologies and skills for the position
- Follow modern job posting best practices
- Be inclusive and welcoming

Format the response as JSON with two fields: "description" and "requirements".
For the requirements field, format it as a clean, readable text with sections like:
Required Qualifications:
• Item 1
• Item 2

Technical Skills:
• Skill 1
• Skill 2

Preferred Qualifications:
• Item 1
• Item 2

Make sure the requirements field contains properly formatted text, not JSON structure.`
            },
            questionGeneration: {
              name: "Questions Generation with AI",
              prompt: `You are an expert interview and feedback form designer. Generate professional, insightful questions for feedback forms.

Your task is to generate questions based on the provided topic.

Requirements:
- Create diverse, thoughtful questions
- Make questions specific and actionable
- Include a mix of question types if specified
- Questions should be professional and unbiased
- Provide sample answers if requested

Format your response as valid JSON with this structure:
{
  "questions": [
    {
      "text": "Your question here",
      "type": "text",
      "required": true,
      "answer": "Sample answer here (if requested)"
    }
  ]
}`
            },
            retellAgent: {
              name: "Retell AI Agent Prompt",
              prompt: `You are an AI recruiter conducting initial phone screening calls. Be professional, friendly, and conversational.

Your goals:
- Assess candidate fit for the role
- Gauge interest and availability
- Schedule technical interviews if qualified
- Collect relevant experience information

Conversation Flow:
1. Introduce yourself and the company
2. Confirm candidate's interest in the position
3. Ask about relevant experience and skills
4. Discuss availability for interviews
5. Schedule next steps if interested

Always be:
- Professional and respectful
- Clear and concise
- Empathetic to candidate's time
- Positive about the opportunity

If candidate is not interested or has accepted another offer, thank them gracefully and end the call.`
            }
          };
          parsedSettings.ai.selectedImplementation = parsedSettings.ai.selectedImplementation || "jobDescription";
        }

        // Ensure questionGeneration implementation exists (for existing settings)
        if (parsedSettings.ai && parsedSettings.ai.implementations && !parsedSettings.ai.implementations.questionGeneration) {
          parsedSettings.ai.implementations.questionGeneration = {
            name: "Questions Generation with AI",
            prompt: `You are an expert interview and feedback form designer. Generate professional, insightful questions for feedback forms.

Your task is to generate questions based on the provided topic.

Requirements:
- Create diverse, thoughtful questions
- Make questions specific and actionable
- Include a mix of question types if specified
- Questions should be professional and unbiased
- Provide sample answers if requested

Format your response as valid JSON with this structure:
{
  "questions": [
    {
      "text": "Your question here",
      "type": "text",
      "required": true,
      "answer": "Sample answer here (if requested)"
    }
  ]
}`
          };
        }

        // Ensure retellAgent implementation exists (for existing settings)
        if (parsedSettings.ai && parsedSettings.ai.implementations && !parsedSettings.ai.implementations.retellAgent) {
          parsedSettings.ai.implementations.retellAgent = {
            name: "Retell AI Agent Prompt",
            prompt: `You are an AI recruiter conducting initial phone screening calls. Be professional, friendly, and conversational.

Your goals:
- Assess candidate fit for the role
- Gauge interest and availability
- Schedule technical interviews if qualified
- Collect relevant experience information

Conversation Flow:
1. Introduce yourself and the company
2. Confirm candidate's interest in the position
3. Ask about relevant experience and skills
4. Discuss availability for interviews
5. Schedule next steps if interested

Always be:
- Professional and respectful
- Clear and concise
- Empathetic to candidate's time
- Positive about the opportunity

If candidate is not interested or has accepted another offer, thank them gracefully and end the call.`
          };
        }

        setOrgSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings
        }));
        console.log('Loaded organization settings from localStorage:', parsedSettings);
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
  }, []);

  // Load interview flows from backend on component mount
  useEffect(() => {
    fetchInterviewFlows();
    fetchFeedbackForms();
  }, []);

  // Load email settings from backend on component mount
  useEffect(() => {
    const fetchEmailSettings = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/settings/email/');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setOrgSettings(prev => ({
              ...prev,
              general: {
                ...prev.general,
                emailUser: data.emailUser || '',
                emailHost: data.emailHost || 'smtp.gmail.com',
                emailPort: data.emailPort || '587',
              }
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch email settings:', error);
      }
    };
    fetchEmailSettings();
  }, []);

  // Handle settings changes with proper typing
  const handleSettingsChange = (section: keyof OrganizationSettings, field: string, value: boolean | string | number | object) => {
    const newSettings = {
      ...orgSettings,
      [section]: {
        ...orgSettings[section],
        [field]: value
      }
    };

    setOrgSettings(newSettings);
    setHasUnsavedChanges(true);

    // Auto-save AI settings immediately for better UX
    if ((section === 'general' && (field === 'aiProvider' || field === 'aiApiKey')) ||
        (section === 'ai' && (field === 'selectedImplementation' || field.startsWith('implementations.')))) {
      try {
        localStorage.setItem('organizationSettings', JSON.stringify(newSettings));
        console.log('Auto-saved AI settings to localStorage:', { section, field, value: typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value });

        // Trigger storage event for other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'organizationSettings',
          newValue: JSON.stringify(newSettings),
          storageArea: localStorage
        }));
      } catch (error) {
        console.error('Error auto-saving AI settings:', error);
      }
    }
  }

  // Handle compliance settings changes
  const handleComplianceChange = (field: keyof ComplianceSettings, value: boolean | string | number) => {
    setComplianceSettings(prev => ({
      ...prev,
      [field]: value
    }))
    setHasUnsavedChanges(true)
  }

  // Handle role permissions
  const handlePermissionToggle = (roleId: string, permissionId: string, enabled: boolean) => {
    if (isEditingRole && selectedRole) {
      const permission = allPermissions.find(p => p.id === permissionId)
      if (!permission) return

      const newPermissions = enabled
        ? [...selectedRole.permissions, permission]
        : selectedRole.permissions.filter(p => p.id !== permissionId)
      
      setSelectedRole({
        ...selectedRole,
        permissions: newPermissions
      })
    } else {
      setRoles(prev => prev.map(role => {
        if (role.id === roleId) {
          const permission = allPermissions.find(p => p.id === permissionId)
          if (!permission) return role

          const newPermissions = enabled
            ? [...role.permissions, permission]
            : role.permissions.filter(p => p.id !== permissionId)
          return { ...role, permissions: newPermissions }
        }
        return role
      }))
    }
    setHasUnsavedChanges(true)
  }

  // Handle new role permission toggle
  const handleNewRolePermissionToggle = (permissionId: string, enabled: boolean) => {
    const permission = allPermissions.find(p => p.id === permissionId)
    if (!permission) return

    setNewRole(prev => ({
      ...prev,
      permissions: enabled
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p.id !== permissionId)
    }))
  }

  // Create new role
  const handleCreateRole = () => {
    if (!newRole.name.trim()) {
      toast({
        title: "Error",
        description: "Role name is required.",
        variant: "destructive"
      })
      return
    }

    const roleId = `custom_${Date.now()}`
    const role: Role = {
      id: roleId,
      name: newRole.name,
      description: newRole.description,
      level: newRole.level,
      permissions: newRole.permissions,
      userCount: 0,
      isCustom: true
    }

    setRoles(prev => [...prev, role])
    setNewRole({ name: '', description: '', level: 'user', permissions: [] })
    setIsRoleModalOpen(false)
    setHasUnsavedChanges(true)
    
    toast({
      title: "Success",
      description: "Custom role created successfully.",
      variant: "default"
    })
  }

  // Update existing role
  const handleUpdateRole = () => {
    if (!selectedRole) return

    setRoles(prev => prev.map(role => 
      role.id === selectedRole.id ? selectedRole : role
    ))
    
    setIsRoleModalOpen(false)
    setSelectedRole(null)
    setIsEditingRole(false)
    setHasUnsavedChanges(true)
    
    toast({
      title: "Success",
      description: "Role updated successfully.",
      variant: "default"
    })
  }

  // Delete role
  const handleDeleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    if (!role?.isCustom) {
      toast({
        title: "Error",
        description: "Cannot delete default roles.",
        variant: "destructive"
      })
      return
    }

    if (role.userCount > 0) {
      toast({
        title: "Error",
        description: "Cannot delete role with assigned users.",
        variant: "destructive"
      })
      return
    }

    setRoles(prev => prev.filter(r => r.id !== roleId))
    setHasUnsavedChanges(true)
    
    toast({
      title: "Success",
      description: "Role deleted successfully.",
      variant: "default"
    })
  }

  // Open role modal for editing
  const openEditRoleModal = (role: Role) => {
    setSelectedRole({ ...role })
    setIsEditingRole(true)
    setIsRoleModalOpen(true)
  }

  // Open role modal for creating
  const openCreateRoleModal = () => {
    setSelectedRole(null)
    setIsEditingRole(false)
    setNewRole({ name: '', description: '', level: 'user', permissions: [] })
    setIsRoleModalOpen(true)
  }

  // Close role modal
  const closeRoleModal = () => {
    setIsRoleModalOpen(false)
    setSelectedRole(null)
    setIsEditingRole(false)
    setNewRole({ name: '', description: '', level: 'user', permissions: [] })
  }

  // Interview Flow Management Functions
  const openCreateFlowModal = () => {
    setSelectedFlow(null)
    setIsEditingFlow(false)
    setNewFlow({
      name: '',
      description: '',
      isDefault: false,
      jobTypes: [],
      rounds: [],
      totalEstimatedTime: 0
    })
    setIsFlowModalOpen(true)
  }

  const openEditFlowModal = (flow: InterviewFlow) => {
    setSelectedFlow({ ...flow })
    setIsEditingFlow(true)
    setIsFlowModalOpen(true)
  }

  const closeFlowModal = () => {
    setIsFlowModalOpen(false)
    setSelectedFlow(null)
    setIsEditingFlow(false)
    setNewFlow({
      name: '',
      description: '',
      isDefault: false,
      jobTypes: [],
      rounds: [],
      totalEstimatedTime: 0
    })
  }

  const handleCreateFlow = async () => {
    if (!newFlow.name?.trim()) {
      toast({
        title: "Error",
        description: "Flow name is required.",
        variant: "destructive"
      })
      return
    }

    try {
      const flowData = {
        name: newFlow.name,
        description: newFlow.description || '',
        isDefault: newFlow.isDefault || false,
        jobTypes: newFlow.jobTypes || [],
        rounds: newFlow.rounds || [],
        totalEstimatedTime: newFlow.rounds?.reduce((sum, round) => sum + round.duration, 0) || 0
      }

      await createInterviewFlow(flowData)
      // Small delay to ensure database consistency before refreshing
      await new Promise(resolve => setTimeout(resolve, 200))
      console.log('Fetching flows after flow creation with rounds...');
      await fetchInterviewFlows(false) // Refresh the list without loading state
      closeFlowModal()
      setHasUnsavedChanges(true)

      toast({
        title: "Success",
        description: "Interview flow created successfully.",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create interview flow. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleUpdateFlow = async () => {
    if (!selectedFlow) return

    try {
      const updatedFlowData = {
        ...selectedFlow,
        totalEstimatedTime: selectedFlow.rounds.reduce((sum, round) => sum + round.duration, 0)
      }

      await updateInterviewFlow(selectedFlow.id, updatedFlowData)
      await fetchInterviewFlows(false) // Refresh the list without loading state
      closeFlowModal()
      setHasUnsavedChanges(true)

      toast({
        title: "Success",
        description: "Interview flow updated successfully.",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update interview flow. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleDeleteFlow = async (flowId: string) => {
    const flow = interviewFlows.find(f => f.id === flowId)
    if (flow?.isDefault) {
      toast({
        title: "Error",
        description: "Cannot delete default flow.",
        variant: "destructive"
      })
      return
    }

    try {
      await deleteInterviewFlow(flowId)
      await fetchInterviewFlows(false) // Refresh the list without loading state
      setHasUnsavedChanges(true)

      toast({
        title: "Success",
        description: "Interview flow deleted successfully.",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete interview flow. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Round Management Functions
  const addRoundToFlow = (roundTemplate: {id?: string, name: string, type: string, description: string, duration: string, icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement>>, color: string}) => {
    const newRound: InterviewRound = {
      id: `round_${Date.now()}`,
      name: roundTemplate.name,
      type: roundTemplate.type as 'telephonic' | 'video' | 'technical' | 'hr' | 'panel' | 'assignment' | 'onsite' | 'cultural',
      description: roundTemplate.description,
      duration: parseInt(roundTemplate.duration.split('-')[0]) || 30,
      isRequired: true,
      order: isEditingFlow ? (selectedFlow?.rounds.length || 0) + 1 : (newFlow.rounds?.length || 0) + 1,
      interviewers: [],
      skills: [],
      passingCriteria: {
        minScore: 70,
        requiredSkills: []
      },
      autoAdvance: false,
      instructions: `Conduct ${roundTemplate.name.toLowerCase()}`,
      interviewType: 'Human Only',
      feedbackFormId: '',
      feedbackFormName: ''
    }

    if (isEditingFlow && selectedFlow) {
      setSelectedFlow({
        ...selectedFlow,
        rounds: [...selectedFlow.rounds, newRound]
      })
    } else {
      setNewFlow(prev => ({
        ...prev,
        rounds: [...(prev.rounds || []), newRound]
      }))
    }
  }

  const removeRoundFromFlow = (roundId: string) => {
    if (isEditingFlow && selectedFlow) {
      setSelectedFlow({
        ...selectedFlow,
        rounds: selectedFlow.rounds.filter(r => r.id !== roundId)
      })
    } else {
      setNewFlow(prev => ({
        ...prev,
        rounds: prev.rounds?.filter(r => r.id !== roundId) || []
      }))
    }
  }

  const moveRound = (roundId: string, direction: 'up' | 'down') => {
    const rounds = isEditingFlow ? selectedFlow?.rounds || [] : newFlow.rounds || []
    const roundIndex = rounds.findIndex(r => r.id === roundId)
    
    if ((direction === 'up' && roundIndex === 0) || 
        (direction === 'down' && roundIndex === rounds.length - 1)) {
      return
    }

    const newRounds = [...rounds]
    const targetIndex = direction === 'up' ? roundIndex - 1 : roundIndex + 1
    
    const temp = newRounds[roundIndex]
    newRounds[roundIndex] = newRounds[targetIndex]
    newRounds[targetIndex] = temp
    
    // Update order numbers with new objects to trigger re-render
    const updatedRounds = newRounds.map((round, index) => ({
      ...round,
      order: index + 1
    }))

    if (isEditingFlow && selectedFlow) {
      setSelectedFlow({
        ...selectedFlow,
        rounds: updatedRounds
      })
    } else {
      setNewFlow(prev => ({
        ...prev,
        rounds: updatedRounds
      }))
    }
  }

  // Update round interview type
  const updateRoundInterviewType = (roundId: string, interviewType: 'AI Assisted' | 'Human Only' | 'Hybrid') => {
    if (isEditingFlow && selectedFlow) {
      setSelectedFlow({
        ...selectedFlow,
        rounds: selectedFlow.rounds.map(r =>
          r.id === roundId ? { ...r, interviewType } : r
        )
      })
    } else {
      setNewFlow(prev => ({
        ...prev,
        rounds: prev.rounds?.map(r =>
          r.id === roundId ? { ...r, interviewType } : r
        ) || []
      }))
    }
  }

  // Update round feedback form
  const updateRoundFeedbackForm = (roundId: string, feedbackFormId: string) => {
    const selectedForm = feedbackForms.find(f => f.id.toString() === feedbackFormId);
    if (isEditingFlow && selectedFlow) {
      setSelectedFlow({
        ...selectedFlow,
        rounds: selectedFlow.rounds.map(r =>
          r.id === roundId ? {
            ...r,
            feedbackFormId,
            feedbackFormName: selectedForm?.name || ''
          } : r
        )
      })
    } else {
      setNewFlow(prev => ({
        ...prev,
        rounds: prev.rounds?.map(r =>
          r.id === roundId ? {
            ...r,
            feedbackFormId,
            feedbackFormName: selectedForm?.name || ''
          } : r
        ) || []
      }))
    }
  }

  // Preview feedback form
  const previewFeedbackForm = async (feedbackFormId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/feedback-templates/${feedbackFormId}/`);
      if (response.ok) {
        const feedbackForm = await response.json();
        setPreviewFeedbackData(feedbackForm);
        setIsPreviewModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching feedback form details:', error);
    }
  }

  // Save settings
  const handleSaveSettings = async () => {
    setIsLoading(true)
    try {
      // Save to localStorage
      localStorage.setItem('organizationSettings', JSON.stringify(orgSettings));
      console.log('Saved organization settings to localStorage:', orgSettings);

      // Trigger storage event for other tabs/components
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'organizationSettings',
        newValue: JSON.stringify(orgSettings),
        storageArea: localStorage
      }));

      // Simulate API call (for future backend integration)
      await new Promise(resolve => setTimeout(resolve, 1500))

      setHasUnsavedChanges(false)
      toast({
        title: "Settings Saved",
        description: "Organization settings have been updated successfully.",
        variant: "default"
      })
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Validate number inputs
  const handleNumberInputChange = (value: string, setter: (val: number) => void) => {
    const num = parseInt(value)
    if (!isNaN(num) && num >= 0) {
      setter(num)
    }
  }

  // Get permission badge color
  const getPermissionBadgeColor = (level: string) => {
    switch (level) {
      case 'admin': return 'bg-red-100 text-red-700'
      case 'write': return 'bg-blue-100 text-blue-700'
      case 'read': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-black'
    }
  }

  // Get role badge color
  const getRoleBadgeColor = (level: string) => {
    switch (level) {
      case 'admin': return 'bg-purple-100 text-purple-700'
      case 'manager': return 'bg-blue-100 text-blue-700'
      case 'user': return 'bg-green-100 text-green-700'
      case 'viewer': return 'bg-gray-100 text-black'
      default: return 'bg-gray-100 text-black'
    }
  }

  // Group permissions by category
  const permissionsByCategory = allPermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = []
    }
    acc[permission.category].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Organization Settings
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm">
                Configure your organization&apos;s settings, security, and permissions
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1">
                  <Clock className="h-3 w-3 mr-2" />
                  Unsaved Changes
                </Badge>
              )}
              <Button
                onClick={handleSaveSettings}
                disabled={isLoading || !hasUnsavedChanges}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-slate-200">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1 bg-transparent p-0">
              <TabsTrigger
                value="general"
                className="flex items-center gap-2 px-3 py-2.5 text-xs sm:text-sm font-medium rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-100 transition-all duration-200"
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
                <span className="sm:hidden">Gen</span>
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="flex items-center gap-2 px-3 py-2.5 text-xs sm:text-sm font-medium rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-100 transition-all duration-200"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
                <span className="sm:hidden">Sec</span>
              </TabsTrigger>
              <TabsTrigger
                value="permissions"
                className="flex items-center gap-2 px-3 py-2.5 text-xs sm:text-sm font-medium rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-100 transition-all duration-200"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Permissions</span>
                <span className="sm:hidden">Perm</span>
              </TabsTrigger>
              <TabsTrigger
                value="features"
                className="flex items-center gap-2 px-3 py-2.5 text-xs sm:text-sm font-medium rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-100 transition-all duration-200"
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Features</span>
                <span className="sm:hidden">Feat</span>
              </TabsTrigger>
              <TabsTrigger
                value="branding"
                className="flex items-center gap-2 px-3 py-2.5 text-xs sm:text-sm font-medium rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-100 transition-all duration-200"
              >
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Branding</span>
                <span className="sm:hidden">Brand</span>
              </TabsTrigger>
              <TabsTrigger
                value="compliance"
                className="flex items-center gap-2 px-3 py-2.5 text-xs sm:text-sm font-medium rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-100 transition-all duration-200"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Compliance</span>
                <span className="sm:hidden">Comp</span>
              </TabsTrigger>
              <TabsTrigger
                value="ai-prompt"
                className="flex items-center gap-2 px-3 py-2.5 text-xs sm:text-sm font-medium rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-100 transition-all duration-200"
              >
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">AI Prompt</span>
                <span className="sm:hidden">AI</span>
              </TabsTrigger>
              <TabsTrigger
                value="interview-rounds"
                className="flex items-center gap-2 px-3 py-2.5 text-xs sm:text-sm font-medium rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-100 transition-all duration-200"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Rules Engine</span>
                <span className="sm:hidden">Rules</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* General Settings */}
          <TabsContent value="general" className="mt-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg border-b border-slate-200">
                  <CardTitle className="flex items-center text-base font-semibold text-slate-800">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    Organization Details
                  </CardTitle>
                  <CardDescription className="text-slate-600 mt-2">
                    Basic information about your organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="space-y-3">
                    <Label htmlFor="org-name" className="text-sm font-medium text-slate-700">
                      Organization Name
                    </Label>
                    <Input
                      id="org-name"
                      value={orgSettings.general.name}
                      onChange={(e) => handleSettingsChange('general', 'name', e.target.value)}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                      placeholder="Enter organization name"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="domain" className="text-sm font-medium text-slate-700">
                      Domain
                    </Label>
                    <Input
                      id="domain"
                      value={orgSettings.general.domain}
                      onChange={(e) => handleSettingsChange('general', 'domain', e.target.value)}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                      placeholder="example.com"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-slate-700">Industry</Label>
                      <Select
                        value={orgSettings.general.industry}
                        onValueChange={(value) => handleSettingsChange('general', 'industry', value)}
                      >
                        <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 shadow-lg z-50">
                          <SelectItem value="Technology" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">Technology</SelectItem>
                          <SelectItem value="Healthcare" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">Healthcare</SelectItem>
                          <SelectItem value="Finance" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">Finance</SelectItem>
                          <SelectItem value="Education" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">Education</SelectItem>
                          <SelectItem value="Retail" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">Retail</SelectItem>
                          <SelectItem value="Manufacturing" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">Manufacturing</SelectItem>
                          <SelectItem value="Other" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-slate-700">Company Size</Label>
                      <Select
                        value={orgSettings.general.size}
                        onValueChange={(value) => handleSettingsChange('general', 'size', value)}
                      >
                        <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 shadow-lg z-50">
                          <SelectItem value="1-10" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">1-10 employees</SelectItem>
                          <SelectItem value="11-50" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">51-200 employees</SelectItem>
                          <SelectItem value="201-500" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">201-500 employees</SelectItem>
                          <SelectItem value="501-1000" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">501-1000 employees</SelectItem>
                          <SelectItem value="1000+" className="text-slate-700 hover:bg-blue-50 focus:bg-blue-50">1000+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={orgSettings.general.website}
                    onChange={(e) => handleSettingsChange('general', 'website', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-lg border-b border-slate-200">
                  <CardTitle className="flex items-center text-base font-semibold text-slate-800">
                    <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                      <Phone className="h-5 w-5 text-emerald-600" />
                    </div>
                    Contact Information
                  </CardTitle>
                  <CardDescription className="text-slate-600 mt-2">
                    Contact details and regional settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="space-y-3">
                    <Label htmlFor="address" className="text-sm font-medium text-slate-700">
                      Address
                    </Label>
                    <Textarea
                      id="address"
                      value={orgSettings.general.address}
                      onChange={(e) => handleSettingsChange('general', 'address', e.target.value)}
                      rows={3}
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 transition-colors duration-200"
                      placeholder="Enter organization address"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="contact-email" className="text-sm font-medium text-slate-700">
                      Contact Email
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={orgSettings.general.contactEmail}
                      onChange={(e) => handleSettingsChange('general', 'contactEmail', e.target.value)}
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 transition-colors duration-200"
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      value={orgSettings.general.phone}
                      onChange={(e) => handleSettingsChange('general', 'phone', e.target.value)}
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 transition-colors duration-200"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={orgSettings.general.timezone}
                      onValueChange={(value) => handleSettingsChange('general', 'timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                        <SelectItem value="America/Los_Angeles" className="text-black hover:bg-gray-100">Pacific Time</SelectItem>
                        <SelectItem value="America/Denver" className="text-black hover:bg-gray-100">Mountain Time</SelectItem>
                        <SelectItem value="America/Chicago" className="text-black hover:bg-gray-100">Central Time</SelectItem>
                        <SelectItem value="America/New_York" className="text-black hover:bg-gray-100">Eastern Time</SelectItem>
                        <SelectItem value="Europe/London" className="text-black hover:bg-gray-100">GMT</SelectItem>
                        <SelectItem value="Europe/Paris" className="text-black hover:bg-gray-100">CET</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Locale</Label>
                    <Select
                      value={orgSettings.general.locale}
                      onValueChange={(value) => handleSettingsChange('general', 'locale', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select locale" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                        <SelectItem value="en-US" className="text-black hover:bg-gray-100">English (US)</SelectItem>
                        <SelectItem value="en-GB" className="text-black hover:bg-gray-100">English (UK)</SelectItem>
                        <SelectItem value="es-ES" className="text-black hover:bg-gray-100">Spanish</SelectItem>
                        <SelectItem value="fr-FR" className="text-black hover:bg-gray-100">French</SelectItem>
                        <SelectItem value="de-DE" className="text-black hover:bg-gray-100">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* AI Configuration Card - Full Width */}
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  AI Configuration
                </CardTitle>
                <CardDescription>Configure AI provider and API settings for job description generation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>AI Provider</Label>
                    <Select
                      value={orgSettings.general.aiProvider}
                      onValueChange={(value) => handleSettingsChange('general', 'aiProvider', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI provider" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                        <SelectItem value="anthropic" className="text-black hover:bg-gray-100">Anthropic (Claude)</SelectItem>
                        <SelectItem value="openai" className="text-black hover:bg-gray-100">OpenAI (GPT)</SelectItem>
                        <SelectItem value="groq" className="text-black hover:bg-gray-100">Groq (Free - No Card!)</SelectItem>
                        <SelectItem value="grok" className="text-black hover:bg-gray-100">Grok (xAI)</SelectItem>
                        <SelectItem value="google" className="text-black hover:bg-gray-100">Google (Gemini)</SelectItem>
                        <SelectItem value="perplexity" className="text-black hover:bg-gray-100">Perplexity AI</SelectItem>
                        <SelectItem value="azure" className="text-black hover:bg-gray-100">Azure OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-api-key">API Key</Label>
                    <div className="relative">
                      <Input
                        id="ai-api-key"
                        type="password"
                        value={orgSettings.general.aiApiKey}
                        onChange={(e) => handleSettingsChange('general', 'aiApiKey', e.target.value)}
                        placeholder="Enter your API key"
                      />
                      <Key className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500">
                      Your API key is encrypted and stored securely. It's used for AI-powered job description generation.
                    </p>
                    <p className="text-xs text-green-600 font-medium">
                      ✓ AI settings are automatically saved when changed
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Current Provider:</span>
                    <Badge variant={orgSettings.general.aiProvider ? "default" : "secondary"}>
                      {orgSettings.general.aiProvider ? 
                        orgSettings.general.aiProvider.charAt(0).toUpperCase() + orgSettings.general.aiProvider.slice(1) : 
                        "Not configured"
                      }
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600">API Key Status:</span>
                    <Badge variant={orgSettings.general.aiApiKey ? "default" : "destructive"}>
                      {orgSettings.general.aiApiKey ? "Configured" : "Not set"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email Configuration Card - Full Width */}
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Email Configuration
                </CardTitle>
                <CardDescription>Configure SMTP settings for sending emails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-user">Email Address</Label>
                    <Input
                      id="email-user"
                      type="email"
                      value={orgSettings.general.emailUser}
                      onChange={(e) => handleSettingsChange('general', 'emailUser', e.target.value)}
                      placeholder="your-email@gmail.com"
                    />
                    <p className="text-xs text-gray-500">
                      The email address used to send emails
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-password">Email Password / App Password</Label>
                    <div className="relative">
                      <Input
                        id="email-password"
                        type="password"
                        value={orgSettings.general.emailPassword}
                        onChange={(e) => handleSettingsChange('general', 'emailPassword', e.target.value)}
                        placeholder="Enter app password"
                      />
                      <Key className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500">
                      For Gmail, use an App Password instead of your account password
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-host">SMTP Host</Label>
                    <Input
                      id="email-host"
                      value={orgSettings.general.emailHost}
                      onChange={(e) => handleSettingsChange('general', 'emailHost', e.target.value)}
                      placeholder="smtp.gmail.com"
                    />
                    <p className="text-xs text-gray-500">
                      Common: smtp.gmail.com, smtp.office365.com
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-port">SMTP Port</Label>
                    <Input
                      id="email-port"
                      value={orgSettings.general.emailPort}
                      onChange={(e) => handleSettingsChange('general', 'emailPort', e.target.value)}
                      placeholder="587"
                    />
                    <p className="text-xs text-gray-500">
                      Common ports: 587 (TLS), 465 (SSL)
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Email Status:</span>
                    <Badge variant={orgSettings.general.emailUser && orgSettings.general.emailPassword ? "default" : "destructive"}>
                      {orgSettings.general.emailUser && orgSettings.general.emailPassword ? "Configured" : "Not configured"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={async () => {
                      // Validate required fields
                      if (!orgSettings.general.emailUser || !orgSettings.general.emailUser.trim()) {
                        toast({
                          title: "Validation Error",
                          description: "Email address is required",
                          variant: "destructive"
                        });
                        return;
                      }

                      if (!orgSettings.general.emailPassword || !orgSettings.general.emailPassword.trim()) {
                        toast({
                          title: "Validation Error",
                          description: "Email password is required",
                          variant: "destructive"
                        });
                        return;
                      }

                      // Validate email format
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (!emailRegex.test(orgSettings.general.emailUser)) {
                        toast({
                          title: "Validation Error",
                          description: "Please enter a valid email address",
                          variant: "destructive"
                        });
                        return;
                      }

                      try {
                        const response = await fetch('http://localhost:8000/api/settings/email/update/', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            emailUser: orgSettings.general.emailUser,
                            emailPassword: orgSettings.general.emailPassword,
                            emailHost: orgSettings.general.emailHost,
                            emailPort: orgSettings.general.emailPort,
                          })
                        });
                        const data = await response.json();
                        if (data.success) {
                          toast({
                            title: "Success",
                            description: "Email settings updated successfully!",
                          });
                        } else {
                          toast({
                            title: "Error",
                            description: data.error || "Failed to update email settings",
                            variant: "destructive"
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to update email settings",
                          variant: "destructive"
                        });
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Email Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Authentication & Access
                </CardTitle>
                <CardDescription>Configure authentication and access controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-blue-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                      <Shield className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">Multi-Factor Authentication</Label>
                      <p className="text-sm text-slate-600">Require MFA for all users</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Switch
                      checked={orgSettings.security.mfaRequired}
                      onCheckedChange={(checked: boolean) => handleSettingsChange('security', 'mfaRequired', checked)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-500 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                    />
                    {orgSettings.security.mfaRequired && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-green-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                      <Key className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">Single Sign-On (SSO)</Label>
                      <p className="text-sm text-slate-600">Enable SSO authentication</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Switch
                      checked={orgSettings.security.ssoEnabled}
                      onCheckedChange={(checked: boolean) => handleSettingsChange('security', 'ssoEnabled', checked)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                    />
                    {orgSettings.security.ssoEnabled && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>

                {orgSettings.security.ssoEnabled && (
                  <div className="space-y-2">
                    <Label>SSO Provider</Label>
                    <Select
                      value={orgSettings.security.ssoProvider}
                      onValueChange={(value) => handleSettingsChange('security', 'ssoProvider', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select SSO provider" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                        <SelectItem value="google" className="text-black hover:bg-gray-100">Google Workspace</SelectItem>
                        <SelectItem value="microsoft" className="text-black hover:bg-gray-100">Microsoft 365</SelectItem>
                        <SelectItem value="okta" className="text-black hover:bg-gray-100">Okta</SelectItem>
                        <SelectItem value="saml" className="text-black hover:bg-gray-100">Custom SAML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    value={orgSettings.security.sessionTimeout}
                    onChange={(e) => handleNumberInputChange(e.target.value, (val) => 
                      handleSettingsChange('security', 'sessionTimeout', val)
                    )}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-purple-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg">
                      <Activity className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">Audit Logging</Label>
                      <p className="text-sm text-slate-600">Track all user actions</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Switch
                      checked={orgSettings.security.auditLogging}
                      onCheckedChange={(checked: boolean) => handleSettingsChange('security', 'auditLogging', checked)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                    />
                    {orgSettings.security.auditLogging && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="h-5 w-5 mr-2" />
                  Password Policy
                </CardTitle>
                <CardDescription>Define password requirements for users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Minimum Length</Label>
                  <Input
                    type="number"
                    value={orgSettings.security.passwordPolicy.minLength}
                    onChange={(e) => handleNumberInputChange(e.target.value, (val) =>
                      handleSettingsChange('security', 'passwordPolicy', {
                        ...orgSettings.security.passwordPolicy,
                        minLength: val
                      })
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/70 backdrop-blur-sm rounded-lg border border-amber-200 hover:bg-white/90 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-amber-100 to-yellow-100 rounded">
                        <span className="text-amber-600 font-bold text-xs">Aa</span>
                      </div>
                      <Label className="text-slate-800 font-medium">Require Uppercase Letters</Label>
                    </div>
                    <div className="relative">
                      <Switch
                        checked={orgSettings.security.passwordPolicy.requireUppercase}
                        onCheckedChange={(checked: boolean) => handleSettingsChange('security', 'passwordPolicy', {
                          ...orgSettings.security.passwordPolicy,
                          requireUppercase: checked
                        })}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-300 scale-105 shadow-md"
                      />
                      {orgSettings.security.passwordPolicy.requireUppercase && (
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/70 backdrop-blur-sm rounded-lg border border-blue-200 hover:bg-white/90 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-blue-100 to-indigo-100 rounded">
                        <span className="text-blue-600 font-bold text-xs">123</span>
                      </div>
                      <Label className="text-slate-800 font-medium">Require Numbers</Label>
                    </div>
                    <div className="relative">
                      <Switch
                        checked={orgSettings.security.passwordPolicy.requireNumbers}
                        onCheckedChange={(checked: boolean) => handleSettingsChange('security', 'passwordPolicy', {
                          ...orgSettings.security.passwordPolicy,
                          requireNumbers: checked
                        })}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-500 data-[state=unchecked]:bg-gray-300 scale-105 shadow-md"
                      />
                      {orgSettings.security.passwordPolicy.requireNumbers && (
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/70 backdrop-blur-sm rounded-lg border border-purple-200 hover:bg-white/90 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-purple-100 to-violet-100 rounded">
                        <span className="text-purple-600 font-bold text-xs">@#</span>
                      </div>
                      <Label className="text-slate-800 font-medium">Require Special Characters</Label>
                    </div>
                    <div className="relative">
                      <Switch
                        checked={orgSettings.security.passwordPolicy.requireSymbols}
                        onCheckedChange={(checked: boolean) => handleSettingsChange('security', 'passwordPolicy', {
                          ...orgSettings.security.passwordPolicy,
                          requireSymbols: checked
                        })}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-300 scale-105 shadow-md"
                      />
                      {orgSettings.security.passwordPolicy.requireSymbols && (
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Password Expiry (days)</Label>
                  <Input
                    type="number"
                    value={orgSettings.security.passwordPolicy.maxAge}
                    onChange={(e) => handleNumberInputChange(e.target.value, (val) =>
                      handleSettingsChange('security', 'passwordPolicy', {
                        ...orgSettings.security.passwordPolicy,
                        maxAge: val
                      })
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Role-Based Permissions */}
        <TabsContent value="permissions" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Role Management</h3>
                <p className="text-sm text-black">Configure roles and permissions for your organization</p>
              </div>
              <Button onClick={openCreateRoleModal}>
                <Plus className="h-4 w-4 mr-2" />
                Create Custom Role
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {roles.map((role) => (
                <Card key={role.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className={getRoleBadgeColor(role.level)}>
                          {role.level.charAt(0).toUpperCase() + role.level.slice(1)}
                        </Badge>
                        {!role.isCustom && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            <Crown className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditRoleModal(role)}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                        {role.isCustom && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRole(role.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-sm">{role.name}</CardTitle>
                    <CardDescription className="text-sm">{role.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Users with this role:</span>
                        <span className="font-medium">{role.userCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Permissions:</span>
                        <span className="font-medium">{role.permissions.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(permissionsByCategory).map((category) => {
                          const categoryPermissions = role.permissions.filter(p => p.category === category)
                          if (categoryPermissions.length === 0) return null
                          
                          return (
                            <Badge
                              key={category}
                              variant="outline"
                              className="text-xs"
                            >
                              {category} ({categoryPermissions.length})
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 hover:shadow-xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  Platform Features
                </CardTitle>
                <CardDescription className="text-amber-800">Enable or disable advanced features for your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-amber-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                      <User2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">AI-Powered Candidate Matching</Label>
                      <p className="text-sm text-slate-600">Intelligent candidate recommendations</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Switch
                      checked={orgSettings.features.aiMatching}
                      onCheckedChange={(checked: boolean) => handleSettingsChange('features', 'aiMatching', checked)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                    />
                    {orgSettings.features.aiMatching && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-amber-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                      <Video className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">Video Interview Platform</Label>
                      <p className="text-sm text-slate-600">Built-in video conferencing</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Switch
                      checked={orgSettings.features.videoInterviews}
                      onCheckedChange={(checked: boolean) => handleSettingsChange('features', 'videoInterviews', checked)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                    />
                    {orgSettings.features.videoInterviews && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-amber-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-lg">
                      <Database className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">API Access</Label>
                      <p className="text-sm text-slate-600">REST API for integrations</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Switch
                      checked={orgSettings.features.apiAccess}
                      onCheckedChange={(checked: boolean) => handleSettingsChange('features', 'apiAccess', checked)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                    />
                    {orgSettings.features.apiAccess && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-amber-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-emerald-100 to-green-100 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">Advanced Reporting</Label>
                      <p className="text-sm text-slate-600">Custom reports and analytics</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Switch
                      checked={orgSettings.features.advancedReporting}
                      onCheckedChange={(checked: boolean) => handleSettingsChange('features', 'advancedReporting', checked)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                    />
                    {orgSettings.features.advancedReporting && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-amber-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg">
                      <Activity className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">Webhooks</Label>
                      <p className="text-sm text-slate-600">Real-time event notifications</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Switch
                      checked={orgSettings.features.webhooks}
                      onCheckedChange={(checked: boolean) => handleSettingsChange('features', 'webhooks', checked)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                    />
                    {orgSettings.features.webhooks && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Integrations
                </CardTitle>
                <CardDescription>Connect with external services and platforms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-purple-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">Slack Integration</Label>
                      <p className="text-sm text-slate-600">Notifications and updates</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Switch
                      checked={orgSettings.integrations.slack}
                      onCheckedChange={(checked: boolean) => handleSettingsChange('integrations', 'slack', checked)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                    />
                    {orgSettings.integrations.slack && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-blue-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">Google Workspace</Label>
                      <p className="text-sm text-slate-600">Calendar and email integration</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Switch
                      checked={orgSettings.integrations.gsuite}
                      onCheckedChange={(checked: boolean) => handleSettingsChange('integrations', 'gsuite', checked)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-500 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                    />
                    {orgSettings.integrations.gsuite && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-orange-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg">
                      <FileText className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">Microsoft 365</Label>
                      <p className="text-sm text-slate-600">Office suite integration</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Switch
                      checked={orgSettings.integrations.office365}
                      onCheckedChange={(checked: boolean) => handleSettingsChange('integrations', 'office365', checked)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                    />
                    {orgSettings.integrations.office365 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-emerald-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-emerald-100 to-green-100 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">Background Check Services</Label>
                      <p className="text-sm text-slate-600">Automated screening</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Switch
                      checked={orgSettings.integrations.background_check}
                      onCheckedChange={(checked: boolean) => handleSettingsChange('integrations', 'background_check', checked)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                    />
                    {orgSettings.integrations.background_check && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                Custom Branding
              </CardTitle>
              <CardDescription>Customize the look and feel of your recruitment platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company Logo</Label>
                    <div className="flex items-center space-x-4">
                      <img
                        src={orgSettings.branding.logo}
                        alt="Company Logo"
                        className="w-16 h-16 rounded border"
                      />
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={orgSettings.branding.primaryColor}
                        onChange={(e) => handleSettingsChange('branding', 'primaryColor', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={orgSettings.branding.primaryColor}
                        onChange={(e) => handleSettingsChange('branding', 'primaryColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">Secondary Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="secondary-color"
                        type="color"
                        value={orgSettings.branding.secondaryColor}
                        onChange={(e) => handleSettingsChange('branding', 'secondaryColor', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={orgSettings.branding.secondaryColor}
                        onChange={(e) => handleSettingsChange('branding', 'secondaryColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accent-color">Accent Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="accent-color"
                        type="color"
                        value={orgSettings.branding.accentColor}
                        onChange={(e) => handleSettingsChange('branding', 'accentColor', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={orgSettings.branding.accentColor}
                        onChange={(e) => handleSettingsChange('branding', 'accentColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Brand Preview</Label>
                    <Card className="p-4" style={{ backgroundColor: `${orgSettings.branding.primaryColor}10` }}>
                      <div className="flex items-center space-x-3 mb-4">
                        <div 
                          className="w-8 h-8 rounded"
                          style={{ backgroundColor: orgSettings.branding.primaryColor }}
                        ></div>
                        <div>
                          <h4 className="font-semibold" style={{ color: orgSettings.branding.primaryColor }}>
                            {orgSettings.general.name}
                          </h4>
                          <p className="text-sm" style={{ color: orgSettings.branding.secondaryColor }}>
                            Recruitment Platform
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        Sample Button
                      </Button>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-css">Custom CSS</Label>
                    <Textarea
                      id="custom-css"
                      placeholder="/* Add your custom CSS here */"
                      value={orgSettings.branding.customCss}
                      onChange={(e) => handleSettingsChange('branding', 'customCss', e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Data Protection
                </CardTitle>
                <CardDescription>Configure data protection and privacy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-emerald-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-emerald-100 to-green-100 rounded-lg">
                      <Globe className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">GDPR Compliance</Label>
                      <p className="text-sm text-slate-600">European data protection compliance</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Switch
                        checked={complianceSettings.gdprCompliant}
                        onCheckedChange={(checked: boolean) => handleComplianceChange('gdprCompliant', checked)}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                      />
                      {complianceSettings.gdprCompliant && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    {complianceSettings.gdprCompliant && (
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-blue-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                      <Shield className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">CCPA Compliance</Label>
                      <p className="text-sm text-slate-600">California privacy rights compliance</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Switch
                        checked={complianceSettings.ccpaCompliant}
                        onCheckedChange={(checked: boolean) => handleComplianceChange('ccpaCompliant', checked)}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-500 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                      />
                      {complianceSettings.ccpaCompliant && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    {complianceSettings.ccpaCompliant && (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data Retention Period (days)</Label>
                  <Input
                    type="number"
                    value={complianceSettings.dataRetentionDays}
                    onChange={(e) => handleNumberInputChange(e.target.value, (val) =>
                      handleComplianceChange('dataRetentionDays', val)
                    )}
                  />
                  <p className="text-xs text-black">
                    How long to retain candidate data after job closure
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-orange-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg">
                      <Globe className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">Cookie Consent</Label>
                      <p className="text-sm text-slate-600">Show cookie consent banner</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Switch
                      checked={complianceSettings.cookieConsent}
                      onCheckedChange={(checked: boolean) => handleComplianceChange('cookieConsent', checked)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                    />
                    {complianceSettings.cookieConsent && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Legal Documents
                </CardTitle>
                <CardDescription>Manage privacy policies and terms of service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Privacy Policy URL</Label>
                  <Input
                    value={complianceSettings.privacyPolicyUrl}
                    onChange={(e) => handleComplianceChange('privacyPolicyUrl', e.target.value)}
                    placeholder="https://yourcompany.com/privacy"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Terms of Service URL</Label>
                  <Input
                    value={complianceSettings.termsOfServiceUrl}
                    onChange={(e) => handleComplianceChange('termsOfServiceUrl', e.target.value)}
                    placeholder="https://yourcompany.com/terms"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-purple-200 hover:bg-white/90 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg">
                      <FileText className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <Label className="text-slate-800 font-semibold">Data Processing Agreement</Label>
                      <p className="text-sm text-slate-600">DPA signed and in place</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Switch
                        checked={complianceSettings.dataProcessingAgreement}
                        onCheckedChange={(checked: boolean) => handleComplianceChange('dataProcessingAgreement', checked)}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                      />
                      {complianceSettings.dataProcessingAgreement && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    {complianceSettings.dataProcessingAgreement && (
                      <CheckCircle className="h-5 w-5 text-purple-600" />
                    )}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900">Compliance Status</h4>
                      <p className="text-sm text-blue-700">
                        Your organization meets {
                          [complianceSettings.gdprCompliant, complianceSettings.ccpaCompliant, 
                           complianceSettings.dataProcessingAgreement].filter(Boolean).length
                        } of 3 major compliance requirements.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Prompt Tab */}
        <TabsContent value="ai-prompt" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  AI Implementation Management
                </CardTitle>
                <CardDescription>
                  Manage different AI implementations and their prompts. Select an implementation from the dropdown to view and edit its prompt.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Implementation Selector */}
                <div className="space-y-2">
                  <Label>AI Implementation</Label>
                  <Select
                    value={orgSettings.ai.selectedImplementation}
                    onValueChange={(value) => handleSettingsChange('ai', 'selectedImplementation', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI implementation" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                      {Object.entries(orgSettings.ai.implementations || {}).map(([key, impl]) => (
                        <SelectItem key={key} value={key} className="text-black hover:bg-gray-100">
                          {impl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600">
                    Select which AI implementation you want to view or edit. In the future, new AI features can be added here.
                  </p>
                </div>

                {/* Current Implementation Details */}
                {orgSettings.ai.selectedImplementation && orgSettings.ai.implementations?.[orgSettings.ai.selectedImplementation] && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-blue-600" />
                        <h4 className="font-medium text-blue-900">
                          {orgSettings.ai.implementations?.[orgSettings.ai.selectedImplementation]?.name}
                        </h4>
                      </div>
                      <p className="text-sm text-blue-700">
                        This prompt is sent to your AI provider ({orgSettings.general.aiProvider}) when using this implementation.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ai-prompt">System Prompt</Label>
                      <Textarea
                        id="ai-prompt"
                        rows={15}
                        className="font-mono text-sm"
                        placeholder="Enter your custom AI prompt here..."
                        value={orgSettings.ai.implementations?.[orgSettings.ai.selectedImplementation]?.prompt || ''}
                        onChange={(e) => {
                          const newImplementations = {
                            ...orgSettings.ai.implementations,
                            [orgSettings.ai.selectedImplementation]: {
                              ...orgSettings.ai.implementations?.[orgSettings.ai.selectedImplementation],
                              prompt: e.target.value
                            }
                          };
                          handleSettingsChange('ai', 'implementations', newImplementations);
                        }}
                      />
                      <p className="text-xs text-green-600 font-medium">
                        ✓ AI prompt is automatically saved when changed
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:border-blue-600"
                        onClick={() => {
                          const defaultPrompt = `You are an expert HR professional and job description writer. Create professional, engaging, and comprehensive job descriptions that attract qualified candidates.

Your task is to generate:
1. A detailed job description (3-4 paragraphs)
2. Comprehensive requirements list (both required and preferred qualifications)

Make the content:
- Professional yet engaging
- Specific to the role and industry
- Include relevant technologies and skills for the position
- Follow modern job posting best practices
- Be inclusive and welcoming

Format the response as JSON with two fields: "description" and "requirements".
For the requirements field, format it as a clean, readable text with sections like:
Required Qualifications:
• Item 1
• Item 2

Technical Skills:
• Skill 1
• Skill 2

Preferred Qualifications:
• Item 1
• Item 2

Make sure the requirements field contains properly formatted text, not JSON structure.`;

                          const newImplementations = {
                            ...orgSettings.ai.implementations,
                            [orgSettings.ai.selectedImplementation]: {
                              ...orgSettings.ai.implementations?.[orgSettings.ai.selectedImplementation],
                              prompt: defaultPrompt
                            }
                          };
                          handleSettingsChange('ai', 'implementations', newImplementations);
                          toast({
                            title: "Prompt Reset",
                            description: "AI prompt has been reset to default.",
                            variant: "default"
                          })
                        }}
                      >
                        Reset to Default
                      </Button>

                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={isLoading}
                        onClick={() => {
                          handleSaveSettings()
                          toast({
                            title: "AI Prompt Updated",
                            description: "Your custom prompt will now be used for API calls to your AI provider",
                            variant: "default"
                          })
                        }}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? 'Saving...' : 'Save & Update API'}
                      </Button>

                      {/* Retell AI specific buttons */}
                      {orgSettings.ai.selectedImplementation === 'retellAgent' && (
                        <>
                          <Button
                            variant="outline"
                            className="border-purple-500 text-purple-600 hover:bg-purple-50"
                            onClick={async () => {
                              try {
                                const response = await fetch('http://localhost:8000/api/retell/agent/prompt/')
                                if (!response.ok) throw new Error('Failed to fetch from Retell API')

                                const data = await response.json()
                                const newImplementations = {
                                  ...orgSettings.ai.implementations,
                                  retellAgent: {
                                    ...orgSettings.ai.implementations.retellAgent,
                                    prompt: data.general_prompt || ''
                                  }
                                }
                                handleSettingsChange('ai', 'implementations', newImplementations)
                                toast({
                                  title: "Fetched from Retell",
                                  description: "Current prompt loaded from Retell AI agent",
                                  variant: "default"
                                })
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to fetch prompt from Retell API",
                                  variant: "destructive"
                                })
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Fetch from Retell
                          </Button>

                          <Button
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={async () => {
                              try {
                                const response = await fetch('http://localhost:8000/api/retell/agent/prompt/update/', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    general_prompt: orgSettings.ai.implementations.retellAgent?.prompt
                                  })
                                })
                                if (!response.ok) throw new Error('Failed to update Retell agent')

                                toast({
                                  title: "Updated Retell Agent",
                                  description: "Prompt has been updated in Retell AI",
                                  variant: "default"
                                })
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to update Retell agent prompt",
                                  variant: "destructive"
                                })
                              }
                            }}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Save to Retell
                          </Button>
                        </>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => {
                          const newKey = `implementation_${Date.now()}`;
                          const newImplementations = {
                            ...orgSettings.ai.implementations,
                            [newKey]: {
                              name: "New AI Implementation",
                              prompt: "Enter your AI prompt here..."
                            }
                          };
                          handleSettingsChange('ai', 'implementations', newImplementations);
                          handleSettingsChange('ai', 'selectedImplementation', newKey);
                          toast({
                            title: "New Implementation Created",
                            description: "A new AI implementation has been added.",
                            variant: "default"
                          })
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Implementation
                      </Button>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <div className="text-blue-600 mt-0.5">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">How it works:</p>
                          <ul className="space-y-1 text-xs">
                            <li>• Select an implementation from the dropdown to view/edit its prompt</li>
                            <li>• Each implementation can have its own specialized prompt</li>
                            <li>• Future AI features (like resume screening, candidate matching) can be added here</li>
                            <li>• Changes take effect immediately for the selected implementation</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Interview Rounds Tab */}
        <TabsContent value="interview-rounds" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Interview Rounds & Flows</h3>
                <p className="text-sm text-black">Customize interview processes and round configurations for different roles</p>
              </div>
              <Button onClick={openCreateFlowModal}>
                <Plus className="h-4 w-4 mr-2" />
                Create Interview Flow
              </Button>
            </div>

            {/* Flow Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Total Flows</p>
                      <p className="text-lg font-bold">{interviewFlows.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Active Flows</p>
                      <p className="text-lg font-bold">{interviewFlows.filter(f => f.isDefault || f.jobTypes.length > 0).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium">Total Rounds</p>
                      <p className="text-lg font-bold">{interviewFlows.reduce((sum, flow) => sum + flow.rounds.length, 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium">Avg Duration</p>
                      <p className="text-2xl font-bold">{Math.round(interviewFlows.reduce((sum, flow) => sum + flow.totalEstimatedTime, 0) / interviewFlows.length)}m</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Interview Flows List */}
            <div className="space-y-4">
              {isLoadingFlows ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-black mt-2">Loading interview flows...</p>
                  </div>
                </div>
              ) : interviewFlows.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-black">No interview flows found. Create your first flow!</p>
                </div>
              ) : (
                interviewFlows.map((flow) => (
                <Card key={flow.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold">{flow.name}</h4>
                            {flow.isDefault && (
                              <Badge className="bg-blue-50 text-blue-700">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-black mt-1">{flow.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-black">
                            <span>{flow.rounds.length} rounds</span>
                            <span>•</span>
                            <span>{flow.totalEstimatedTime} min total</span>
                            <span>•</span>
                            <span>{flow.jobTypes.length} job types</span>
                            <span>•</span>
                            <span>Modified {flow.lastModified}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditFlowModal(flow)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        {!flow.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteFlow(flow.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Job Types */}
                      <div>
                        <Label className="text-xs font-medium text-black">APPLICABLE JOB TYPES</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {flow.jobTypes.map((jobType, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {jobType}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Interview Rounds Flow */}
                      <div>
                        <Label className="text-xs font-medium text-black">INTERVIEW ROUNDS</Label>
                        <div className="flex items-center space-x-2 mt-2 overflow-x-auto pb-2">
                          {flow.rounds
                            .sort((a, b) => a.order - b.order)
                            .map((round, index) => {
                              const getRoundIcon = (type: string) => {
                                switch (type) {
                                  case 'telephonic': return PhoneCall
                                  case 'video': return Video
                                  case 'technical': return Monitor
                                  case 'hr': return User2
                                  case 'panel': return Users
                                  case 'assignment': return FileText
                                  case 'onsite': return Building2
                                  case 'cultural': return MessageSquare
                                  default: return Calendar
                                }
                              }
                              
                              const RoundIcon = getRoundIcon(round.type)
                              
                              return (
                                <div key={round.id} className="flex items-center space-x-2">
                                  <div className="flex flex-col items-center min-w-0">
                                    <div className={`
                                      flex items-center justify-center w-12 h-12 rounded-full border-2 
                                      ${round.isRequired 
                                        ? 'bg-blue-50 border-blue-200 text-blue-600' 
                                        : 'bg-gray-50 border-gray-200 text-black'
                                      }
                                    `}>
                                      <RoundIcon className="h-5 w-5" />
                                    </div>
                                    <div className="text-center mt-1">
                                      <p className="text-xs font-medium truncate max-w-20">{round.name}</p>
                                      <p className="text-xs text-black">{round.duration}m</p>
                                    </div>
                                  </div>
                                  {index < flow.rounds.length - 1 && (
                                    <ArrowRight className="h-4 w-4 text-black flex-shrink-0" />
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))
              )}
            </div>

            {/* Round Type Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  Round Type Templates
                </CardTitle>
                <CardDescription>Pre-configured round types you can add to your interview flows</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      type: 'telephonic',
                      name: 'Telephonic Round',
                      description: 'Phone screening with basic questions',
                      icon: PhoneCall,
                      duration: '15-30 min',
                      color: 'text-green-600'
                    },
                    {
                      type: 'video',
                      name: 'Video Interview',
                      description: 'Face-to-face video conversation',
                      icon: Video,
                      duration: '30-60 min',
                      color: 'text-blue-600'
                    },
                    {
                      type: 'technical',
                      name: 'Technical Assessment',
                      description: 'Coding and technical evaluation',
                      icon: Monitor,
                      duration: '60-120 min',
                      color: 'text-purple-600'
                    },
                    {
                      type: 'hr',
                      name: 'HR Round',
                      description: 'Culture fit and final discussion',
                      icon: User2,
                      duration: '30-45 min',
                      color: 'text-orange-600'
                    },
                    {
                      type: 'panel',
                      name: 'Panel Interview',
                      description: 'Multiple interviewers assessment',
                      icon: Users,
                      duration: '45-90 min',
                      color: 'text-red-600'
                    },
                    {
                      type: 'assignment',
                      name: 'Take-home Assignment',
                      description: 'Project or coding assignment',
                      icon: FileText,
                      duration: '2-8 hours',
                      color: 'text-indigo-600'
                    },
                    {
                      type: 'onsite',
                      name: 'Onsite Interview',
                      description: 'In-person office visit',
                      icon: Building2,
                      duration: '2-4 hours',
                      color: 'text-cyan-600'
                    },
                    {
                      type: 'cultural',
                      name: 'Cultural Fit',
                      description: 'Team and culture assessment',
                      icon: MessageSquare,
                      duration: '30-45 min',
                      color: 'text-pink-600'
                    }
                  ].map((template, index) => (
                    <Card key={index} className="border-dashed hover:border-solid hover:shadow-md transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <template.icon className={`h-5 w-5 ${template.color} mt-0.5`} />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{template.name}</h4>
                            <p className="text-xs text-black mt-1">{template.description}</p>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {template.duration}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>

      {/* Role Modal */}
      <Dialog open={isRoleModalOpen} onOpenChange={closeRoleModal} modal>
        <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-[90vw] overflow-y-auto scroll-smooth bg-white border border-gray-200 shadow-2xl m-1 sm:m-2" style={{scrollbarWidth: 'thin', scrollbarColor: '#CBD5E0 #F7FAFC'}}>
          <DialogHeader className="border-b border-gray-100 pb-3 px-6 pt-4">
            <DialogTitle className="text-xl font-semibold text-black">
              {isEditingRole ? `Edit Role: ${selectedRole?.name}` : 'Create Custom Role'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role Name</Label>
                <Input 
                  value={isEditingRole ? selectedRole?.name || '' : newRole.name}
                  onChange={(e) => {
                    if (isEditingRole && selectedRole) {
                      setSelectedRole({ ...selectedRole, name: e.target.value })
                    } else {
                      setNewRole(prev => ({ ...prev, name: e.target.value }))
                    }
                  }}
                  readOnly={Boolean(isEditingRole && selectedRole && !selectedRole.isCustom)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role Level</Label>
                <Select 
                  value={isEditingRole ? selectedRole?.level || 'user' : newRole.level}
                  onValueChange={(value: 'admin' | 'manager' | 'user' | 'viewer') => {
                    if (isEditingRole && selectedRole) {
                      setSelectedRole({ ...selectedRole, level: value })
                    } else {
                      setNewRole(prev => ({ ...prev, level: value }))
                    }
                  }}
                  disabled={Boolean(isEditingRole && selectedRole && !selectedRole.isCustom)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                    <SelectItem value="admin" className="text-black hover:bg-gray-100">Admin</SelectItem>
                    <SelectItem value="manager" className="text-black hover:bg-gray-100">Manager</SelectItem>
                    <SelectItem value="user" className="text-black hover:bg-gray-100">User</SelectItem>
                    <SelectItem value="viewer" className="text-black hover:bg-gray-100">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={isEditingRole ? selectedRole?.description || '' : newRole.description}
                onChange={(e) => {
                  if (isEditingRole && selectedRole) {
                    setSelectedRole({ ...selectedRole, description: e.target.value })
                  } else {
                    setNewRole(prev => ({ ...prev, description: e.target.value }))
                  }
                }}
                readOnly={Boolean(isEditingRole && selectedRole && !selectedRole.isCustom)}
                rows={2}
              />
            </div>

            <div>
              <h4 className="font-semibold mb-4">Permissions</h4>
              <div className="space-y-6">
                {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                  <div key={category} className="space-y-3">
                    <h5 className="font-medium capitalize text-sm">
                      {category.replace('_', ' ')} Permissions
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {permissions.map((permission) => {
                        const isChecked = isEditingRole 
                          ? selectedRole?.permissions.some(p => p.id === permission.id) || false
                          : newRole.permissions.some(p => p.id === permission.id)
                        
                        return (
                          <div key={permission.id} className="flex items-center space-x-3 p-3 border rounded">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                if (isEditingRole && selectedRole) {
                                  handlePermissionToggle(selectedRole.id, permission.id, !!checked)
                                } else {
                                  handleNewRolePermissionToggle(permission.id, !!checked)
                                }
                              }}
                              disabled={Boolean(isEditingRole && selectedRole && !selectedRole.isCustom)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">{permission.name}</span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getPermissionBadgeColor(permission.level)}`}
                                >
                                  {permission.level}
                                </Badge>
                              </div>
                              <p className="text-xs text-black">{permission.description}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 px-6 pb-4 bg-white">
              <Button 
                variant="outline" 
                onClick={closeRoleModal}
                className="px-6 py-2.5 border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 hover:text-red-700 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Cancel
              </Button>
              <Button 
                onClick={isEditingRole ? handleUpdateRole : handleCreateRole}
                disabled={isEditingRole ? Boolean(selectedRole && !selectedRole.isCustom) : !newRole.name.trim()}
                className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isEditingRole ? 'Update Role' : 'Create Role'}
              </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Interview Flow Modal */}
      <Dialog open={isFlowModalOpen} onOpenChange={closeFlowModal} modal>
        <DialogContent className="max-w-7xl max-h-[90vh] w-[98vw] sm:w-[95vw] overflow-y-auto scroll-smooth bg-gradient-to-br from-slate-50 via-white to-blue-50 border-0 shadow-2xl rounded-2xl m-1 sm:m-2 p-0" style={{scrollbarWidth: 'thin', scrollbarColor: '#CBD5E0 #F7FAFC'}}>
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-2xl">
            <DialogTitle className="text-2xl font-bold flex items-center">
              <Calendar className="h-6 w-6 mr-3" />
              {isEditingFlow ? `Edit Flow: ${selectedFlow?.name}` : 'Create Interview Flow'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 px-6 py-4">
            {/* Basic Flow Information */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-black mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Flow Information
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-black uppercase tracking-wide">Flow Name *</Label>
                  <Input
                    className="border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-lg h-12 text-base font-medium transition-all duration-200 shadow-sm"
                    value={isEditingFlow ? selectedFlow?.name || '' : newFlow.name || ''}
                    onChange={(e) => {
                      if (isEditingFlow && selectedFlow) {
                        setSelectedFlow({ ...selectedFlow, name: e.target.value })
                      } else {
                        setNewFlow(prev => ({ ...prev, name: e.target.value }))
                      }
                    }}
                    placeholder="e.g., Technical Interview Flow"
                  />
              </div>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-black uppercase tracking-wide">Default Flow</Label>
                  <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                        <Star className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <Label className="text-slate-800 font-semibold">Set as Default Flow</Label>
                        <p className="text-sm text-slate-600">This flow will be used for new jobs</p>
                      </div>
                    </div>
                    <div className="relative ml-auto">
                      <Switch
                        checked={isEditingFlow ? selectedFlow?.isDefault || false : newFlow.isDefault || false}
                        onCheckedChange={(checked) => {
                          if (isEditingFlow && selectedFlow) {
                            setSelectedFlow({ ...selectedFlow, isDefault: checked })
                          } else {
                            setNewFlow(prev => ({ ...prev, isDefault: checked }))
                          }
                        }}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-500 data-[state=unchecked]:bg-gray-300 scale-110 shadow-lg"
                      />
                      {(isEditingFlow ? selectedFlow?.isDefault : newFlow.isDefault) && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-black">Use as default for new jobs</span>
                      <p className="text-xs text-black mt-1">This flow will be automatically selected when creating new job postings</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              <div className="col-span-1 lg:col-span-2 space-y-3">
                <Label className="text-sm font-semibold text-black uppercase tracking-wide">Description</Label>
                <Textarea
                  className="border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-lg text-base resize-none transition-all duration-200 shadow-sm"
                  value={isEditingFlow ? selectedFlow?.description || '' : newFlow.description || ''}
                  onChange={(e) => {
                    if (isEditingFlow && selectedFlow) {
                      setSelectedFlow({ ...selectedFlow, description: e.target.value })
                    } else {
                      setNewFlow(prev => ({ ...prev, description: e.target.value }))
                    }
                  }}
                  placeholder="Describe this interview flow and its purpose..."
                  rows={3}
                />
              </div>
            </div>

            {/* Job Types */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-black mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Job Types
              </h3>
              <Label className="text-sm font-bold text-black uppercase tracking-wide mb-4 block">APPLICABLE JOB TYPES</Label>
              <div className="flex flex-wrap gap-3">
                {['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer', 'Data Scientist', 'Product Manager', 'Designer', 'QA Engineer', 'Engineering Manager'].map((jobType) => {
                  const isSelected = isEditingFlow 
                    ? selectedFlow?.jobTypes.includes(jobType) || false
                    : newFlow.jobTypes?.includes(jobType) || false
                  
                  return (
                    <Badge
                      key={jobType}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (isEditingFlow && selectedFlow) {
                          const newJobTypes = isSelected
                            ? selectedFlow.jobTypes.filter(jt => jt !== jobType)
                            : [...selectedFlow.jobTypes, jobType]
                          setSelectedFlow({ ...selectedFlow, jobTypes: newJobTypes })
                        } else {
                          const currentJobTypes = newFlow.jobTypes || []
                          const newJobTypes = isSelected
                            ? currentJobTypes.filter(jt => jt !== jobType)
                            : [...currentJobTypes, jobType]
                          setNewFlow(prev => ({ ...prev, jobTypes: newJobTypes }))
                        }
                      }}
                    >
                      {jobType}
                    </Badge>
                  )
                })}
              </div>
            </div>

            {/* Interview Rounds */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-black flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-600" />
                  Interview Rounds
                </h3>
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-2 rounded-full border border-green-200">
                  <span className="text-sm font-semibold text-green-700">
                    Total: {
                      isEditingFlow 
                        ? selectedFlow?.rounds.reduce((sum, round) => sum + round.duration, 0) || 0
                        : newFlow.rounds?.reduce((sum, round) => sum + round.duration, 0) || 0
                    } minutes
                  </span>
                </div>
              </div>

              {/* Current Rounds */}
              <div className="space-y-3">
                {(isEditingFlow ? selectedFlow?.rounds || [] : newFlow.rounds || [])
                  .sort((a, b) => a.order - b.order)
                  .map((round, index) => {
                    const getRoundIcon = (type: string) => {
                      switch (type) {
                        case 'telephonic': return PhoneCall
                        case 'video': return Video
                        case 'technical': return Monitor
                        case 'hr': return User2
                        case 'panel': return Users
                        case 'assignment': return FileText
                        case 'onsite': return Building2
                        case 'cultural': return MessageSquare
                        default: return Calendar
                      }
                    }
                    
                    const RoundIcon = getRoundIcon(round.type)
                    const rounds = isEditingFlow ? selectedFlow?.rounds || [] : newFlow.rounds || []
                    
                    return (
                      <div
                        key={`${round.id}-${round.order}`}
                        className="group flex items-center justify-between p-5 border-2 border-gray-200 rounded-xl bg-gradient-to-r from-white to-gray-50 hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all duration-300 shadow-md hover:shadow-lg"
                        draggable={true}
                        onDragStart={(e) => {
                          setDraggedRound(round.id)
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/html', round.id)
                        }}
                        onDragEnd={() => setDraggedRound(null)}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          const draggedId = draggedRound
                          const targetId = round.id
                          if (draggedId && draggedId !== targetId) {
                            // Reorder the rounds
                            const rounds = isEditingFlow ? selectedFlow?.rounds || [] : newFlow.rounds || []
                            const draggedIndex = rounds.findIndex(r => r.id === draggedId)
                            const targetIndex = rounds.findIndex(r => r.id === targetId)

                            if (draggedIndex !== -1 && targetIndex !== -1) {
                              const reorderedRounds = [...rounds]
                              const [draggedRound] = reorderedRounds.splice(draggedIndex, 1)
                              reorderedRounds.splice(targetIndex, 0, draggedRound)

                              // Update order properties with new objects to trigger re-render
                              const updatedRounds = reorderedRounds.map((round, index) => ({
                                ...round,
                                order: index + 1
                              }))

                              if (isEditingFlow && selectedFlow) {
                                setSelectedFlow({ ...selectedFlow, rounds: updatedRounds })
                              } else {
                                setNewFlow(prev => ({ ...prev, rounds: updatedRounds }))
                              }
                            }
                          }
                        }}
                        style={{
                          opacity: draggedRound === round.id ? 0.5 : 1,
                          cursor: 'grab'
                        }}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <GripVertical className="h-4 w-4 text-gray-400 cursor-grab active:cursor-grabbing" />
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg group-hover:shadow-xl transition-all duration-300">
                              <RoundIcon className="h-5 w-5" />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-black text-base">{round.name}</h4>
                              <Badge variant="outline" className="text-xs font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-300 rounded-full px-3 py-1">
                                {round.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs font-medium bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-300 rounded-full px-3 py-1">
                                {round.duration}m
                              </Badge>
                              {round.isRequired && (
                                <Badge className="text-xs font-medium bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 rounded-full px-3 py-1 shadow-sm">
                                  Required
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-black">{round.description}</p>

                            {/* Interview Type and Feedback Form Dropdowns */}
                            <div className="flex items-center space-x-4 mt-3">
                              <div className="flex items-center space-x-2">
                                <label className="text-xs font-medium text-gray-600">Interview Type:</label>
                                <select
                                  value={round.interviewType || 'Human Only'}
                                  onChange={(e) => updateRoundInterviewType(round.id, e.target.value as 'AI Assisted' | 'Human Only' | 'Hybrid')}
                                  className="text-xs border border-gray-300 rounded px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors min-w-[120px]"
                                >
                                  <option value="AI Assisted" className="text-black bg-white">AI Assisted</option>
                                  <option value="Human Only" className="text-black bg-white">Human Only</option>
                                  <option value="Hybrid" className="text-black bg-white">Hybrid</option>
                                </select>
                              </div>
                              <div className="flex items-center space-x-2">
                                <label className="text-xs font-medium text-gray-600">Feedback:</label>
                                <div className="flex items-center space-x-2">
                                  <select
                                    value={round.feedbackFormId || ''}
                                    onChange={(e) => updateRoundFeedbackForm(round.id, e.target.value)}
                                    className="text-xs border border-gray-300 rounded px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors min-w-[140px]"
                                  >
                                    <option value="" className="text-black bg-white">Select Feedback Form</option>
                                    {feedbackForms.map((form) => (
                                      <option key={form.id} value={form.id.toString()} className="text-black bg-white">
                                        {form.name}
                                      </option>
                                    ))}
                                  </select>
                                  {round.feedbackFormId && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs px-2 py-1 h-8 bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                                      onClick={() => previewFeedbackForm(round.feedbackFormId!)}
                                    >
                                      Preview
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveRound(round.id, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveRound(round.id, 'down')}
                            disabled={index === rounds.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => removeRoundFromFlow(round.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* Add Round Templates */}
              <div className="mt-8">
                <h4 className="text-base font-semibold text-black mb-4 flex items-center">
                  <Plus className="h-4 w-4 mr-2 text-blue-600" />
                  Add New Round
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      name: 'Telephonic Round',
                      type: 'telephonic',
                      description: 'Phone screening with basic questions',
                      icon: PhoneCall,
                      duration: '15-30',
                      color: 'text-green-600'
                    },
                    {
                      name: 'Video Interview',
                      type: 'video',
                      description: 'Face-to-face video conversation',
                      icon: Video,
                      duration: '30-60',
                      color: 'text-blue-600'
                    },
                    {
                      name: 'Technical Assessment',
                      type: 'technical',
                      description: 'Coding and technical evaluation',
                      icon: Monitor,
                      duration: '60-120',
                      color: 'text-purple-600'
                    },
                    {
                      name: 'HR Round',
                      type: 'hr',
                      description: 'Culture fit and final discussion',
                      icon: User2,
                      duration: '30-45',
                      color: 'text-orange-600'
                    },
                    {
                      name: 'Panel Interview',
                      type: 'panel',
                      description: 'Multiple interviewers assessment',
                      icon: Users,
                      duration: '45-90',
                      color: 'text-red-600'
                    },
                    {
                      name: 'Assignment',
                      type: 'assignment',
                      description: 'Take-home project or coding task',
                      icon: FileText,
                      duration: '120-480',
                      color: 'text-indigo-600'
                    },
                    {
                      name: 'Onsite Interview',
                      type: 'onsite',
                      description: 'In-person office visit',
                      icon: Building2,
                      duration: '120-240',
                      color: 'text-cyan-600'
                    },
                    {
                      name: 'Cultural Fit',
                      type: 'cultural',
                      description: 'Team and culture assessment',
                      icon: MessageSquare,
                      duration: '30-45',
                      color: 'text-pink-600'
                    }
                  ].map((template) => (
                    <Card 
                      key={template.type} 
                      className="group border-2 border-dashed border-gray-300 hover:border-solid hover:border-blue-500 hover:shadow-xl transition-all duration-300 cursor-pointer bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transform hover:scale-105 rounded-xl"
                      onClick={() => addRoundToFlow(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className="p-3 rounded-full bg-gray-100 group-hover:bg-blue-100 transition-colors duration-300">
                            <template.icon className={`h-6 w-6 ${template.color} group-hover:scale-110 transition-transform duration-300`} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-black group-hover:text-blue-700">{template.name}</p>
                            <p className="text-xs text-black mt-1">{template.duration}m</p>
                          </div>
                          <Plus className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

          {/* Modal Actions - At bottom */}
          <div className="bg-white border-t border-gray-200 p-4 rounded-b-2xl">
            <div className="flex justify-between items-center">
              <div className="text-sm text-black">
                {isEditingFlow ? 'Modify your interview flow' : 'Create a new interview process'}
              </div>
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={closeFlowModal}
                  className="px-6 py-3 border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 hover:text-red-700 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={isEditingFlow ? handleUpdateFlow : handleCreateFlow}
                  disabled={isEditingFlow ? !selectedFlow?.name?.trim() : !newFlow.name?.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  {isEditingFlow ? 'Update Flow' : 'Create Flow'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Form Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen} modal>
        <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-[90vw] overflow-y-auto bg-white border border-gray-200 shadow-2xl">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-xl font-semibold text-black flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              {previewFeedbackData?.name || 'Feedback Form Preview'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            {previewFeedbackData ? (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Form Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Name:</span>
                      <span className="ml-2 text-black">{previewFeedbackData.name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Status:</span>
                      <span className="ml-2 text-black capitalize">{previewFeedbackData.status}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-gray-600">Description:</span>
                      <span className="ml-2 text-black">{previewFeedbackData.description || 'No description available'}</span>
                    </div>
                  </div>
                </div>

                {previewFeedbackData.questions && previewFeedbackData.questions.length > 0 ? (
                  <div>
                    <h3 className="font-medium text-black mb-4">Questions ({previewFeedbackData.questions.length})</h3>
                    <div className="space-y-4">
                      {previewFeedbackData.questions.map((question: any, index: number) => (
                        <div key={question.id || index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-black mb-2">
                                {index + 1}. {question.question_text || question.text}
                              </p>
                              <div className="text-xs text-gray-600 space-x-4">
                                <span>Type: <span className="capitalize">{question.question_type || question.type}</span></span>
                                {question.is_required && <span className="text-red-600">Required</span>}
                              </div>
                              {(question.options || question.choices) && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-600 mb-1">Options:</p>
                                  <ul className="text-xs text-gray-700 ml-4">
                                    {(question.options || question.choices).map((option: any, optIndex: number) => (
                                      <li key={optIndex} className="list-disc">
                                        {typeof option === 'string' ? option : option.text || option.value}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No questions available in this form</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Loading feedback form...</p>
              </div>
            )}
          </div>
          <div className="flex justify-end p-6 border-t border-gray-100">
            <Button
              onClick={() => setIsPreviewModalOpen(false)}
              className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </div>
  )
}