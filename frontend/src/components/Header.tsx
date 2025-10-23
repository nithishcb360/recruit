"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
  Bell,
  User,
  EllipsisVertical,
  Plus,
  Menu,
  LogOut,
  Check,
  Users,
  UserPlus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Notification {
  id: number
  candidate: number
  candidate_name: string
  notification_type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

interface UserCredential {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  password?: string
  role?: string
}

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [allUsers, setAllUsers] = useState<UserCredential[]>([])
  const [showUsersModal, setShowUsersModal] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [showAddPassword, setShowAddPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'hr'
  })
  const [editUser, setEditUser] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'hr'
  })

  useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/notifications/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.results || data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/notifications/unread_count/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/notifications/${notificationId}/mark_read/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        fetchNotifications()
        fetchUnreadCount()
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/notifications/mark_all_read/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        fetchNotifications()
        fetchUnreadCount()
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/users/credentials/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAllUsers(data.users || [])
        setShowUsersModal(true)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleAddUser = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/users/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newUser)
      })

      if (response.ok) {
        const data = await response.json()
        alert(`User created successfully!\n\nUsername: ${newUser.username}\nPassword: ${newUser.password}\n\nIMPORTANT: Save these credentials now. Passwords are encrypted and cannot be retrieved later.`)
        setShowAddUserModal(false)
        setNewUser({
          username: '',
          password: '',
          email: '',
          first_name: '',
          last_name: '',
          role: 'hr'
        })
        fetchAllUsers()
      } else {
        const data = await response.json()
        alert('Error: ' + (data.error || 'Failed to create user'))
      }
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Error creating user')
    }
  }

  const handleEditUser = (u: UserCredential) => {
    console.log('Edit user clicked:', u)
    setEditingUserId(u.id)
    setEditUser({
      username: u.username,
      password: '',  // Always blank - can't retrieve encrypted passwords
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      role: u.role || 'hr'
    })
    setShowEditUserModal(true)
    console.log('Edit modal should open now')
  }

  const handleUpdateUser = async () => {
    console.log('Update user called with ID:', editingUserId)
    console.log('Update data:', editUser)

    if (!editingUserId) {
      console.log('No editing user ID found')
      return
    }

    try {
      console.log('Sending PUT request to:', `http://localhost:8000/api/admin/users/${editingUserId}/update/`)
      const response = await fetch(`http://localhost:8000/api/admin/users/${editingUserId}/update/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editUser)
      })

      console.log('Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Update successful:', data)
        alert('User updated successfully!')
        setShowEditUserModal(false)
        setEditingUserId(null)
        fetchAllUsers()
      } else {
        const data = await response.json()
        console.log('Update failed:', data)
        alert('Error: ' + (data.error || 'Failed to update user'))
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Error updating user: ' + error)
    }
  }

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return
    }

    try {
      const response = await fetch(`http://localhost:8000/api/admin/users/${userId}/delete/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        alert('User deleted successfully!')
        fetchAllUsers()
      } else {
        const data = await response.json()
        alert('Error: ' + (data.error || 'Failed to delete user'))
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error deleting user')
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/signin")
  }

  const canCreateJobs = user?.role === 'hr'
  const isAdmin = user?.role === 'admin'

  return (
    <header className="h-16 flex items-center border-b bg-white px-4 md:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg hover:bg-gray-100 mr-2"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>
      
      {/* Spacer to push icons to the right */}
      <div className="flex-1"></div>
      
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white hover:bg-slate-50"
              onClick={fetchNotifications}
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Unread notifications</span>
              {unreadCount > 0 && (
                <span aria-hidden="true" className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-white">
            <div className="flex items-center justify-between px-2 py-2 bg-white">
              <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-[400px] overflow-y-auto bg-white">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 bg-white">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                      !notification.is_read ? 'bg-blue-50' : 'bg-white'
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-blue-600" />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="User menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white hover:bg-slate-50"
            >
              <User className="h-4 w-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white">
            <DropdownMenuLabel className="bg-white">
              <div className="text-black">{user?.name}</div>
              <div className="text-xs text-gray-500 font-normal capitalize">{user?.role}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="bg-white hover:bg-gray-50">
              <LogOut className="mr-2 h-4 w-4 text-black" />
              <span className="text-black">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isAdmin && (
          <>
            <button
              onClick={() => setShowAddUserModal(true)}
              aria-label="Add User"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
              title="Add new user"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Add User</span>
            </button>
            <button
              onClick={fetchAllUsers}
              aria-label="View All Users"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border bg-white hover:bg-slate-50 text-sm font-medium"
              title="View all users and credentials"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">All Users</span>
            </button>
          </>
        )}

        <button
          aria-label="More"
          className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white hover:bg-slate-50"
        >
          <EllipsisVertical className="h-4 w-4" aria-hidden="true" />
        </button>

        {canCreateJobs && (
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            aria-label="Add Job"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Job</span>
          </Link>
        )}
      </div>

      {/* Edit User Modal */}
      {showEditUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" onClick={() => setShowEditUserModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
              <button
                onClick={() => setShowEditUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-white p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={editUser.username}
                  onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editUser.password}
                    onChange={(e) => setEditUser({...editUser, password: e.target.value})}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new password (leave blank to keep current)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showEditPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave blank to keep the current password</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={editUser.first_name}
                  onChange={(e) => setEditUser({...editUser, first_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={editUser.last_name}
                  onChange={(e) => setEditUser({...editUser, last_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({...editUser, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="hr">HR</option>
                  <option value="recruiter">Recruiter</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateUser}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Update User
                </button>
                <button
                  onClick={() => setShowEditUserModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddUserModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-white p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showAddPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showAddPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="hr">HR</option>
                  <option value="recruiter">Recruiter</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddUser}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Create User
                </button>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Modal */}
      {showUsersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowUsersModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-gray-900">All Users - Credentials</h2>
                <button
                  onClick={() => setShowUsersModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500">Note: Passwords are encrypted and cannot be displayed. Use Edit to set a new password.</p>
            </div>
            <div className="bg-white overflow-y-auto max-h-[calc(80vh-80px)]">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{u.password}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.first_name} {u.last_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${u.is_superuser ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditUser(u)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}