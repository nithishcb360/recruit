"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  User,
  EllipsisVertical,
  Plus,
  Menu,
  LogOut,
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

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/signin")
  }

  const canCreateJobs = user?.role === 'hr'

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
        <button
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white hover:bg-slate-50"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Unread notifications</span>
          <span aria-hidden="true" className="absolute right-1 top-1 block h-2 w-2 rounded-full bg-blue-600" />
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="User menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white hover:bg-slate-50"
            >
              <User className="h-4 w-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="text-black">{user?.name}</div>
              <div className="text-xs text-gray-500 font-normal capitalize">{user?.role}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4 text-black" />
              <span className="text-black">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
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
    </header>
  )
}