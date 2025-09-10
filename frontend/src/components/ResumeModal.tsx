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

  const handleViewOriginalResume = () => {
    if (candidateId) {
      const resumeUrl = `http://localhost:8000/api/candidates/${candidateId}/resume/`
      window.open(resumeUrl, '_blank')
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