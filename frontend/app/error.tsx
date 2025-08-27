'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Error:', error)
  }, [error])

  // Check if it's a chunk loading error
  const isChunkError = error.message?.includes('ChunkLoadError') || 
                       error.message?.includes('Loading chunk') ||
                       error.message?.includes('Failed to fetch')

  const handleReload = () => {
    // For chunk loading errors, clear cache and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name)
        })
      }).finally(() => {
        window.location.reload()
      })
    } else {
      window.location.reload()
    }
  }

  if (isChunkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6 text-yellow-600" />
            </div>
            <CardTitle>Loading Issue</CardTitle>
            <CardDescription>
              The application needs to reload to fetch the latest updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              This usually happens when the application has been updated. 
              A quick reload will fix this.
            </p>
            <Button onClick={handleReload} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Application
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle>Something went wrong!</CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <details className="text-left text-sm bg-gray-100 p-2 rounded">
              <summary className="cursor-pointer">Error Details</summary>
              <pre className="mt-2 text-xs overflow-auto">
                {error.message}
                {error.stack}
              </pre>
            </details>
          )}
          <div className="space-y-2">
            <Button onClick={reset} className="w-full">
              Try again
            </Button>
            <Button variant="outline" onClick={handleReload} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}