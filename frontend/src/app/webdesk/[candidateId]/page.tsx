"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { CodeEditor } from "@/components/ui/code-editor"
import { useToast } from "@/hooks/use-toast"
import { Clock, CheckCircle, AlertCircle, X } from 'lucide-react'

interface Question {
  id: number
  question: string
  type: 'mcq' | 'coding' | 'text'
  options?: string[]
  correctAnswer?: number
  points: number
}

interface Candidate {
  id: number
  first_name: string
  last_name: string
  email: string
  assessment_username?: string
  assessment_password?: string
}

const assessmentQuestions: Question[] = [
  {
    id: 1,
    question: "What is the time complexity of binary search?",
    type: "mcq",
    options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
    correctAnswer: 1,
    points: 10
  },
  {
    id: 2,
    question: "Which data structure uses LIFO (Last In First Out)?",
    type: "mcq",
    options: ["Queue", "Stack", "Array", "Linked List"],
    correctAnswer: 1,
    points: 10
  },
  {
    id: 3,
    question: "Write a function that checks if a given string is a palindrome (reads the same forwards and backwards). You can use any programming language.",
    type: "coding",
    points: 25
  },
  {
    id: 4,
    question: "What does REST stand for in web services?",
    type: "mcq",
    options: [
      "Remote Execution Service Technology",
      "Representational State Transfer",
      "Resource Execution and State Transfer",
      "Remote Service Technology"
    ],
    correctAnswer: 1,
    points: 10
  },
  {
    id: 5,
    question: "Explain the difference between SQL and NoSQL databases. When would you use each?",
    type: "text",
    points: 20
  },
  {
    id: 6,
    question: "Write a function to find the factorial of a number. Test it with input 5 (expected output: 120).",
    type: "coding",
    points: 25
  },
  {
    id: 7,
    question: "What is the purpose of virtual DOM in React?",
    type: "mcq",
    options: [
      "To make the app faster by avoiding direct DOM manipulation",
      "To store component state",
      "To handle routing",
      "To manage API calls"
    ],
    correctAnswer: 0,
    points: 10
  }
]

export default function WebDeskAssessment() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const candidateId = params.candidateId as string

  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string | number>>({})
  const [timeRemaining, setTimeRemaining] = useState(3600) // 60 minutes in seconds
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [assessmentStarted, setAssessmentStarted] = useState(false)
  const [assessmentCompleted, setAssessmentCompleted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [screenRecorder, setScreenRecorder] = useState<MediaRecorder | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [screenChunks, setScreenChunks] = useState<Blob[]>([])
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [mediaPermissionGranted, setMediaPermissionGranted] = useState(false)
  const [showPermissionError, setShowPermissionError] = useState(false)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false)

  useEffect(() => {
    fetchCandidate()
    // Request fullscreen on mount
    requestFullscreen()
  }, [candidateId])

  const requestFullscreen = () => {
    const elem = document.documentElement
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.log('Fullscreen request failed:', err)
      })
    }
  }

  const startMediaRecording = async () => {
    try {
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      })

      setMediaStream(stream)
      setMediaPermissionGranted(true)
      setShowPermissionError(false)

      // Display video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Start camera/audio recording
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      })

      const chunks: Blob[] = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
          setRecordedChunks(prev => [...prev, event.data])
        }
      }

      recorder.start(1000) // Collect data every second
      setMediaRecorder(recorder)

      // Request screen capture
      try {
        const screenStreamData = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            logicalSurface: true,
            cursor: 'always'
          } as any,
          audio: false
        })

        setScreenStream(screenStreamData)

        // Start screen recording
        const screenRec = new MediaRecorder(screenStreamData, {
          mimeType: 'video/webm;codecs=vp9'
        })

        const screenChunksLocal: Blob[] = []
        screenRec.ondataavailable = (event) => {
          if (event.data.size > 0) {
            screenChunksLocal.push(event.data)
            setScreenChunks(prev => [...prev, event.data])
          }
        }

        screenRec.start(1000)
        setScreenRecorder(screenRec)

        // Handle screen share stop
        screenStreamData.getVideoTracks()[0].onended = () => {
          toast({
            title: "Screen Sharing Stopped",
            description: "You stopped sharing your screen. Assessment may be terminated.",
            variant: "destructive"
          })
        }

        setIsRecording(true)

        toast({
          title: "Recording Started",
          description: "Camera, microphone, and screen recording are now active",
          variant: "default"
        })

        return true
      } catch (screenError) {
        console.error('Error starting screen recording:', screenError)

        // Stop camera recording if screen sharing fails
        recorder.stop()
        stream.getTracks().forEach(track => track.stop())

        toast({
          title: "Screen Sharing Required",
          description: "You must share your screen to take the assessment.",
          variant: "destructive"
        })

        return false
      }
    } catch (error) {
      console.error('Error starting media recording:', error)
      setMediaPermissionGranted(false)
      setShowPermissionError(true)

      toast({
        title: "Camera/Mic Access Required",
        description: "You must allow camera and microphone access to take the assessment.",
        variant: "destructive"
      })

      return false
    }
  }

  const stopMediaRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
    }

    if (screenRecorder) {
      screenRecorder.stop()
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      setMediaStream(null)
    }

    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop())
      setScreenStream(null)
    }

    toast({
      title: "Recording Stopped",
      description: "Assessment recording has been saved",
      variant: "default"
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [mediaStream, screenStream])

  // Detect tab switching and prevent cheating
  useEffect(() => {
    if (!assessmentStarted || assessmentCompleted) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tab or minimized window
        setTabSwitchCount(prev => {
          const newCount = prev + 1
          setShowTabSwitchWarning(true)

          if (newCount >= 3) {
            // Terminate assessment after 3 violations
            toast({
              title: "❌ Assessment Terminated",
              description: "Too many tab switches detected. Assessment is being closed.",
              variant: "destructive"
            })

            // Stop recording
            stopMediaRecording()

            // Submit with disqualification
            setTimeout(async () => {
              try {
                await fetch(`http://localhost:8000/api/candidates/${candidateId}/`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    assessment_score: 0,
                    assessment_completed: true,
                    assessment_time_taken: 3600 - timeRemaining,
                    assessment_tab_switches: newCount,
                    assessment_disqualified: true
                  })
                })
              } catch (error) {
                console.error('Error submitting disqualification:', error)
              }

              // Close window after 3 seconds
              setTimeout(() => {
                alert('Assessment has been terminated due to multiple violations. This window will now close.')
                window.close()
              }, 3000)
            }, 1000)
          } else {
            toast({
              title: "⚠️ Warning: Tab Switch Detected",
              description: `Violation ${newCount} of 3: Stay on assessment page. ${3 - newCount} violations remaining before disqualification.`,
              variant: "destructive"
            })

            // Auto-hide warning after 5 seconds
            setTimeout(() => setShowTabSwitchWarning(false), 5000)
          }

          return newCount
        })
      }
    }

    const handleBlur = () => {
      // Window lost focus
      console.log('Window blur detected')
    }

    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      toast({
        title: "Action Blocked",
        description: "Right-click is disabled during assessment",
        variant: "destructive"
      })
    }

    // Disable keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common shortcuts
      if (
        e.key === 'F12' || // DevTools
        (e.ctrlKey && e.shiftKey && e.key === 'I') || // DevTools
        (e.ctrlKey && e.shiftKey && e.key === 'J') || // Console
        (e.ctrlKey && e.key === 'u') || // View Source
        (e.metaKey && e.altKey && e.key === 'i') || // Mac DevTools
        (e.ctrlKey && e.key === 'p') || // Print
        (e.ctrlKey && e.key === 's') || // Save
        (e.altKey && e.key === 'Tab') || // Alt+Tab
        (e.metaKey && e.key === 'Tab') // Cmd+Tab (Mac)
      ) {
        e.preventDefault()
        toast({
          title: "Action Blocked",
          description: "This keyboard shortcut is disabled during assessment",
          variant: "destructive"
        })
      }
    }

    // Disable copy-paste
    const handleCopy = (e: ClipboardEvent) => {
      // Allow copying from textarea for coding questions
      if ((e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault()
        toast({
          title: "Action Blocked",
          description: "Copy is disabled during assessment",
          variant: "destructive"
        })
      }
    }

    const handlePaste = (e: ClipboardEvent) => {
      // Allow pasting into textarea for coding questions
      if ((e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault()
        toast({
          title: "Action Blocked",
          description: "Paste is disabled during assessment",
          variant: "destructive"
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
    }
  }, [assessmentStarted, assessmentCompleted])

  useEffect(() => {
    if (assessmentStarted && !assessmentCompleted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [assessmentStarted, assessmentCompleted, timeRemaining])

  const fetchCandidate = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/candidates/${candidateId}/`)
      if (response.ok) {
        const data = await response.json()
        setCandidate(data)
      }
    } catch (error) {
      console.error('Error fetching candidate:', error)
      toast({
        title: "Error",
        description: "Failed to load candidate information",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    if (!candidate) return

    console.log('Login attempt:', {
      inputUsername: username,
      inputPassword: password,
      storedUsername: candidate.assessment_username,
      storedPassword: candidate.assessment_password,
      usernameMatch: username === candidate.assessment_username,
      passwordMatch: password === candidate.assessment_password
    })

    // Check credentials
    if (username === candidate.assessment_username && password === candidate.assessment_password) {
      setIsAuthenticated(true)
      requestFullscreen()
      toast({
        title: "Login Successful",
        description: `Welcome ${candidate.first_name} ${candidate.last_name}`,
        variant: "default"
      })
    } else {
      setLoginError('Invalid username or password')
      console.error('Login failed - credentials do not match')
      toast({
        title: "Login Failed",
        description: "Invalid username or password",
        variant: "destructive"
      })
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswer = (questionId: number, answer: string | number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const calculateScore = () => {
    let score = 0
    let maxScore = 0

    assessmentQuestions.forEach(q => {
      maxScore += q.points
      if (q.type === 'mcq' && q.correctAnswer !== undefined) {
        if (answers[q.id] === q.correctAnswer) {
          score += q.points
        }
      } else if (q.type === 'text' || q.type === 'coding') {
        // For text/coding questions, award partial points if answered
        if (answers[q.id] && String(answers[q.id]).trim().length > 20) {
          score += q.points * 0.7 // 70% credit for attempting
        }
      }
    })

    return { score, maxScore, percentage: Math.round((score / maxScore) * 100) }
  }

  const uploadRecording = async () => {
    console.log('Upload recording called', {
      cameraChunks: recordedChunks.length,
      screenChunks: screenChunks.length
    })

    if (recordedChunks.length === 0 && screenChunks.length === 0) {
      console.warn('No recording chunks to upload')
      return
    }

    try {
      // Create blobs from recorded chunks
      const cameraBlob = recordedChunks.length > 0
        ? new Blob(recordedChunks, { type: 'video/webm' })
        : null

      const screenBlob = screenChunks.length > 0
        ? new Blob(screenChunks, { type: 'video/webm' })
        : null

      console.log('Created blobs', {
        cameraSize: cameraBlob?.size,
        screenSize: screenBlob?.size
      })

      // Create form data
      const formData = new FormData()

      if (cameraBlob) {
        formData.append('assessment_video_recording', cameraBlob, `camera_${candidateId}_${Date.now()}.webm`)
        console.log('Added camera blob to FormData')
      }

      if (screenBlob) {
        formData.append('assessment_screen_recording', screenBlob, `screen_${candidateId}_${Date.now()}.webm`)
        console.log('Added screen blob to FormData')
      }

      // Upload recordings
      console.log('Uploading recordings...')
      const uploadResponse = await fetch(`http://localhost:8000/api/candidates/${candidateId}/`, {
        method: 'PATCH',
        body: formData
      })

      console.log('Upload response status:', uploadResponse.status)

      if (uploadResponse.ok) {
        const responseData = await uploadResponse.json()
        console.log('Recordings uploaded successfully', responseData)

        toast({
          title: "Recordings Uploaded",
          description: "Assessment recordings have been saved successfully",
          variant: "default"
        })
      } else {
        const errorText = await uploadResponse.text()
        console.error('Upload failed', uploadResponse.status, errorText)

        toast({
          title: "Upload Failed",
          description: `Failed to upload recordings: ${uploadResponse.status}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error uploading recording:', error)
      toast({
        title: "Upload Error",
        description: "An error occurred while uploading recordings",
        variant: "destructive"
      })
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    stopMediaRecording()

    const result = calculateScore()
    const timeTaken = 3600 - timeRemaining

    // Prepare full responses with questions and answers
    const fullResponses = assessmentQuestions.map(question => ({
      questionId: question.id,
      question: question.question,
      type: question.type,
      options: question.options || null,
      correctAnswer: question.correctAnswer !== undefined ? question.correctAnswer : null,
      points: question.points,
      candidateAnswer: answers[question.id] !== undefined ? answers[question.id] : null,
      isCorrect: question.type === 'mcq' && question.correctAnswer !== undefined
        ? answers[question.id] === question.correctAnswer
        : null
    }))

    try {
      // Upload recording first
      await uploadRecording()

      // Then submit assessment data with full responses
      const response = await fetch(`http://localhost:8000/api/candidates/${candidateId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessment_score: result.percentage,
          assessment_completed: true,
          assessment_time_taken: timeTaken,
          assessment_tab_switches: tabSwitchCount,
          assessment_responses: {
            questions: fullResponses,
            totalScore: result.score,
            maxScore: result.maxScore,
            percentage: result.percentage,
            completedAt: new Date().toISOString()
          }
        })
      })

      if (response.ok) {
        setAssessmentCompleted(true)
        toast({
          title: "Assessment Submitted Successfully",
          description: "Thank you for completing the assessment. You may now close this window.",
          variant: "default"
        })
      }
    } catch (error) {
      console.error('Error submitting assessment:', error)
      toast({
        title: "Error",
        description: "Failed to submit assessment",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const progress = ((currentQuestion + 1) / assessmentQuestions.length) * 100
  const question = assessmentQuestions[currentQuestion]
  const answeredCount = Object.keys(answers).length

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center m-0 p-0" style={{ width: '100vw', height: '100vh' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center p-6 m-0" style={{ width: '100vw', height: '100vh' }}>
        <Card className="border-red-200 bg-red-50 max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900">Candidate Not Found</h3>
              <p className="text-red-700 mt-2">The candidate information could not be loaded.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Login screen
  if (!isAuthenticated) {
    const hasCredentials = candidate.assessment_username && candidate.assessment_password

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-6 m-0" style={{ width: '100vw', height: '100vh' }}>
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">WebDesk Assessment Login</CardTitle>
            <CardDescription>Enter your credentials to start the assessment</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasCredentials && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> No credentials set for this candidate. Contact administrator.
                </p>
                <p className="text-xs text-yellow-700 mt-2">
                  Candidate ID: {candidateId}
                </p>
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="mt-1"
                />
              </div>
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {loginError}
                </div>
              )}
              <Button type="submit" className="w-full" size="lg">
                Login to Assessment
              </Button>
            </form>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your username and password were sent to your email. Please check your inbox.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (assessmentCompleted) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-6 m-0" style={{ width: '100vw', height: '100vh' }}>
        <button
          onClick={() => window.close()}
          className="fixed top-6 right-6 p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors z-50"
          title="Close"
        >
          <X className="h-6 w-6 text-gray-600" />
        </button>
        <div className="max-w-2xl w-full">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle className="text-center text-2xl text-black font-bold">
              Assessment Completed!
            </CardTitle>
            <CardDescription className="text-center text-black text-base font-medium">
              Thank you for completing the assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white rounded-lg p-6 text-center">
              <p className="text-4xl font-bold text-green-600 mb-3">✓ Completed</p>
              <p className="text-black font-semibold text-lg">Your responses have been submitted successfully</p>
              <p className="text-gray-700 mt-2">The recruitment team will review your assessment and contact you soon.</p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <h4 className="font-bold text-black mb-3">Assessment Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-black font-medium">Questions Answered:</span>
                  <span className="font-bold text-black">{answeredCount} / {assessmentQuestions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black font-medium">Time Taken:</span>
                  <span className="font-bold text-black">{formatTime(3600 - timeRemaining)}</span>
                </div>
                {tabSwitchCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-orange-700 font-medium">Tab Switches Detected:</span>
                    <span className="font-bold text-orange-700">{tabSwitchCount}</span>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={() => window.close()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Close Window
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    )
  }

  if (!assessmentStarted) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6 m-0" style={{ width: '100vw', height: '100vh' }}>
        <button
          onClick={() => window.close()}
          className="fixed top-6 right-6 p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors z-50"
          title="Close"
        >
          <X className="h-6 w-6 text-gray-600" />
        </button>
        <div className="max-w-2xl w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">WebDesk Technical Assessment</CardTitle>
            <CardDescription>
              Welcome {candidate.first_name} {candidate.last_name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">Assessment Instructions</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Total Questions: {assessmentQuestions.length}</li>
                <li>• Time Limit: 60 minutes</li>
                <li>• Total Points: {assessmentQuestions.reduce((sum, q) => sum + q.points, 0)}</li>
                <li>• You can navigate between questions</li>
                <li>• Assessment will auto-submit when time expires</li>
                <li>• Make sure to answer all questions</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">Important Notes</h3>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li>• Do not refresh the page during the assessment</li>
                <li>• Answer all questions to the best of your ability</li>
                <li>• For coding questions, write clean and readable code</li>
              </ul>
            </div>

            <Button
              onClick={async () => {
                const granted = await startMediaRecording()
                if (granted) {
                  setAssessmentStarted(true)
                }
              }}
              className="w-full"
              size="lg"
            >
              Start Assessment
            </Button>

            {showPermissionError && (
              <div className="mt-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 mb-2">Camera, Microphone, and Screen Sharing Required</h4>
                    <p className="text-sm text-red-800 mb-3">
                      You must grant camera, microphone, and screen sharing permissions to take this assessment. This is required for proctoring purposes.
                    </p>
                    <div className="text-xs text-red-700 space-y-1">
                      <p><strong>Chrome/Edge:</strong> Click the camera icon in the address bar and allow screen sharing</p>
                      <p><strong>Firefox:</strong> Click the permissions icon in the address bar and allow screen sharing</p>
                      <p><strong>Safari:</strong> Go to Safari → Settings → Websites → Camera, Microphone & Screen Recording</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-gray-100 overflow-auto m-0 p-0" style={{ width: '100vw', height: '100vh' }}>
      <button
        onClick={() => {
          if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
            stopMediaRecording()
            window.close()
          }
        }}
        className="fixed top-6 right-6 p-3 bg-white rounded-full shadow-lg hover:bg-red-50 hover:shadow-xl transition-all z-50"
        title="Exit Assessment"
      >
        <X className="h-6 w-6 text-red-600" />
      </button>

      {/* Tab Switch Warning Banner */}
      {showTabSwitchWarning && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl border-4 border-red-800">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 animate-pulse" />
              <div>
                <h3 className="font-bold text-lg">⚠️ VIOLATION DETECTED</h3>
                <p className="text-sm">Tab switching is not allowed. Count: {tabSwitchCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Preview - Bottom Right Corner */}
      {isRecording && (
        <div className="fixed bottom-6 right-6 z-40">
          <div className="relative bg-black rounded-lg shadow-xl overflow-hidden border-4 border-red-500">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-48 h-36 object-cover"
            />
            <div className="absolute top-2 left-2 flex items-center gap-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              REC
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl mx-auto p-8 pt-24">
      {/* Header with Timer */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-black">
                {candidate.first_name} {candidate.last_name}
              </h2>
              <p className="text-sm text-gray-900">{candidate.email}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-black">
                <Clock className="h-5 w-5" />
                <span className="text-2xl font-bold">{formatTime(timeRemaining)}</span>
              </div>
              <p className="text-xs text-gray-900">Time Remaining</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-black font-medium">Progress</span>
              <span className="font-semibold text-black">
                Question {currentQuestion + 1} of {assessmentQuestions.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-gray-800">
              <span>Answered: {answeredCount}</span>
              <span>Remaining: {assessmentQuestions.length - answeredCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg text-black">
                Question {currentQuestion + 1}
              </CardTitle>
              <CardDescription className="mt-2 text-base text-black font-medium">
                {question.question}
              </CardDescription>
            </div>
            <div className="ml-4 text-right">
              <span className="inline-block bg-blue-100 text-black text-xs font-bold px-3 py-1 rounded-full">
                {question.points} points
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {question.type === 'mcq' && question.options && (
            <RadioGroup
              value={String(answers[question.id] ?? '')}
              onValueChange={(value) => handleAnswer(question.id, parseInt(value))}
            >
              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200">
                    <RadioGroupItem value={String(index)} id={`q${question.id}-option${index}`} />
                    <Label
                      htmlFor={`q${question.id}-option${index}`}
                      className="flex-1 cursor-pointer text-black font-medium"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {question.type === 'text' && (
            <Textarea
              value={String(answers[question.id] ?? '')}
              onChange={(e) => handleAnswer(question.id, e.target.value)}
              placeholder="Type your answer here..."
              className="min-h-[200px] text-black"
            />
          )}

          {question.type === 'coding' && (
            <CodeEditor
              value={String(answers[question.id] ?? '')}
              onChange={(value) => handleAnswer(question.id, value)}
              question={question.question}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              className="text-black font-semibold border-gray-300"
            >
              Previous
            </Button>

            <div className="flex gap-2">
              {assessmentQuestions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                    currentQuestion === index
                      ? 'bg-blue-600 text-white'
                      : answers[assessmentQuestions[index].id] !== undefined
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-black hover:bg-gray-400'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {currentQuestion === assessmentQuestions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestion(prev => Math.min(assessmentQuestions.length - 1, prev + 1))}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
