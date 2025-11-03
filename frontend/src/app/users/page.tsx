"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Users, Edit, Trash2, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"

interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: string
  password: string
  is_active: boolean
  is_superuser: boolean
}

export default function AllUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState<Record<number, boolean>>({})
  const [showCustomRole, setShowCustomRole] = useState(false)
  const [customRole, setCustomRole] = useState('')
  const [existingRoles, setExistingRoles] = useState<string[]>(['admin', 'hr', 'recruiter', 'interviewer'])
  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'hr',
    password: ''
  })

  useEffect(() => {
    fetchAllUsers()
  }, [])

  const fetchAllUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('http://localhost:8000/api/admin/users/credentials/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        // Extract unique roles
        const roles = Array.from(new Set(data.users?.map((u: any) => u.role) || [])).sort()
        setExistingRoles(roles as string[])
      } else {
        alert('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      alert('Error fetching users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setEditFormData({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      password: ''
    })
    setShowEditModal(true)
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    try {
      const response = await fetch(`http://localhost:8000/api/admin/users/${editingUser.id}/update/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData)
      })

      if (response.ok) {
        alert('User updated successfully!')
        setShowEditModal(false)
        setEditingUser(null)
        fetchAllUsers()
      } else {
        const data = await response.json()
        alert('Error: ' + (data.error || 'Failed to update user'))
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Error updating user')
    }
  }

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return
    }

    try {
      const response = await fetch(`http://localhost:8000/api/admin/users/${userId}/delete/`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('User deleted successfully!')
        fetchAllUsers()
      } else {
        alert('Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error deleting user')
    }
  }

  const togglePasswordVisibility = (userId: number) => {
    setShowPassword(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
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

        // Refresh users list
        fetchAllUsers()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to delete role'}`)
      }
    } catch (error) {
      console.error('Error deleting role:', error)
      alert('Error deleting role. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Users</h1>
          <p className="text-gray-600 mt-2">Manage all users in the system</p>
        </div>
        <Button onClick={fetchAllUsers} className="bg-blue-600 hover:bg-blue-700 text-white">
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users List ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Password</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {showPassword[user.id] ? user.password : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(user.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {showPassword[user.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleEditClick(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleDeleteUser(user.id, user.username)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl bg-white" key={editingUser?.id}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-username" className="text-sm font-medium text-gray-700">Username</Label>
                <Input
                  id="edit-username"
                  value={editFormData.username}
                  onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                  className="mt-1 bg-white text-black"
                />
              </div>
              <div>
                <Label htmlFor="edit-email" className="text-sm font-medium text-gray-700">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="mt-1 bg-white text-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-first-name" className="text-sm font-medium text-gray-700">First Name</Label>
                <Input
                  id="edit-first-name"
                  value={editFormData.first_name}
                  onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                  className="mt-1 bg-white text-black"
                />
              </div>
              <div>
                <Label htmlFor="edit-last-name" className="text-sm font-medium text-gray-700">Last Name</Label>
                <Input
                  id="edit-last-name"
                  value={editFormData.last_name}
                  onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                  className="mt-1 bg-white text-black"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-role" className="text-sm font-medium text-gray-700">Role</Label>
              {!showCustomRole ? (
                <div className="space-y-2">
                  <Select
                    key={editFormData.role}
                    value={editFormData.role}
                    onValueChange={(value) => {
                      if (value === 'custom') {
                        setShowCustomRole(true)
                      } else {
                        setEditFormData({ ...editFormData, role: value })
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1 bg-white text-black">
                      <SelectValue placeholder="Select role" />
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
                  {editFormData.role && !['admin', 'hr', 'recruiter', 'interviewer'].includes(editFormData.role) && (
                    <p className="text-xs text-blue-600">Custom role: {editFormData.role}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 mt-1">
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
                          setEditFormData({ ...editFormData, role: customRole.trim().toLowerCase() })
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
              <Label htmlFor="edit-password" className="text-sm font-medium text-gray-700">New Password (leave empty to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editFormData.password}
                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                placeholder="Enter new password or leave empty"
                className="mt-1 bg-white text-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only fill this if you want to change the password
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button onClick={() => setShowEditModal(false)} className="px-6 bg-blue-600 hover:bg-blue-700 text-white">
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} className="px-6 bg-blue-600 hover:bg-blue-700 text-white">
                Update User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
