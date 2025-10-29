// Dashboard API types and functions

const API_BASE_URL = 'http://localhost:8000/api'

export interface BusinessMetrics {
  active_jobs: number
  active_jobs_change: number
  time_to_fill: number
  time_to_fill_change: number
  offer_rate: number
  offer_rate_change: number
  cost_per_hire: number
  cost_per_hire_change: number
}

export interface CandidatesByStage {
  applied?: number
  screening?: number
  technical?: number
  offer?: number
  hired?: number
}

export interface JobAnalytics {
  id: number
  title: string
  department_name: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  applications_count: number
  candidates_by_stage: CandidatesByStage
  days_open: number
  sla_days: number
  next_action: string
}

export interface NextAction {
  id: number
  title: string
  candidate: string
  job: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  action: string
  due_date?: string
}

export interface PerformingSource {
  id: number
  source_name: string
  hires_made: number
  cost_per_hire: number
  conversion_rate: number
}

// API functions
export async function getDashboardMetrics(): Promise<BusinessMetrics> {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/metrics/`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.log('Error fetching dashboard metrics, using mock data:', error)
    // Mock data for development
    return {
      active_jobs: 24,
      active_jobs_change: 12,
      time_to_fill: 18,
      time_to_fill_change: -2,
      offer_rate: 85,
      offer_rate_change: 5,
      cost_per_hire: 3500,
      cost_per_hire_change: -300
    }
  }
}

export async function getJobsAnalytics(): Promise<JobAnalytics[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/jobs-analytics/`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return Array.isArray(data) ? data : data.results || []
  } catch (error) {
    console.log('Error fetching jobs analytics, using mock data:', error)
    // Mock data for development
    return [
      {
        id: 1,
        title: 'Senior Full Stack Developer',
        department_name: 'Engineering',
        urgency: 'critical',
        applications_count: 47,
        candidates_by_stage: {
          applied: 12,
          screening: 8,
          technical: 4,
          offer: 2,
          hired: 1
        },
        days_open: 35,
        sla_days: 30,
        next_action: 'Schedule technical interviews'
      },
      {
        id: 2,
        title: 'Product Manager',
        department_name: 'Product',
        urgency: 'high',
        applications_count: 32,
        candidates_by_stage: {
          applied: 8,
          screening: 6,
          technical: 3,
          offer: 1,
          hired: 0
        },
        days_open: 22,
        sla_days: 25,
        next_action: 'Review screening results'
      },
      {
        id: 3,
        title: 'UX Designer',
        department_name: 'Design',
        urgency: 'medium',
        applications_count: 18,
        candidates_by_stage: {
          applied: 5,
          screening: 4,
          technical: 2,
          offer: 0,
          hired: 0
        },
        days_open: 15,
        sla_days: 20,
        next_action: 'Portfolio review pending'
      },
      {
        id: 4,
        title: 'DevOps Engineer',
        department_name: 'Engineering',
        urgency: 'high',
        applications_count: 29,
        candidates_by_stage: {
          applied: 10,
          screening: 5,
          technical: 3,
          offer: 1,
          hired: 0
        },
        days_open: 28,
        sla_days: 30,
        next_action: 'Technical assessment review'
      },
      {
        id: 5,
        title: 'Marketing Manager',
        department_name: 'Marketing',
        urgency: 'medium',
        applications_count: 25,
        candidates_by_stage: {
          applied: 7,
          screening: 6,
          technical: 2,
          offer: 0,
          hired: 0
        },
        days_open: 18,
        sla_days: 25,
        next_action: 'Schedule final interviews'
      }
    ]
  }
}

export async function getNextActions(): Promise<NextAction[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/next-actions/`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return Array.isArray(data) ? data : data.results || []
  } catch (error) {
    console.log('Error fetching next actions, using mock data:', error)
    // Mock data for development
    return [
      {
        id: 1,
        title: 'Technical Interview',
        candidate: 'Sarah Chen',
        job: 'Senior Full Stack Developer',
        priority: 'critical',
        action: 'Schedule',
        due_date: new Date(Date.now() + 86400000).toISOString() // Tomorrow
      },
      {
        id: 2,
        title: 'Reference Check',
        candidate: 'Mike Rodriguez',
        job: 'Product Manager',
        priority: 'high',
        action: 'Complete',
        due_date: new Date(Date.now() + 172800000).toISOString() // Day after tomorrow
      },
      {
        id: 3,
        title: 'Portfolio Review',
        candidate: 'Emily Watson',
        job: 'UX Designer',
        priority: 'medium',
        action: 'Review',
        due_date: new Date(Date.now() + 259200000).toISOString() // 3 days
      },
      {
        id: 4,
        title: 'Final Interview',
        candidate: 'Alex Kumar',
        job: 'DevOps Engineer',
        priority: 'high',
        action: 'Schedule',
        due_date: new Date(Date.now() + 345600000).toISOString() // 4 days
      },
      {
        id: 5,
        title: 'Offer Review',
        candidate: 'Jessica Liu',
        job: 'Marketing Manager',
        priority: 'medium',
        action: 'Prepare',
        due_date: new Date(Date.now() + 432000000).toISOString() // 5 days
      }
    ]
  }
}

export async function getPerformingSources(): Promise<PerformingSource[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/performing-sources/`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return Array.isArray(data) ? data : data.results || []
  } catch (error) {
    console.log('Error fetching performing sources, using mock data:', error)
    // Mock data for development
    return [
      {
        id: 1,
        source_name: 'LinkedIn',
        hires_made: 12,
        cost_per_hire: 2800,
        conversion_rate: 15.2
      },
      {
        id: 2,
        source_name: 'Indeed',
        hires_made: 8,
        cost_per_hire: 1200,
        conversion_rate: 12.8
      },
      {
        id: 3,
        source_name: 'Employee Referrals',
        hires_made: 15,
        cost_per_hire: 800,
        conversion_rate: 28.5
      },
      {
        id: 4,
        source_name: 'Company Website',
        hires_made: 6,
        cost_per_hire: 500,
        conversion_rate: 18.3
      },
      {
        id: 5,
        source_name: 'AngelList',
        hires_made: 4,
        cost_per_hire: 1500,
        conversion_rate: 9.7
      }
    ]
  }
}