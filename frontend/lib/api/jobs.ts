import { apiClient } from './client';

export interface Department {
  id: number;
  name: string;
  description?: string;
  organization: number;
}

export interface Job {
  id: number;
  title: string;
  slug: string;
  department: number;
  department_details?: Department;
  description: string;
  requirements: string;
  responsibilities?: string;
  job_type: 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance';
  experience_level: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  location: string;
  work_type: 'remote' | 'onsite' | 'hybrid';
  is_remote: boolean;
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  show_salary: boolean;
  required_skills: string[];
  preferred_skills: string[];
  status: 'draft' | 'open' | 'on_hold' | 'closed' | 'cancelled';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  openings: number;
  target_hire_date?: string;
  sla_days: number;
  days_open: number;
  is_overdue: boolean;
  applications_count: number;
  candidates_by_stage: Record<string, number>;
  posted_date?: string;
  screening_questions: Array<{
    id: number;
    question: string;
    type: string;
    required?: boolean;
  }>;
  feedback_template?: number;
  publish_internal: boolean;
  publish_external: boolean;
  publish_company_website: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobListItem {
  id: number;
  title: string;
  department_name: string;
  location: string;
  job_type: string;
  status: string;
  urgency: string;
  openings: number;
  posted_date?: string;
  days_open: number;
  applications_count: number;
  created_at: string;
}

export interface JobCreateData {
  title: string;
  department: number;
  description: string;
  requirements: string;
  responsibilities?: string;
  job_type: string;
  experience_level: string;
  location: string;
  work_type: string;
  is_remote: boolean;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  show_salary?: boolean;
  required_skills?: string[];
  preferred_skills?: string[];
  urgency?: string;
  openings?: number;
  target_hire_date?: string;
  sla_days?: number;
  hiring_manager?: number;
  recruiters?: number[];
  screening_questions?: Array<{
    id: number;
    question: string;
    type: string;
    required?: boolean;
  }>;
  feedback_template?: number;
  publish_internal?: boolean;
  publish_external?: boolean;
  publish_company_website?: boolean;
}

export interface JobFilters {
  status?: string;
  department?: number;
  job_type?: string;
  experience_level?: string;
  urgency?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// Jobs API
export async function getJobs(filters?: JobFilters): Promise<PaginatedResponse<JobListItem>> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
  }
  
  const query = params.toString();
  return apiClient.get<PaginatedResponse<JobListItem>>(`/jobs/${query ? `?${query}` : ''}`);
}

export async function getJob(id: number): Promise<Job> {
  return apiClient.get<Job>(`/jobs/${id}/`);
}

export async function createJob(data: JobCreateData): Promise<Job> {
  return apiClient.post<Job>('/jobs/', data);
}

export async function updateJob(id: number, data: Partial<JobCreateData>): Promise<Job> {
  return apiClient.patch<Job>(`/jobs/${id}/`, data);
}

export async function publishJob(id: number): Promise<void> {
  await apiClient.post(`/jobs/${id}/publish/`);
}

export async function closeJob(id: number): Promise<void> {
  await apiClient.post(`/jobs/${id}/close/`);
}

export async function getJobCandidates(id: number): Promise<Record<string, any[]>> {
  return apiClient.get<Record<string, any[]>>(`/jobs/${id}/candidates/`);
}

export async function getJobAnalytics(id: number): Promise<any> {
  return apiClient.get<any>(`/jobs/${id}/analytics/`);
}

// Departments API
export async function getDepartments(): Promise<PaginatedResponse<Department>> {
  return apiClient.get<PaginatedResponse<Department>>('/departments/');
}

export async function createDepartment(data: {
  name: string;
  description?: string;
}): Promise<Department> {
  return apiClient.post<Department>('/departments/', data);
}

// JD Upload/Parse API
export interface ParsedJD {
  description: string;
  requirements: string;
  responsibilities: string;
  raw_content: string;
}

export async function parseJD(file: File): Promise<ParsedJD> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.uploadFile<ParsedJD>('/jobs/parse_jd/', formData);
}

// AI Job Generation API
export interface GenerateJDRequest {
  title: string;
  department?: string;
  level?: string;
  location?: string;
  work_type?: string;
  company_info?: string;
}

export interface GeneratedJD {
  description: string;
  responsibilities: string;
  requirements: string;
}

export interface GenerateJDResponse {
  success: boolean;
  data: GeneratedJD;
  ai_generated: boolean;
}

export async function generateJD(data: GenerateJDRequest): Promise<GenerateJDResponse> {
  return apiClient.post<GenerateJDResponse>('/jobs/generate_jd/', data);
}