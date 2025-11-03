"use client"

import { useState } from "react"
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

export default function SelectTabsPage() {
  const [hrTabs, setHrTabs] = useState<TabOption[]>([
    { id: 'dashboard', label: 'Dashboard', description: 'Overview and statistics', enabled: true },
    { id: 'feedback-forms', label: 'Feedback Forms', description: 'Create and manage forms', enabled: true },
    { id: 'jobs', label: 'Jobs', description: 'Job postings and management', enabled: true },
    { id: 'candidates', label: 'Candidates', description: 'Candidate database', enabled: true },
    { id: 'screening', label: 'AI/HR Screening', description: 'Automated screening tools', enabled: true },
    { id: 'interviews', label: 'Interviews', description: 'Interview scheduling', enabled: true },
    { id: 'integrations', label: 'Integrations', description: 'Third-party integrations', enabled: false },
    { id: 'analytics', label: 'Analytics', description: 'Reports and analytics', enabled: true },
    { id: 'settings', label: 'Settings', description: 'User settings', enabled: true },
  ])

  const [recruiterTabs, setRecruiterTabs] = useState<TabOption[]>([
    { id: 'dashboard', label: 'Dashboard', description: 'Overview and statistics', enabled: true },
    { id: 'feedback-forms', label: 'Feedback Forms', description: 'Create and manage forms', enabled: false },
    { id: 'jobs', label: 'Jobs', description: 'Job postings and management', enabled: true },
    { id: 'candidates', label: 'Candidates', description: 'Candidate database', enabled: true },
    { id: 'screening', label: 'AI/HR Screening', description: 'Automated screening tools', enabled: true },
    { id: 'interviews', label: 'Interviews', description: 'Interview scheduling', enabled: true },
    { id: 'integrations', label: 'Integrations', description: 'Third-party integrations', enabled: false },
    { id: 'analytics', label: 'Analytics', description: 'Reports and analytics', enabled: false },
    { id: 'settings', label: 'Settings', description: 'User settings', enabled: true },
  ])

  const toggleHrTab = (id: string) => {
    setHrTabs(tabs =>
      tabs.map(tab =>
        tab.id === id ? { ...tab, enabled: !tab.enabled } : tab
      )
    )
  }

  const toggleRecruiterTab = (id: string) => {
    setRecruiterTabs(tabs =>
      tabs.map(tab =>
        tab.id === id ? { ...tab, enabled: !tab.enabled } : tab
      )
    )
  }

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('hr-tabs-config', JSON.stringify(hrTabs))
    localStorage.setItem('recruiter-tabs-config', JSON.stringify(recruiterTabs))
    alert('Tab configuration saved successfully!')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Select Tabs</h1>
          <p className="text-gray-600 mt-2">Configure which tabs are visible for different user roles</p>
        </div>
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="hr" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xl">
          <TabsTrigger value="hr">HR Tab</TabsTrigger>
          <TabsTrigger value="recruiter">Recruiter Tab</TabsTrigger>
        </TabsList>

        {/* HR Tabs */}
        <TabsContent value="hr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                HR Navigation Tabs
              </CardTitle>
              <CardDescription>
                Select which tabs should be visible for HR users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hrTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-start space-x-3 p-4 rounded-lg border transition-all ${
                    tab.enabled
                      ? 'bg-green-50 border-green-200 hover:bg-green-100'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Checkbox
                    id={`hr-${tab.id}`}
                    checked={tab.enabled}
                    onCheckedChange={() => toggleHrTab(tab.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`hr-${tab.id}`}
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

        {/* Recruiter Tabs */}
        <TabsContent value="recruiter" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                Recruiter Navigation Tabs
              </CardTitle>
              <CardDescription>
                Select which tabs should be visible for Recruiter users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recruiterTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-start space-x-3 p-4 rounded-lg border transition-all ${
                    tab.enabled
                      ? 'bg-green-50 border-green-200 hover:bg-green-100'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Checkbox
                    id={`recruiter-${tab.id}`}
                    checked={tab.enabled}
                    onCheckedChange={() => toggleRecruiterTab(tab.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`recruiter-${tab.id}`}
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
