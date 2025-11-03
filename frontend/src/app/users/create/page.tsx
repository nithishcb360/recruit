"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserPlus, Loader2, Trash2, AlertCircle } from "lucide-react"

export default function CreateUserPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCustomRole, setShowCustomRole] = useState(false)
  const [customRole, setCustomRole] = useState('')
  const [existingRoles, setExistingRoles] = useState<string[]>(['admin', 'hr', 'recruiter', 'interviewer'])
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'hr'
  })

  useEffect(() => {
    fetchExistingRoles()
  }, [])

  const fetchExistingRoles = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/users/credentials/')
      if (response.ok) {
        const data = await response.json()
        const users = data.users || []
        const roles = Array.from(new Set(users.map((u: any) => u.role))).sort()
        setExistingRoles(roles as string[])
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }

  const handleDeleteRole = async (roleToDelete: string) => {
    // Prevent deleting system roles
    if (['admin', 'hr', 'recruiter', 'interviewer'].includes(roleToDelete)) {
      alert('Cannot delete system roles (admin, hr, recruiter, interviewer)')
      return
    }

    const confirmed = confirm(`Are you sure you want to delete the role "${roleToDelete}"?\n\nThis will:\n- Remove the role from all dropdowns\n- Remove the role tab from Role Tabs page\n- Update all users with this role to "HR" role\n- Clear localStorage configuration for this role`)
    if (!confirmed) return

    try {
      // Call backend API to delete role
      const response = await fetch(`http://localhost:8000/api/admin/roles/${roleToDelete}/delete/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const data = await response.json()

        // Remove from local state
        setExistingRoles(prev => prev.filter(r => r !== roleToDelete))

        // Clear localStorage configuration for this role
        localStorage.removeItem(`${roleToDelete}-tabs-config`)

        alert(`Role "${roleToDelete}" deleted successfully!\n${data.users_updated} user(s) have been updated to "HR" role.`)

        // Refresh roles
        fetchExistingRoles()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to delete role'}`)
      }
    } catch (error) {
      console.error('Error deleting role:', error)
      alert('Error deleting role. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.username || !formData.password) {
      alert('Username and password are required')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch('http://localhost:8000/api/admin/users/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        alert(`User created successfully!\n\nUsername: ${formData.username}\nPassword: ${formData.password}\n\nIMPORTANT: Save these credentials now.`)

        // Reset form
        setFormData({
          username: '',
          password: '',
          email: '',
          first_name: '',
          last_name: '',
          role: 'hr'
        })

        // Optionally redirect to all users page
        // router.push('/users')
      } else {
        const data = await response.json()
        alert('Error: ' + (data.error || 'Failed to create user'))
      }
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Error creating user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateRandomPassword = () => {
    const length = 12
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setFormData({ ...formData, password })
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Create New User</h1>
        <p className="text-gray-600 mt-2">Add a new user to the recruitment system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            User Information
          </CardTitle>
          <CardDescription>
            Fill in the details below to create a new user account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Enter first name"
                />
              </div>

              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="role">Role *</Label>
              {!showCustomRole ? (
                <div className="space-y-2">
                  <Select
                    value={formData.role}
                    onValueChange={(value) => {
                      if (value === 'custom') {
                        setShowCustomRole(true)
                      } else {
                        setFormData({ ...formData, role: value })
                      }
                    }}
                  >
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {existingRoles.map(role => (
                        <SelectItem key={role} value={role} className="text-black capitalize">
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom" className="text-blue-600 font-semibold">+ New Role</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      placeholder="Enter custom role name"
                      className="bg-white text-black flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (customRole.trim()) {
                          setFormData({ ...formData, role: customRole.trim().toLowerCase() })
                          setShowCustomRole(false)
                          setCustomRole('')
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowCustomRole(false)
                        setCustomRole('')
                      }}
                      className="bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Enter a custom role name and click Add</p>
                </div>
              )}
              {!showCustomRole && formData.role && !['admin', 'hr', 'recruiter', 'interviewer'].includes(formData.role) && (
                <p className="text-xs text-blue-600 mt-1">Custom role: {formData.role}</p>
              )}

              {/* Manage Roles Section */}
              {!showCustomRole && existingRoles.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-gray-600" />
                    <Label className="text-sm font-medium text-gray-700 mb-0">Available Roles</Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {existingRoles.map(role => (
                      <div
                        key={role}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                          ['admin', 'hr', 'recruiter', 'interviewer'].includes(role)
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-300'
                        }`}
                      >
                        <span className="capitalize">{role}</span>
                        {!['admin', 'hr', 'recruiter', 'interviewer'].includes(role) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete role"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    System roles (Admin, HR, Recruiter, Interviewer) cannot be deleted
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={generateRandomPassword}
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Password will be stored securely. Make sure to save it as it cannot be retrieved later.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => router.push('/users')}
              >
                View All Users
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Important Notes:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Username and password are required fields</li>
          <li>Passwords are encrypted and cannot be retrieved after creation</li>
          <li>Admin users have full system access</li>
          <li>HR and Recruiter users have limited permissions</li>
        </ul>
      </div>
    </div>
  )
}
