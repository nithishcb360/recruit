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
      const parsedCandidates: any[] = []
      const errors: any[] = []
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
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 180000) // 3 minute timeout for PyTorch model
          
          const parseResponse = await fetch('http://localhost:8000/api/parse-resume/', {
            method: 'POST',
            body: formData,
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
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
          let errorMessage = 'Unknown error'
          if (error instanceof Error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
              errorMessage = 'Backend server unavailable'
            } else if (error.name === 'AbortError' || error.message.includes('AbortError') || error.message.includes('aborted')) {
              errorMessage = 'Processing timeout (PyTorch model may be initializing on first run)'
            } else {
              errorMessage = error.message
            }
          }
          return {
            success: false,
            error: `${file.name}: ${errorMessage}`
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

        const createController = new AbortController()
        const createTimeoutId = setTimeout(() => createController.abort(), 60000) // 1 minute timeout for bulk create
        
        const createResponse = await fetch('http://localhost:8000/api/bulk-create-candidates/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            candidates: parsedCandidates
          }),
          signal: createController.signal
        })
        
        clearTimeout(createTimeoutId)

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
          const errorData = await createResponse.json().catch(() => ({}))
          throw new Error(errorData.error || `Server error: ${createResponse.status}`)
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
    <div className="min-h-[600px]">
      {/* Modern Header */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-8 rounded-t-2xl text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Bulk Candidate Upload</h2>
              <p className="text-blue-100 mt-1">
                Upload multiple resumes and automatically create candidate profiles
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all duration-200"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white p-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-xl border border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-700 font-medium">Success Rate</p>
                <p className="text-2xl font-bold text-green-800">95%+</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-100 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium">Formats</p>
                <p className="text-lg font-bold text-blue-800">PDF, DOC</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-4 rounded-xl border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <Upload className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-700 font-medium">Batch Size</p>
                <p className="text-lg font-bold text-purple-800">No Limit</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
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
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer group ${
              isDragActive 
                ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-100 shadow-lg transform scale-105' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 hover:shadow-md'
            }`}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            {/* Background Decoration */}
            <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl"></div>
            
            <div className="relative space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Upload className="h-10 w-10 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-800">
                  {isDragActive ? 'Drop your files here' : 'Upload Candidate Resumes'}
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Drag & drop your resume files or click to browse. We'll automatically extract candidate information and create profiles.
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mt-4">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    PDF Files
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Word Documents
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Batch Processing
                  </span>
                </div>
              </div>
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl transition-all duration-300 inline-flex items-center gap-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                <Upload className="h-5 w-5" />
                Choose Files
              </button>
            </div>
          </div>
        </label>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Selected Files ({files.length})
              </h3>
              <div className="text-sm text-gray-500">
                Total: {(files.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
            <div className="grid gap-3 max-h-48 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 truncate max-w-xs">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type === 'application/pdf' ? 'PDF' : 'Word Document'}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                    Ready
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing Animation */}
        {isUploading && (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-2xl p-8 border border-purple-200">
            <div className="text-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto animate-pulse shadow-lg">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-800">
                  {uploadProgress < 80 
                    ? `🔍 Parsing ${files.length} Resume${files.length > 1 ? 's' : ''}...` 
                    : uploadProgress < 100 
                    ? "⚡ Creating Candidate Profiles..." 
                    : "✅ Processing Complete!"
                  }
                </h3>
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                    <span>Progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-3 bg-white/80" />
                </div>
                <p className="text-sm text-purple-700">
                  ⚡ Processing {files.length} file(s) simultaneously for maximum speed
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {uploadResults && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-8 border border-green-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-green-800 mb-2">Upload Complete! 🎉</h3>
              <p className="text-green-700">Your candidates have been processed successfully</p>
            </div>
            
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl text-center border border-white/50">
                <div className="text-3xl font-bold text-gray-800">{uploadResults.total}</div>
                <div className="text-sm font-medium text-gray-600 mt-1">Total Files</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div className="bg-gray-400 h-2 rounded-full" style={{width: '100%'}}></div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl text-center border border-white/50">
                <div className="text-3xl font-bold text-green-600">{uploadResults.success}</div>
                <div className="text-sm font-medium text-gray-600 mt-1">Successful</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div className="bg-green-500 h-2 rounded-full" style={{width: `${(uploadResults.success / uploadResults.total) * 100}%`}}></div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl text-center border border-white/50">
                <div className="text-3xl font-bold text-red-600">{uploadResults.failed}</div>
                <div className="text-sm font-medium text-gray-600 mt-1">Failed</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div className="bg-red-500 h-2 rounded-full" style={{width: uploadResults.failed > 0 ? `${(uploadResults.failed / uploadResults.total) * 100}%` : '0%'}}></div>
                </div>
              </div>
            </div>

            {uploadResults.errors.length > 0 && (
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/50">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold text-amber-800">Processing Errors ({uploadResults.errors.length})</span>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {uploadResults.errors.map((error, index) => (
                    <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Display Created Candidates */}
            {uploadResults.candidates && uploadResults.candidates.length > 0 && (
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/50 mt-6">
                <h4 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Successfully Created Candidates ({uploadResults.candidates.length})
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-3">
                  {uploadResults.candidates.map((candidate, index) => (
                    <div key={candidate.id || index} className="bg-white p-4 rounded-xl shadow-sm border border-green-200 hover:shadow-md transition-all duration-200">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
                            {(candidate.full_name || `${candidate.first_name} ${candidate.last_name}`.trim()).charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {candidate.full_name || `${candidate.first_name} ${candidate.last_name}`.trim()}
                            </p>
                            <p className="text-sm text-gray-600">{candidate.email || 'No email provided'}</p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              {candidate.phone && <span>📞 {candidate.phone}</span>}
                              {candidate.experience_level && <span>💼 {candidate.experience_level}</span>}
                              {candidate.location && <span>📍 {candidate.location}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs bg-green-500 text-white px-3 py-1 rounded-full font-medium shadow-sm">
                          ✓ Created
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Download className="h-4 w-4" />
            <button 
              onClick={downloadTemplate}
              className="hover:text-blue-600 transition-colors duration-200 font-medium"
            >
              Download Resume Template
            </button>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl transition-all duration-200 font-medium hover:shadow-md"
            >
              {uploadResults ? 'Close' : 'Cancel'}
            </button>
            {!uploadResults && (
              <button 
                onClick={handleUpload} 
                disabled={files.length === 0 || isUploading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Parse {files.length} Resume{files.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}