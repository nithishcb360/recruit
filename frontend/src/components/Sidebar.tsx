"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Users,
  Brain,
  CalendarClock,
  Plug,
  BarChart3,
  SettingsIcon,
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react"

interface SidebarProps {
  isOpen?: boolean
  onToggle?: () => void
}

export default function Sidebar({ isOpen = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const nav = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/", active: pathname === "/" },
    { label: "Feedback Forms", icon: FileText, href: "/forms", active: pathname === "/forms" },
    { label: "Jobs", icon: Briefcase, href: "/jobs", active: pathname === "/jobs" },
    { label: "Candidates", icon: Users, href: "/candidates", active: pathname === "/candidates" },
    { label: "AI/HR Screening", icon: Brain, href: "/screening", active: pathname === "/screening" },
    { label: "Interviews", icon: CalendarClock, href: "#" },
    { label: "Integrations", icon: Plug, href: "#" },
    { label: "Analytics", icon: BarChart3, href: "#" },
    { label: "Settings", icon: SettingsIcon, href: "/settings", active: pathname === "/settings" },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-screen w-72 shrink-0 flex-col border-r bg-white overflow-y-auto z-50 transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:flex
      `}>
        <div className="px-6 py-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold leading-6 text-black">
            Recruitment
            <br />
            Management
          </h1>
          {/* Close button for mobile */}
          <button
            onClick={onToggle}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <nav aria-label="Primary" className="px-2 pb-4 flex-1">
          <ul className="space-y-1">
            {nav.map((item) => {
              const Icon = item.icon
              const base = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium"
              const styles = item.active ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
              return (
                <li key={item.label}>
                  <Link 
                    href={item.href} 
                    className={`${base} ${styles}`} 
                    aria-current={item.active ? "page" : undefined}
                    onClick={() => onToggle && onToggle()} // Close mobile sidebar on link click
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Profile Section */}
        <div className="mt-auto border-t border-gray-200 p-4">
          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'User'}
              </div>
              <div className="text-xs text-gray-500 capitalize truncate">
                {user?.role || 'User'}
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors duration-200"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}