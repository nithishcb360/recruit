"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Save, LayoutGrid } from "lucide-react"

interface TabOption {
  id: string
  label: string
  description: string
  enabled: boolean
}

interface RoleConfig {
  role: string
  tabs: TabOption[]
}

export default function SelectTabsPage() {
  const [roles, setRoles] = useState<string[]>([])
  const [roleConfigs, setRoleConfigs] = useState<Record<string, TabOption[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  const allAvailableTabs: TabOption[] = [
    { id: 'dashboard', label: 'Dashboard', description: 'Overview and statistics', enabled: true },
    { id: 'feedback-forms', label: 'Feedback Forms', description: 'Create and manage forms', enabled: true },
    { id: 'jobs', label: 'Jobs', description: 'Job postings and management', enabled: true },
    { id: 'candidates', label: 'Candidates', description: 'Candidate database', enabled: true },
    { id: 'screening', label: 'AI/HR Screening', description: 'Automated screening tools', enabled: true },
    { id: 'interviews', label: 'Interviews', description: 'Interview scheduling', enabled: true },
    { id: 'integrations', label: 'Integrations', description: 'Third-party integrations', enabled: false },
    { id: 'analytics', label: 'Analytics', description: 'Reports and analytics', enabled: true },
    { id: 'settings', label: 'Settings', description: 'User settings', enabled: true },
  ]

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/users/credentials/')
      if (response.ok) {
        const data = await response.json()
        const users = data.users || []

        // Extract unique roles, excluding admin
        const uniqueRoles = Array.from(new Set(users.map((u: any) => u.role)))
          .filter((role: any) => role !== 'admin')
          .sort()

        setRoles(uniqueRoles as string[])

        // Initialize role configs from localStorage or defaults
        const configs: Record<string, TabOption[]> = {}
        uniqueRoles.forEach((role: any) => {
          const savedConfig = localStorage.getItem(`${role}-tabs-config`)
          if (savedConfig) {
            configs[role] = JSON.parse(savedConfig)
          } else {
            // Default configuration based on role
            configs[role] = getDefaultTabsForRole(role)
          }
        })

        setRoleConfigs(configs)
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getDefaultTabsForRole = (role: string): TabOption[] => {
    // Default configs for known roles
    if (role === 'hr') {
      return allAvailableTabs.map(tab => ({ ...tab, enabled: tab.id !== 'integrations' }))
    } else if (role === 'recruiter') {
      return allAvailableTabs.map(tab => ({
        ...tab,
        enabled: !['feedback-forms', 'integrations', 'analytics'].includes(tab.id)
      }))
    } else if (role === 'interviewer') {
      return allAvailableTabs.map(tab => ({
        ...tab,
        enabled: ['dashboard', 'interviews', 'settings'].includes(tab.id)
      }))
    } else {
      // Default for custom roles - enable basic tabs
      return allAvailableTabs.map(tab => ({
        ...tab,
        enabled: ['dashboard', 'settings'].includes(tab.id)
      }))
    }
  }

  const toggleTab = (role: string, tabId: string) => {
    setRoleConfigs(prev => ({
      ...prev,
      [role]: prev[role].map(tab =>
        tab.id === tabId ? { ...tab, enabled: !tab.enabled } : tab
      )
    }))
  }

  const handleSave = () => {
    // Save all role configs to localStorage
    Object.keys(roleConfigs).forEach(role => {
      localStorage.setItem(`${role}-tabs-config`, JSON.stringify(roleConfigs[role]))
    })
    alert('Tab configuration saved successfully!')
  }

  const capitalizeRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-gray-600">Loading roles...</p>
      </div>
    )
  }

  if (roles.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No roles found. Create users with different roles first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Role Tabs</h1>
          <p className="text-gray-600 mt-2">Configure which tabs are visible for different user roles</p>
        </div>
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue={roles[0]} className="w-full">
        <TabsList className={`grid w-full max-w-4xl`} style={{ gridTemplateColumns: `repeat(${roles.length}, minmax(0, 1fr))` }}>
          {roles.map(role => (
            <TabsTrigger key={role} value={role}>
              {capitalizeRole(role)} Tab
            </TabsTrigger>
          ))}
        </TabsList>

        {roles.map(role => (
          <TabsContent key={role} value={role} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5" />
                  {capitalizeRole(role)} Navigation Tabs
                </CardTitle>
                <CardDescription>
                  Select which tabs should be visible for {capitalizeRole(role)} users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {roleConfigs[role]?.map((tab) => (
                  <div
                    key={tab.id}
                    className={`flex items-start space-x-3 p-4 rounded-lg border transition-all ${
                      tab.enabled
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Checkbox
                      id={`${role}-${tab.id}`}
                      checked={tab.enabled}
                      onCheckedChange={() => toggleTab(role, tab.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`${role}-${tab.id}`}
                          className={`text-base font-medium cursor-pointer ${
                            tab.enabled ? 'text-gray-900' : 'text-gray-500'
                          }`}
                        >
                          {tab.label}
                        </Label>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          tab.enabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {tab.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${
                        tab.enabled ? 'text-gray-600' : 'text-gray-500'
                      }`}>
                        {tab.description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 className="font-semibold text-yellow-900 mb-2">Note:</h3>
        <p className="text-sm text-yellow-800">
          Changes to tab visibility will take effect after the user logs out and logs back in.
          Some tabs like "Dashboard" and "Settings" are recommended to remain enabled for all users.
        </p>
      </div>
    </div>
  )
}
