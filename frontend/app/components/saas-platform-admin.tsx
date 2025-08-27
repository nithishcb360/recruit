"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { 
  Plus, Edit, Trash, CheckCircle, XCircle, Building2, DollarSign, 
  Users, Activity, Settings, Shield, AlertTriangle, TrendingUp,
  Database, Server, Globe, Mail, Phone, Calendar, FileText,
  BarChart3, PieChart, LineChart, Search, Filter, Download,
  Loader2, Eye, EyeOff, Lock, Unlock
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Enhanced interfaces
interface PlatformUser {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'org_admin' | 'recruiter' | 'hiring_manager' | 'observer'
  organization: string
  organizationId: string
  status: "active" | "inactive" | "suspended"
  lastLogin: string
  createdAt: string
  permissions: string[]
  twoFactorEnabled: boolean
}

interface Organization {
  id: string
  name: string
  domain: string
  plan: 'starter' | 'professional' | 'enterprise' | 'custom'
  users: number
  maxUsers: number
  activeJobs: number
  maxJobs: number
  status: "active" | "suspended" | "trial" | "expired"
  billingStatus: "current" | "overdue" | "cancelled"
  createdAt: string
  subscriptionEnd: string
  monthlyRevenue: number
  usage: {
    candidates: number
    interviews: number
    storage: number // in GB
    apiCalls: number
  }
  settings: {
    ssoEnabled: boolean
    auditLogging: boolean
    dataRetention: number // in days
    customBranding: boolean
  }
  contact: {
    name: string
    email: string
    phone: string
  }
}

interface SystemMetrics {
  totalOrganizations: number
  activeUsers: number
  monthlyRevenue: number
  systemLoad: number
  storageUsed: number
  totalStorageGB: number
  apiCallsToday: number
  uptime: number
}

export default function SaaSPlatformAdmin() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)

  // Enhanced sample data
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalOrganizations: 247,
    activeUsers: 1834,
    monthlyRevenue: 89750,
    systemLoad: 72,
    storageUsed: 1450,
    totalStorageGB: 2000,
    apiCallsToday: 45670,
    uptime: 99.97
  })

  const [users, setUsers] = useState<PlatformUser[]>([
    {
      id: "u1",
      name: "John Smith",
      email: "john.smith@acmecorp.com",
      role: "org_admin",
      organization: "Acme Corporation",
      organizationId: "org1",
      status: "active",
      lastLogin: "2024-03-10T10:30:00Z",
      createdAt: "2024-01-15T09:00:00Z",
      permissions: ["manage_users", "view_analytics", "manage_jobs"],
      twoFactorEnabled: true
    },
    {
      id: "u2",
      name: "Sarah Johnson",
      email: "sarah.j@techstart.io",
      role: "recruiter",
      organization: "TechStart Inc",
      organizationId: "org2",
      status: "active",
      lastLogin: "2024-03-10T14:20:00Z",
      createdAt: "2024-02-01T11:30:00Z",
      permissions: ["manage_candidates", "conduct_interviews"],
      twoFactorEnabled: false
    },
    {
      id: "u3",
      name: "Michael Chen",
      email: "m.chen@innovate.com",
      role: "hiring_manager",
      organization: "InnovateX",
      organizationId: "org3",
      status: "suspended",
      lastLogin: "2024-03-05T16:45:00Z",
      createdAt: "2024-01-20T14:15:00Z",
      permissions: ["view_candidates", "approve_hires"],
      twoFactorEnabled: true
    }
  ])

  const [organizations, setOrganizations] = useState<Organization[]>([
    {
      id: "org1",
      name: "Acme Corporation",
      domain: "acmecorp.com",
      plan: "enterprise",
      users: 45,
      maxUsers: 100,
      activeJobs: 18,
      maxJobs: 50,
      status: "active",
      billingStatus: "current",
      createdAt: "2023-10-15T09:00:00Z",
      subscriptionEnd: "2024-10-15T09:00:00Z",
      monthlyRevenue: 2400,
      usage: {
        candidates: 1250,
        interviews: 340,
        storage: 15.2,
        apiCalls: 12500
      },
      settings: {
        ssoEnabled: true,
        auditLogging: true,
        dataRetention: 365,
        customBranding: true
      },
      contact: {
        name: "John Smith",
        email: "admin@acmecorp.com",
        phone: "+1-555-0123"
      }
    },
    {
      id: "org2",
      name: "TechStart Inc",
      domain: "techstart.io",
      plan: "professional",
      users: 12,
      maxUsers: 25,
      activeJobs: 5,
      maxJobs: 15,
      status: "trial",
      billingStatus: "current",
      createdAt: "2024-01-20T11:30:00Z",
      subscriptionEnd: "2024-04-20T11:30:00Z",
      monthlyRevenue: 800,
      usage: {
        candidates: 230,
        interviews: 45,
        storage: 3.8,
        apiCalls: 3200
      },
      settings: {
        ssoEnabled: false,
        auditLogging: false,
        dataRetention: 90,
        customBranding: false
      },
      contact: {
        name: "Sarah Johnson",
        email: "contact@techstart.io",
        phone: "+1-555-0456"
      }
    },
    {
      id: "org3",
      name: "InnovateX",
      domain: "innovatex.com",
      plan: "starter",
      users: 3,
      maxUsers: 5,
      activeJobs: 2,
      maxJobs: 5,
      status: "suspended",
      billingStatus: "overdue",
      createdAt: "2024-02-10T14:15:00Z",
      subscriptionEnd: "2024-05-10T14:15:00Z",
      monthlyRevenue: 150,
      usage: {
        candidates: 45,
        interviews: 8,
        storage: 0.9,
        apiCalls: 850
      },
      settings: {
        ssoEnabled: false,
        auditLogging: false,
        dataRetention: 30,
        customBranding: false
      },
      contact: {
        name: "Michael Chen",
        email: "admin@innovatex.com",
        phone: "+1-555-0789"
      }
    }
  ])

  // Modal states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)

  // Filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.organization.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || user.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.domain.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || org.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Actions
  const handleSuspendUser = async (userId: string) => {
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status: u.status === 'suspended' ? 'active' : 'suspended' } : u
      ))
      toast({
        title: "User Updated",
        description: "User status has been changed successfully.",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuspendOrg = async (orgId: string) => {
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setOrganizations(prev => prev.map(o => 
        o.id === orgId ? { ...o, status: o.status === 'suspended' ? 'active' : 'suspended' } : o
      ))
      toast({
        title: "Organization Updated",
        description: "Organization status has been changed successfully.",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update organization status.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Active</Badge>
      case 'suspended':
        return <Badge className="bg-red-100 text-red-700">Suspended</Badge>
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-700">Trial</Badge>
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-700">Expired</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return <Badge className="bg-purple-100 text-purple-700">Enterprise</Badge>
      case 'professional':
        return <Badge className="bg-blue-100 text-blue-700">Professional</Badge>
      case 'starter':
        return <Badge className="bg-green-100 text-green-700">Starter</Badge>
      default:
        return <Badge variant="outline">{plan}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SaaS Platform Administration</h1>
          <p className="text-muted-foreground">Manage multi-tenant recruitment platform</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <Activity className="h-3 w-3 mr-1" />
            System Healthy
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Organizations</p>
                    <p className="text-2xl font-bold">{metrics.totalOrganizations}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600">+12% this month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">{metrics.activeUsers.toLocaleString()}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600">+8% this month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(metrics.monthlyRevenue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600">+15% this month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">System Uptime</p>
                    <p className="text-2xl font-bold">{metrics.uptime}%</p>
                  </div>
                  <Server className="h-8 w-8 text-orange-600" />
                </div>
                <div className="flex items-center mt-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600">Excellent</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
                <CardDescription>Current system load and resource usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>CPU Load</span>
                    <span>{metrics.systemLoad}%</span>
                  </div>
                  <Progress value={metrics.systemLoad} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Storage</span>
                    <span>{metrics.storageUsed}GB / {metrics.totalStorageGB}GB</span>
                  </div>
                  <Progress value={(metrics.storageUsed / metrics.totalStorageGB) * 100} className="h-2" />
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm">API Calls Today</span>
                  <span className="font-medium">{metrics.apiCallsToday.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm">New organization "StartupXYZ" registered</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm">System backup completed successfully</p>
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm">InnovateX payment overdue - suspended</p>
                      <p className="text-xs text-muted-foreground">3 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm">Acme Corp upgraded to Enterprise plan</p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search organizations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setIsOrgModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Jobs</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{org.name}</div>
                        <div className="text-sm text-muted-foreground">{org.domain}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(org.plan)}</TableCell>
                    <TableCell>{org.users}/{org.maxUsers}</TableCell>
                    <TableCell>{org.activeJobs}/{org.maxJobs}</TableCell>
                    <TableCell>{formatCurrency(org.monthlyRevenue)}</TableCell>
                    <TableCell>{getStatusBadge(org.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrg(org)
                            setIsOrgModalOpen(true)
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuspendOrg(org.id)}
                          disabled={isLoading}
                        >
                          {org.status === 'suspended' ? (
                            <Unlock className="h-3 w-3" />
                          ) : (
                            <Lock className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setIsUserModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>2FA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.organization}</TableCell>
                    <TableCell>{formatDate(user.lastLogin)}</TableCell>
                    <TableCell>
                      {user.twoFactorEnabled ? (
                        <Shield className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user)
                            setIsUserModalOpen(true)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuspendUser(user.id)}
                          disabled={isLoading}
                        >
                          {user.status === 'suspended' ? (
                            <Unlock className="h-3 w-3" />
                          ) : (
                            <Lock className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="mt-6">
          <div className="space-y-6">
            {/* Onboarding Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">New Signups</p>
                      <p className="text-2xl font-bold">24</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">+18% this week</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Trial Conversions</p>
                      <p className="text-2xl font-bold">73%</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">+5% this month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Setup</p>
                      <p className="text-2xl font-bold text-orange-600">7</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-orange-600">Need assistance</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Onboarding Wizard */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Organization</CardTitle>
                <CardDescription>Set up a new organization with guided onboarding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="org-name">Organization Name</Label>
                      <Input id="org-name" placeholder="Enter organization name" />
                    </div>
                    <div>
                      <Label htmlFor="org-domain">Domain</Label>
                      <Input id="org-domain" placeholder="company.com" />
                    </div>
                    <div>
                      <Label htmlFor="org-plan">Plan</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter">Starter - $29/month</SelectItem>
                          <SelectItem value="professional">Professional - $99/month</SelectItem>
                          <SelectItem value="enterprise">Enterprise - $299/month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="admin-name">Admin Name</Label>
                      <Input id="admin-name" placeholder="John Smith" />
                    </div>
                    <div>
                      <Label htmlFor="admin-email">Admin Email</Label>
                      <Input id="admin-email" type="email" placeholder="admin@company.com" />
                    </div>
                    <div>
                      <Label htmlFor="admin-phone">Phone (Optional)</Label>
                      <Input id="admin-phone" placeholder="+1-555-0123" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Initial Setup Options</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="setup-sso" />
                      <Label htmlFor="setup-sso">Enable SSO</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="setup-branding" />
                      <Label htmlFor="setup-branding">Custom Branding</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="setup-audit" defaultChecked />
                      <Label htmlFor="setup-audit">Audit Logging</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="setup-notifications" defaultChecked />
                      <Label htmlFor="setup-notifications">Email Notifications</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="org-notes">Setup Notes (Internal)</Label>
                  <Textarea 
                    id="org-notes" 
                    placeholder="Any special requirements or notes for this organization..."
                    className="h-20"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline">Save as Draft</Button>
                  <Button onClick={() => {
                    toast({
                      title: "Organization Created",
                      description: "New organization has been set up successfully. Welcome email sent.",
                      variant: "default"
                    })
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Organization
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Onboarding Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Onboarding Activity</CardTitle>
                <CardDescription>Latest organization setups and trial activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">StartupXYZ completed setup</p>
                        <p className="text-sm text-muted-foreground">Professional plan • 5 users added</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">2 minutes ago</p>
                      <Badge className="bg-green-100 text-green-700">Completed</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">TechCorp started trial</p>
                        <p className="text-sm text-muted-foreground">Enterprise plan trial • Admin invited</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">1 hour ago</p>
                      <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">InnovateLabs needs assistance</p>
                        <p className="text-sm text-muted-foreground">Starter plan • Setup incomplete</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">3 hours ago</p>
                      <Badge className="bg-orange-100 text-orange-700">Needs Help</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Mail className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Welcome email sent to GrowthCo</p>
                        <p className="text-sm text-muted-foreground">Professional plan • Awaiting first login</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">5 hours ago</p>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Onboarding Tools */}
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Tools</CardTitle>
                <CardDescription>Utilities to help with organization setup and management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Mail className="h-6 w-6 mb-2" />
                    Send Welcome Email
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Phone className="h-6 w-6 mb-2" />
                    Schedule Demo
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <FileText className="h-6 w-6 mb-2" />
                    Generate Setup Guide
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Settings className="h-6 w-6 mb-2" />
                    Bulk Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total MRR</p>
                    <p className="text-2xl font-bold">{formatCurrency(metrics.monthlyRevenue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Overdue Payments</p>
                    <p className="text-2xl font-bold text-red-600">3</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Trial Conversions</p>
                    <p className="text-2xl font-bold">73%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Plan</CardTitle>
              <CardDescription>Monthly recurring revenue breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span>Enterprise</span>
                  </div>
                  <span className="font-medium">{formatCurrency(45000)} (50%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Professional</span>
                  </div>
                  <span className="font-medium">{formatCurrency(32000)} (36%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Starter</span>
                  </div>
                  <span className="font-medium">{formatCurrency(12750)} (14%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>Global platform settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Maintenance Mode</Label>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <Label>New Registrations</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Email Notifications</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Audit Logging</Label>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Statistics</CardTitle>
                <CardDescription>Platform data overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Organizations</span>
                  <span className="font-medium">247</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Users</span>
                  <span className="font-medium">1,834</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Candidates</span>
                  <span className="font-medium">12,456</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Interviews</span>
                  <span className="font-medium">3,892</span>
                </div>
                <div className="flex justify-between">
                  <span>Data Size</span>
                  <span className="font-medium">1.45 TB</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>System Actions</CardTitle>
              <CardDescription>Administrative tools and utilities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-16 flex flex-col">
                  <Database className="h-6 w-6 mb-2" />
                  Backup Database
                </Button>
                <Button variant="outline" className="h-16 flex flex-col">
                  <Download className="h-6 w-6 mb-2" />
                  Export Logs
                </Button>
                <Button variant="outline" className="h-16 flex flex-col">
                  <Settings className="h-6 w-6 mb-2" />
                  System Health Check
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Organization Details Modal */}
      <Dialog open={isOrgModalOpen} onOpenChange={setIsOrgModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedOrg ? `${selectedOrg.name} Details` : 'Add New Organization'}
            </DialogTitle>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Organization Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Domain:</span>
                      <span className="text-sm font-medium">{selectedOrg.domain}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Plan:</span>
                      {getPlanBadge(selectedOrg.plan)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      {getStatusBadge(selectedOrg.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Created:</span>
                      <span className="text-sm font-medium">{formatDate(selectedOrg.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Usage Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Users:</span>
                      <span className="text-sm font-medium">{selectedOrg.users}/{selectedOrg.maxUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Active Jobs:</span>
                      <span className="text-sm font-medium">{selectedOrg.activeJobs}/{selectedOrg.maxJobs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Candidates:</span>
                      <span className="text-sm font-medium">{selectedOrg.usage.candidates.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Storage:</span>
                      <span className="text-sm font-medium">{selectedOrg.usage.storage} GB</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Contact Name:</span>
                    <span className="text-sm font-medium">{selectedOrg.contact.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="text-sm font-medium">{selectedOrg.contact.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Phone:</span>
                    <span className="text-sm font-medium">{selectedOrg.contact.phone}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}