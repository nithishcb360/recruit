"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useDashboardMetrics, useSourcePerformance, useRecentActivity, useJobsAnalytics } from "@/hooks/use-dashboard"
import { useJobs } from "@/hooks/use-jobs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Search,
  FileText,
  Settings,
  TrendingUp,
  TrendingDown,
  Plus,
  User,
  ChevronDown,
  Target,
  Globe,
  Bell,
  Calendar,
  Video,
  UserCheck,
  AlertTriangle,
  Award,
  Loader2,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import JobCreationForm from "../components/job-creation-form"
import QuickActions from "../components/quick-actions"
import CandidatePipeline from "../components/candidate-pipeline"
import IntegrationsPanel from "../components/integrations-panel"
import AnalyticsDashboard from "../components/analytics-dashboard"
import SaaSPlatformAdmin from "../components/saas-platform-admin"
import ClientOrganizationSettings from "../components/client-organization-settings"
import InterviewPlatform from "../components/interview-platform"
import FeedbackFormBuilder from "../components/feedback-form-builder"

export default function RecruitmentDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [selectedJob, setSelectedJob] = useState<number | null>(null)

  // Fetch real data
  const { metrics, loading: metricsLoading, error: metricsError } = useDashboardMetrics()
  const { sources, loading: sourcesLoading } = useSourcePerformance()
  const { activities, loading: activitiesLoading } = useRecentActivity()
  const { jobs: jobsAnalytics, loading: jobsLoading, refetch: refetchJobsAnalytics } = useJobsAnalytics()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "feedback", label: "Feedback Forms", icon: FileText },
    { id: "jobs", label: "Jobs", icon: Briefcase },
    { id: "candidates", label: "Candidates", icon: Users },
    { id: "screening", label: "AI/HR Screening", icon: Search },
    { id: "interviews", label: "Interviews", icon: Video },
    { id: "integrations", label: "Integrations", icon: Globe },
    { id: "analytics", label: "Analytics", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
    ...(user.role === "platform_admin" ? [{ id: "platform", label: "Platform", icon: Target }] : []),
  ]

  const handleJobClick = (jobId: number) => {
    setSelectedJob(jobId)
    setActiveTab("candidates")
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-red-600 bg-red-50"
      case "high":
        return "text-orange-600 bg-orange-50"
      case "medium":
        return "text-yellow-600 bg-yellow-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const getUrgencyIndicator = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "border-l-red-500"
      case "high":
        return "border-l-orange-500"
      case "medium":
        return "border-l-yellow-500"
      default:
        return "border-l-green-500"
    }
  }

  const MetricCard = ({ title, current, change, subtitle }: any) => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600 font-medium">{title}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-lg font-bold text-gray-900">
                {title.includes("Cost") ? `$${current?.toLocaleString()}` : current}
                {title.includes("Rate") ? "%" : ""}
              </span>
              {change !== undefined && (
                <div className="flex items-center space-x-1">
                  {change >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-xs ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {change > 0 ? "+" : ""}
                    {change}%
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <h1 className="text-xl font-bold text-gray-900">
              Recruitment
              <br />
              Management
            </h1>
          </div>
          <nav className="px-4 space-y-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === item.id
                    ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">
                {activeTab === "dashboard" && "Dashboard"}
                {activeTab === "jobs" && "Jobs"}
                {activeTab === "candidates" && "Candidates"}
                {activeTab === "screening" && "Screening"}
                {activeTab === "interviews" && "Interview Platform"}
                {activeTab === "feedback" && "Feedback Forms"}
                {activeTab === "integrations" && "Integrations"}
                {activeTab === "analytics" && "Analytics"}
                {activeTab === "settings" && "Settings"}
                {activeTab === "platform" && "Platform Admin"}
              </h1>
              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-4 w-4" />
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs flex items-center justify-center">
                    {activities?.length || 0}
                  </Badge>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{user.first_name}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveTab("settings")}>Organization Settings</DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>Sign Out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setActiveTab("jobs")}>
                  <Plus className="h-4 w-4 mr-1" />
                  Job
                </Button>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          {activeTab === "dashboard" && (
            <div className="p-4 space-y-4">
              {/* Business Metrics */}
              {metricsLoading ? (
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border-0 shadow-sm">
                      <CardContent className="p-3">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-6 w-16 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : metricsError ? (
                <div className="text-red-600 text-center p-4">
                  Error loading metrics: {metricsError}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  <MetricCard
                    title="Active Jobs"
                    current={metrics?.active_jobs}
                    change={metrics?.active_jobs_change}
                    subtitle={`${metrics?.active_jobs} open positions`}
                  />
                  <MetricCard
                    title="Time to Fill"
                    current={metrics?.time_to_fill}
                    change={metrics?.time_to_fill_change}
                    subtitle="days average"
                  />
                  <MetricCard
                    title="Offer Rate"
                    current={metrics?.offer_rate}
                    change={metrics?.offer_rate_change}
                    subtitle="acceptance rate"
                  />
                  <MetricCard
                    title="Cost/Hire"
                    current={metrics?.cost_per_hire}
                    change={metrics?.cost_per_hire_change}
                    subtitle="average cost"
                  />
                </div>
              )}

              {/* Active Jobs & Next Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Active Jobs */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-900 flex items-center">
                      <Briefcase className="h-4 w-4 text-blue-500 mr-2" />
                      Active Jobs ({jobsAnalytics?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 pt-0">
                    {jobsLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {jobsAnalytics?.map((job) => (
                          <div
                            key={job.id}
                            className={`p-2 border-l-2 border rounded-lg cursor-pointer hover:shadow-sm transition-shadow ${getUrgencyIndicator(
                              job.urgency,
                            )}`}
                            onClick={() => handleJobClick(job.id)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-medium text-sm text-gray-900 truncate">{job.title}</h3>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  job.urgency === "critical"
                                    ? "border-red-200 text-red-700"
                                    : job.urgency === "high"
                                      ? "border-orange-200 text-orange-700"
                                      : job.urgency === "medium"
                                        ? "border-yellow-200 text-yellow-700"
                                        : "border-green-200 text-green-700"
                                }`}
                              >
                                {job.days_open}d
                              </Badge>
                            </div>
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>{job.department_name}</span>
                              <span>{job.applications_count} candidates</span>
                            </div>
                            <div className="grid grid-cols-5 gap-0.5 mb-1 text-xs">
                              <div className="text-center">
                                <div className="font-medium text-blue-600">{job.candidates_by_stage?.applied || 0}</div>
                                <div className="text-gray-500">App</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-yellow-600">{job.candidates_by_stage?.screening || 0}</div>
                                <div className="text-gray-500">AI/HR</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-purple-600">{job.candidates_by_stage?.technical || 0}</div>
                                <div className="text-gray-500">Tech</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-green-600">{job.candidates_by_stage?.offer || 0}</div>
                                <div className="text-gray-500">Off</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-emerald-600">{job.candidates_by_stage?.hired || 0}</div>
                                <div className="text-gray-500">Hir</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">{job.next_action}</span>
                              <Progress value={(job.days_open / job.sla_days) * 100} className="w-12 h-1" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Next Actions */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-900 flex items-center">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                      Next Actions ({activities?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {activitiesLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {activities?.map((action) => (
                          <div
                            key={action.id}
                            className={`p-2 rounded-lg border flex items-center justify-between text-xs ${getPriorityColor(
                              action.priority,
                            )}`}
                          >
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{action.title}</p>
                                <p className="text-gray-600 truncate">
                                  {action.candidate} • {action.job}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs ml-2 flex-shrink-0 bg-transparent"
                            >
                              {action.action}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top Performing Sources */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-900 flex items-center">
                    <Award className="h-4 w-4 text-purple-500 mr-2" />
                    Top Performing Sources
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {sourcesLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sources?.map((source) => (
                        <div key={source.id} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">{source.source_name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600">
                              {source.hires_made} Hires • ${source.cost_per_hire}/hire
                            </p>
                            <p className="text-xs font-medium text-green-600">{source.conversion_rate}% Conversion</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Other tabs */}
          {activeTab === "jobs" && (
            <>
              <JobCreationForm onJobCreated={refetchJobsAnalytics} />
              <QuickActions onJobCreated={refetchJobsAnalytics} />
            </>
          )}
          {activeTab === "candidates" && <CandidatePipeline selectedJobId={selectedJob} />}
          {activeTab === "integrations" && <IntegrationsPanel />}
          {activeTab === "screening" && (
            <div className="p-6 text-center space-y-4">
              <Search className="h-16 w-16 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-bold">AI/HR Screening Management</h2>
              <p className="text-muted-foreground">
                This section will provide advanced tools for automated candidate assessment.
              </p>
            </div>
          )}
          {activeTab === "analytics" && <AnalyticsDashboard />}
          {activeTab === "settings" && <ClientOrganizationSettings />}
          {activeTab === "platform" && user.role === "platform_admin" && <SaaSPlatformAdmin />}
          {activeTab === "interviews" && <InterviewPlatform />}
          {activeTab === "feedback" && <FeedbackFormBuilder />}
        </main>
      </div>
    </div>
  )
}