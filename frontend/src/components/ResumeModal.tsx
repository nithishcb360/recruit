"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Download, FileText } from "lucide-react"

interface ResumeModalProps {
  isOpen: boolean
  onClose: () => void
  candidateName: string
  resumeText: string
  candidateId?: number
}

export default function ResumeModal({ isOpen, onClose, candidateName, resumeText, candidateId }: ResumeModalProps) {
  const handleDownload = () => {
    // Create a text file with the resume content
    const blob = new Blob([resumeText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${candidateName.replace(/\s+/g, '_')}_Resume.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleViewOriginalResume = async () => {
    if (!candidateId) return
    
    const resumeUrl = `http://localhost:8000/api/candidates/${candidateId}/resume/`
    
    try {
      // First check if the backend is available with a quick test
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      // Suppress console errors temporarily
      const originalError = console.error
      console.error = () => {}
      
      const testResponse = await fetch(resumeUrl, {
        method: 'HEAD', // Just check if the resource exists
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      console.error = originalError
      
      // If we get here, backend is available - open the URL
      window.open(resumeUrl, '_blank')
      
    } catch (error) {
      console.error = console.error // Restore in case of error
      
      // Backend is not available - show helpful message
      const notification = document.createElement('div')
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f97316;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: system-ui;
        font-size: 14px;
        max-width: 350px;
      `
      notification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">Backend Unavailable</div>
        <div>Cannot access original resume file. Backend server is not running.</div>
      `
      
      document.body.appendChild(notification)
      
      // Auto-remove notification after 4 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 4000)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold">
            Resume - {candidateName}
          </DialogTitle>
          <div className="flex items-center gap-2">
            {candidateId && (
              <Button
                onClick={handleViewOriginalResume}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                View Original
              </Button>
            )}
            {resumeText && (
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Text
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="p-1 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {resumeText ? (
            <div className="bg-gray-50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {resumeText}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Resume Available</h3>
              <p className="text-gray-500">
                This candidate hasn't uploaded a resume yet, or the resume text couldn't be extracted.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}