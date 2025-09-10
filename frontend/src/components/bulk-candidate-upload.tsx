"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, Download, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BulkCandidateUploadProps {
  onClose: () => void
  onCandidatesCreated?: (candidates: any[]) => void
}

export default function BulkCandidateUpload({ onClose, onCandidatesCreated }: BulkCandidateUploadProps) {
  const { toast } = useToast()
  const [isDragActive, setIsDragActive] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<{
    total: number
    success: number
    failed: number
    errors: string[]
    candidates?: any[]
  } | null>(null)
  const [parsedCandidates, setParsedCandidates] = useState<any[]>([])

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    const validFiles = droppedFiles.filter(file => 
      file.type === 'application/pdf' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword' ||
      file.name.toLowerCase().endsWith('.pdf') ||
      file.name.toLowerCase().endsWith('.docx') ||
      file.name.toLowerCase().endsWith('.doc')
    )
    
    if (validFiles.length !== droppedFiles.length) {
      toast({
        title: "Invalid Files",
        description: "Please only upload PDF or Word documents (.pdf, .docx, .doc).",
        variant: "destructive"
      })
    }
    
    setFiles(validFiles)
  }, [toast])

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      const validFiles = selectedFiles.filter(file => 
        file.type === 'application/pdf' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword' ||
        file.name.toLowerCase().endsWith('.pdf') ||
        file.name.toLowerCase().endsWith('.docx') ||
        file.name.toLowerCase().endsWith('.doc')
      )
      
      if (validFiles.length !== selectedFiles.length) {
        toast({
          title: "Invalid Files",
          description: "Please only upload PDF or Word documents (.pdf, .docx, .doc).",
          variant: "destructive"
        })
      }
      
      setFiles(validFiles)
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      const parsedCandidates = []
      const errors = []
      let processedFiles = 0

      toast({
        title: "Processing Resumes",
        description: `Starting to parse ${files.length} resume(s)...`,
        variant: "default"
      })

      // Process files in parallel for faster parsing
      const parsePromises = files.map(async (file) => {
        try {
          const formData = new FormData()
          formData.append('file', file)
          
          const parseResponse = await fetch('http://localhost:8000/api/parse-resume/', {
            method: 'POST',
            body: formData,
          })
          
          if (parseResponse.ok) {
            const parsedData = await parseResponse.json()
            return {
              success: true,
              data: {
                ...parsedData,
                source: 'Bulk Upload',
                fileName: file.name
              }
            }
          } else {
            const errorData = await parseResponse.json()
            return {
              success: false,
              error: `${file.name}: ${errorData.error || 'Failed to parse'}`
            }
          }
        } catch (error) {
          return {
            success: false,
            error: `${file.name}: Network error - ${error.message}`
          }
        }
      })

      // Wait for all files to be processed
      const results = await Promise.all(parsePromises)
      
      // Separate successful parses from errors
      results.forEach(result => {
        if (result.success) {
          parsedCandidates.push(result.data)
        } else {
          errors.push(result.error)
        }
      })

      setUploadProgress(80) // 80% for parsing complete

      // Bulk create candidates if we have parsed data
      if (parsedCandidates.length > 0) {
        toast({
          title: "Creating Candidates",
          description: `Creating ${parsedCandidates.length} candidate record(s)...`,
          variant: "default"
        })

        const createResponse = await fetch('http://localhost:8000/api/bulk-create-candidates/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            candidates: parsedCandidates
          }),
        })

        if (createResponse.ok) {
          const createResult = await createResponse.json()
          
          // Combine parsing and creation errors
          const allErrors = [...errors, ...createResult.errors]
          
          setUploadResults({
            total: files.length,
            success: createResult.success,
            failed: files.length - createResult.success,
            errors: allErrors,
            candidates: createResult.candidates || []
          })

          // Notify parent component about new candidates
          if (onCandidatesCreated && createResult.candidates) {
            onCandidatesCreated(createResult.candidates)
          }

          // Close the popup after a short delay to show results
          setTimeout(() => {
            onClose()
          }, 3000) // Close after 3 seconds
          
          toast({
            title: "Bulk Upload Complete",
            description: `Successfully created ${createResult.success} candidate(s) from ${files.length} resume(s).`,
            variant: createResult.success > 0 ? "default" : "destructive"
          })
        } else {
          throw new Error('Failed to create candidates')
        }
      } else {
        // No candidates could be parsed
        setUploadResults({
          total: files.length,
          success: 0,
          failed: files.length,
          errors
        })
        
        toast({
          title: "Upload Failed",
          description: "Could not parse any resumes successfully. Please check file formats and try again.",
          variant: "destructive"
        })
      }
      
      setUploadProgress(100)
      
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload Failed",
        description: "Failed to process resumes. Please check your connection and try again.",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    // In a real app, this would trigger a template download
    toast({
      title: "Template Download",
      description: "Template file would be downloaded.",
      variant: "default"
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Candidate Upload
          </CardTitle>
          <p className="text-sm text-black">
            Upload multiple candidate resumes at once using PDF or Word documents.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-black">
              <p>Need a template? Download our sample format:</p>
            </div>
            <button 
              onClick={downloadTemplate}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
          </div>

          <input
            type="file"
            multiple
            accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            onChange={onFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-gray-600" />
                </div>
                <div>
                  <p className="text-lg font-medium text-black">
                    {isDragActive ? 'Drop files here' : 'Click to browse files or drag & drop'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Supports PDF and Word documents (.pdf, .docx, .doc)
                  </p>
                </div>
                <div className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200 inline-flex items-center gap-2 text-sm font-medium">
                  <Upload className="h-4 w-4" />
                  Browse Files
                </div>
              </div>
            </div>
          </label>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium text-black">Selected Files:</p>
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-black">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                  <span className="text-gray-600">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ))}
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-black">
                <span>
                  {uploadProgress < 80 
                    ? `Parsing ${files.length} resume(s)...` 
                    : uploadProgress < 100 
                    ? "Creating candidate records..." 
                    : "Processing complete!"
                  }
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              <div className="text-xs text-gray-600">
                Processing {files.length} file(s) simultaneously for faster results
              </div>
            </div>
          )}

          {uploadResults && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-black">Upload Complete</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-black">{uploadResults.total}</div>
                      <div className="text-sm text-gray-600">Total</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{uploadResults.success}</div>
                      <div className="text-sm text-gray-600">Success</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{uploadResults.failed}</div>
                      <div className="text-sm text-gray-600">Failed</div>
                    </div>
                  </div>

                  {uploadResults.errors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="font-medium text-sm text-black">Errors:</span>
                      </div>
                      <ul className="text-sm space-y-1 text-gray-600">
                        {uploadResults.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Display Created Candidates */}
                  {uploadResults.candidates && uploadResults.candidates.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <h4 className="font-medium text-black">Successfully Created Candidates:</h4>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {uploadResults.candidates.map((candidate, index) => (
                          <div key={candidate.id || index} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-black">
                                  {candidate.full_name || `${candidate.first_name} ${candidate.last_name}`.trim()}
                                </p>
                                <p className="text-sm text-gray-600">{candidate.email}</p>
                                {candidate.phone && (
                                  <p className="text-sm text-gray-600">{candidate.phone}</p>
                                )}
                                {candidate.experience_level && (
                                  <p className="text-sm text-gray-600">
                                    Experience: {candidate.experience_level}
                                  </p>
                                )}
                              </div>
                              <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                Created
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <button 
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              Close
            </button>
            <button 
              onClick={handleUpload} 
              disabled={files.length === 0 || isUploading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "Processing..." : "Parse Resumes"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}