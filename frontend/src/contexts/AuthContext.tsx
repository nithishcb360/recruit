"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  email: string
  role: 'admin' | 'recruiter' | 'hr'
  name: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEMO_USERS = {
  'admin@demo.com': { password: 'admin123', role: 'admin' as const, name: 'Admin User' },
  'recruiter@demo.com': { password: 'recruiter123', role: 'recruiter' as const, name: 'Recruiter User' },
  'hr@demo.com': { password: 'hr123', role: 'hr' as const, name: 'HR User' }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    const demoUser = DEMO_USERS[email as keyof typeof DEMO_USERS]
    
    if (demoUser && demoUser.password === password) {
      const userData = {
        email,
        role: demoUser.role,
        name: demoUser.name
      }
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      return true
    }
    
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}