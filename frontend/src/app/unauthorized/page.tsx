"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

export default function UnauthorizedPage() {
  const router = useRouter()
  const { logout } = useAuth()

  const handleGoBack = () => {
    router.push("/")
  }

  const handleSignOut = () => {
    logout()
    router.push("/signin")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold text-center text-red-600">Access Denied</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            You don't have permission to access this resource
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>Your current role doesn't allow access to this page.</p>
          </div>
          
          <div className="space-y-2">
            <Button onClick={handleGoBack} className="w-full" variant="outline">
              Go Back to Dashboard
            </Button>
            <Button onClick={handleSignOut} className="w-full bg-black hover:bg-gray-800 text-white">
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}