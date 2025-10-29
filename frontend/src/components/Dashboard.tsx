"use client"

import React, { useState, useEffect } from "react"
import {
  AlertTriangle,
  Briefcase,
  Award,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

// Types based on original code structure
interface MetricCardProps {
  title: string
  current?: number
  change?: number
  subtitle?: string
}

function MetricCard({ title, current, change, subtitle }: MetricCardProps) {
  const isPositive = (change || 0) > 0
  const changeColor = isPositive ? "text-green-600" : "text-red-600"
  const changePrefix = isPositive ? "+" : ""

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-3">
        <div className="text-xs font-medium text-gray-600 mb-1">{title}</div>
        <div className="text-lg font-bold text-gray-900 mb-1">
          {title.includes("Cost") || title.includes("Hire") ? `$${current}` : current}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">{subtitle}</span>
          {change !== undefined && (
            <span className={`font-medium ${changeColor}`}>
              {changePrefix}{change}{title.includes("Rate") ? "%" : ""}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [activeTab] = useState("dashboard")
  
  // Mock data matching original structure
  const [metrics] = useState({
    active_jobs: 24,
    active_jobs_change: 12,
    time_to_fill: 18,
    time_to_fill_change: -2,
    offer_rate: 85,
    offer_rate_change: 5,
    cost_per_hire: 3500,
    cost_per_hire_change: -300
  })

  const [jobsAnalytics] = useState([
    {
      id: 1,
      title: 'Senior Full Stack Developer',
      department_name: 'Engineering',
      urgency: 'critical' as const,
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
      urgency: 'high' as const,
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
      urgency: 'medium' as const,
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
    }
  ])

  const [activities] = useState([
    {
      id: 1,
      title: 'Technical Interview',
      candidate: 'Sarah Chen',
      job: 'Senior Full Stack Developer',
      priority: 'critical' as const,
      action: 'Schedule'
    },
    {
      id: 2,
      title: 'Reference Check',
      candidate: 'Mike Rodriguez',
      job: 'Product Manager',
      priority: 'high' as const,
      action: 'Complete'
    },
    {
      id: 3,
      title: 'Portfolio Review',
      candidate: 'Emily Watson',
      job: 'UX Designer',
      priority: 'medium' as const,
      action: 'Review'
    }
  ])

  const [sources] = useState([
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
    }
  ])

  const [metricsLoading] = useState(false)
  const [metricsError] = useState(null)
  const [jobsLoading] = useState(false)
  const [activitiesLoading] = useState(false)
  const [sourcesLoading] = useState(false)

  // Helper functions
  const getUrgencyIndicator = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "border-red-200 bg-red-50"
      case "high":
        return "border-orange-200 bg-orange-50"
      case "medium":
        return "border-yellow-200 bg-yellow-50"
      case "low":
        return "border-green-200 bg-green-50"
      default:
        return "border-gray-200 bg-gray-50"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "border-red-200 bg-red-50"
      case "high":
        return "border-orange-200 bg-orange-50"
      case "medium":
        return "border-yellow-200 bg-yellow-50"
      case "low":
        return "border-green-200 bg-green-50"
      default:
        return "border-gray-200 bg-gray-50"
    }
  }

  const handleJobClick = (jobId: number) => {
    console.log("Navigating to job:", jobId)
  }

  return (
    <div>
      {/* Page heading */}
      <div className="px-4 md:px-6 py-4">
        <h2 className="text-2xl font-semibold text-balance">Dashboard</h2>
      </div>

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
                        className={`p-2 border rounded-lg cursor-pointer hover:shadow-sm transition-shadow ${getUrgencyIndicator(
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
    </div>
  )
}
