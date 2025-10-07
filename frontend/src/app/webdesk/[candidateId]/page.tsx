"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
import { getFeedbackTemplates, type FeedbackTemplate, type Question as FeedbackQuestion } from '@/lib/api/feedback-templates'

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

// Convert feedback form questions to assessment questions
function convertFeedbackQuestionsToAssessment(feedbackQuestions: FeedbackQuestion[]): Question[] {
  return feedbackQuestions.map((fq, index) => {
    let type: 'mcq' | 'coding' | 'text' = 'text'
    let options: string[] | undefined
    let correctAnswer: number | undefined

    // Map feedback question types to assessment types
    if (fq.type === 'radio' && fq.options && fq.options.length > 0) {
      type = 'mcq'
      options = fq.options
      // If there's an answer field, try to find the correct answer index
      if (fq.answer && fq.options.includes(fq.answer)) {
        correctAnswer = fq.options.indexOf(fq.answer)
      }
    } else if (fq.type === 'program') {
      type = 'coding'
    } else {
      type = 'text'
    }

    // Calculate points based on question type
    const points = type === 'coding' ? 25 : type === 'mcq' ? 10 : 20

    return {
      id: index + 1,
      question: fq.text,
      type,
      options,
      correctAnswer,
      points
    }
  })
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
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const candidateId = params.candidateId as string
  const formId = searchParams.get('formId')
  const assigneeEmail = searchParams.get('assigneeEmail')

  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>(assessmentQuestions)
  const [loadingQuestions, setLoadingQuestions] = useState(!!formId)
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

  // Debug log for URL parameters (client-side only)
  useEffect(() => {
    console.log('🔍 WebDesk URL Parameters:', {
      candidateId,
      formId,
      assigneeEmail,
      fullUrl: typeof window !== 'undefined' ? window.location.href : 'N/A'
    })
  }, [candidateId, formId, assigneeEmail])

  // Load feedback form questions if formId is provided
  useEffect(() => {
    const loadFeedbackFormQuestions = async () => {
      if (!formId) {
        setLoadingQuestions(false)
        return
      }

      try {
        setLoadingQuestions(true)

        // First try localStorage (for forms created in current session)
        const localForms = localStorage.getItem('feedbackForms')
        if (localForms) {
          const forms: FeedbackTemplate[] = JSON.parse(localForms)
          const form = forms.find(f => f.id.toString() === formId)

          if (form && form.questions && form.questions.length > 0) {
            const convertedQuestions = convertFeedbackQuestionsToAssessment(form.questions)
            setQuestions(convertedQuestions)
            setLoadingQuestions(false)
            return
          }
        }

        // If not found in localStorage, try API
        const response = await getFeedbackTemplates()
        const forms = response.results
        const form = forms.find(f => f.id.toString() === formId)

        if (form && form.questions && form.questions.length > 0) {
          const convertedQuestions = convertFeedbackQuestionsToAssessment(form.questions)
          setQuestions(convertedQuestions)
        } else {
          console.warn(`No questions found for feedback form ${formId}, using default questions`)
          setQuestions(assessmentQuestions)
        }
      } catch (error) {
        console.error('Error loading feedback form questions:', error)
        console.warn('Using default questions')
        setQuestions(assessmentQuestions)
      } finally {
        setLoadingQuestions(false)
      }
    }

    loadFeedbackFormQuestions()
  }, [formId])

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

  // Note: We don't add cleanup useEffect here to avoid stopping camera on state changes
  // Camera will only stop when:
  // 1. User submits the assessment (handleSubmit calls stopMediaRecording)
  // 2. User gets disqualified (auto-submit calls stopMediaRecording)
  // 3. User clicks exit button (explicitly calls stopMediaRecording)

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

    questions.forEach(q => {
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

  // Function to send assessment email to assignee
  const sendAssessmentEmailToAssignee = async (score: number, timeTaken: number) => {
    console.log('sendAssessmentEmailToAssignee called with:', { score, timeTaken, assigneeEmail, candidateId })

    if (!candidate || !assigneeEmail) {
      console.error('Missing candidate or assigneeEmail:', { candidate: !!candidate, assigneeEmail })
      return
    }

    try {
      console.log('Fetching updated candidate data...')
      // Get video URLs from candidate data (after recordings are uploaded)
      const updatedCandidateResponse = await fetch(`http://localhost:8000/api/candidates/${candidateId}/`)

      if (!updatedCandidateResponse.ok) {
        throw new Error(`Failed to fetch candidate data: ${updatedCandidateResponse.status}`)
      }

      const updatedCandidate = await updatedCandidateResponse.json()
      console.log('Updated candidate data received:', {
        hasVideoRecording: !!updatedCandidate.assessment_video_recording,
        hasScreenRecording: !!updatedCandidate.assessment_screen_recording
      })

      const videoUrl = updatedCandidate.assessment_video_recording
        ? (updatedCandidate.assessment_video_recording.startsWith('http')
            ? updatedCandidate.assessment_video_recording
            : `http://localhost:8000${updatedCandidate.assessment_video_recording}`)
        : null

      const screenUrl = updatedCandidate.assessment_screen_recording
        ? (updatedCandidate.assessment_screen_recording.startsWith('http')
            ? updatedCandidate.assessment_screen_recording
            : `http://localhost:8000${updatedCandidate.assessment_screen_recording}`)
        : null

      const fromEmail = process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'hr@company.com'
      const subject = `WebDesk Assessment Results - ${candidate.first_name} ${candidate.last_name}`
      const candidateName = `${candidate.first_name} ${candidate.last_name}`

      const emailBody = `Assessment Results for ${candidateName}

Candidate Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${candidateName}
Email: ${candidate.email}

Assessment Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score: ${score}%
Status: ${score < 60 ? 'DISQUALIFIED' : 'PASSED'}
Tab Switches: ${tabSwitchCount || 0}
Time Taken: ${Math.round(timeTaken / 60)} minutes

Assessment Recordings:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${videoUrl ? `📷 Camera Recording:
   - Attachment: camera_recording_${candidateId}.mp4
   - Link: ${videoUrl}` : '📷 Camera Recording: Not available'}

${screenUrl ? `🖥️ Screen Recording:
   - Attachment: screen_recording_${candidateId}.mp4
   - Link: ${screenUrl}` : '🖥️ Screen Recording: Not available'}

Note: Videos are attached to this email. You can also view them using the links above.

Please review the attached assessment recordings and results.

Best regards,
Recruitment Team
${fromEmail}`

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Assessment Results for ${candidateName}</h2>

          <div style="background-color: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Candidate Information</h3>
            <p><strong>Name:</strong> ${candidateName}</p>
            <p><strong>Email:</strong> ${candidate.email}</p>
          </div>

          <div style="background-color: ${score < 60 ? '#fef2f2' : '#f0fdf4'}; border: 2px solid ${score < 60 ? '#ef4444' : '#22c55e'}; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: ${score < 60 ? '#991b1b' : '#166534'}; margin-top: 0;">Assessment Details</h3>
            <p><strong>Score:</strong> <span style="font-size: 24px; font-weight: bold; color: ${score < 60 ? '#dc2626' : '#16a34a'};">${score}%</span></p>
            <p><strong>Status:</strong> <span style="font-weight: bold; color: ${score < 60 ? '#dc2626' : '#16a34a'};">${score < 60 ? 'DISQUALIFIED' : 'PASSED'}</span></p>
            <p><strong>Tab Switches:</strong> ${tabSwitchCount || 0}</p>
            <p><strong>Time Taken:</strong> ${Math.round(timeTaken / 60)} minutes</p>
          </div>

          <div style="background-color: #fefce8; border: 2px solid #eab308; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #854d0e; margin-top: 0;">📹 Assessment Recordings</h3>

            ${videoUrl ? `
              <div style="background-color: #fff; border: 1px solid #d97706; border-radius: 6px; padding: 15px; margin-bottom: 15px;">
                <p style="margin: 0 0 10px 0;"><strong style="color: #854d0e;">📷 Camera Recording:</strong></p>
                <p style="margin: 5px 0; font-size: 14px;">
                  📎 <strong>Attachment:</strong> camera_recording_${candidateId}.mp4
                </p>
                <p style="margin: 5px 0; font-size: 14px;">
                  🔗 <strong>Direct Link:</strong> <a href="${videoUrl}" style="color: #2563eb; word-break: break-all;">${videoUrl}</a>
                </p>
              </div>
            ` : '<p><strong>📷 Camera Recording:</strong> Not available</p>'}

            ${screenUrl ? `
              <div style="background-color: #fff; border: 1px solid #d97706; border-radius: 6px; padding: 15px; margin-bottom: 10px;">
                <p style="margin: 0 0 10px 0;"><strong style="color: #854d0e;">🖥️ Screen Recording:</strong></p>
                <p style="margin: 5px 0; font-size: 14px;">
                  📎 <strong>Attachment:</strong> screen_recording_${candidateId}.mp4
                </p>
                <p style="margin: 5px 0; font-size: 14px;">
                  🔗 <strong>Direct Link:</strong> <a href="${screenUrl}" style="color: #2563eb; word-break: break-all;">${screenUrl}</a>
                </p>
              </div>
            ` : '<p><strong>🖥️ Screen Recording:</strong> Not available</p>'}

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin-top: 15px;">
              <p style="margin: 0; color: #78350f; font-size: 13px;">
                💡 <strong>Tip:</strong> Videos are attached to this email as MP4 files. You can download them directly or use the links above to view them online.
              </p>
            </div>
          </div>

          <p style="margin-top: 30px; color: #6b7280;">Please review the attached assessment recordings and results.</p>

          <p style="margin-top: 30px;">
            Best regards,<br/>
            <strong>Recruitment Team</strong><br/>
            ${fromEmail}
          </p>
        </div>
      `

      // Prepare attachments
      const attachments: any[] = []

      if (videoUrl) {
        try {
          const videoResponse = await fetch(videoUrl)
          const videoBlob = await videoResponse.blob()
          const videoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1]
              resolve(base64)
            }
            reader.readAsDataURL(videoBlob)
          })

          attachments.push({
            filename: `camera_recording_${candidateId}.mp4`,
            content: videoBase64,
            encoding: 'base64',
            contentType: 'video/mp4'
          })
        } catch (error) {
          console.error('Error fetching camera recording:', error)
        }
      }

      if (screenUrl) {
        try {
          const screenResponse = await fetch(screenUrl)
          const screenBlob = await screenResponse.blob()
          const screenBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1]
              resolve(base64)
            }
            reader.readAsDataURL(screenBlob)
          })

          attachments.push({
            filename: `screen_recording_${candidateId}.mp4`,
            content: screenBase64,
            encoding: 'base64',
            contentType: 'video/mp4'
          })
        } catch (error) {
          console.error('Error fetching screen recording:', error)
        }
      }

      // Send email
      console.log(`Sending email to ${assigneeEmail} with ${attachments.length} attachments...`)

      const emailResponse = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: assigneeEmail,
          subject,
          text: emailBody,
          html: emailHtml,
          attachments: attachments
        })
      })

      if (!emailResponse.ok) {
        throw new Error(`Email API returned status: ${emailResponse.status}`)
      }

      const result = await emailResponse.json()
      console.log('Email API response:', result)

      if (result.success) {
        console.log(`✅ Assessment results sent successfully to ${assigneeEmail}`)
      } else {
        console.error('❌ Failed to send email:', result.message)
        throw new Error(result.message || 'Email sending failed')
      }
    } catch (error) {
      console.error('Error in sendAssessmentEmailToAssignee:', error)
      throw error
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    stopMediaRecording()

    const result = calculateScore()
    const timeTaken = 3600 - timeRemaining

    // Prepare full responses with questions and answers
    const fullResponses = questions.map(question => ({
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

        // Automatically send email to assignee if email is provided
        if (assigneeEmail && assigneeEmail.trim() !== '' && assigneeEmail !== 'null' && assigneeEmail !== 'undefined') {
          console.log(`Attempting to send email to assignee: ${assigneeEmail}`)

          // Add a small delay to ensure videos are fully saved
          await new Promise(resolve => setTimeout(resolve, 2000))

          try {
            await sendAssessmentEmailToAssignee(result.percentage, timeTaken)
            console.log('Email sent successfully to assignee')

            toast({
              title: "Assessment Submitted Successfully",
              description: `Assessment results have been sent to ${assigneeEmail}. You may now close this window.`,
              variant: "default"
            })
          } catch (emailError) {
            console.error('Error sending email to assignee:', emailError)
            toast({
              title: "Assessment Submitted",
              description: "Assessment submitted but email sending failed. Please contact HR.",
              variant: "default"
            })
          }
        } else {
          console.log('No assignee email provided, skipping auto-send')
          toast({
            title: "Assessment Submitted Successfully",
            description: "Thank you for completing the assessment. You may now close this window.",
            variant: "default"
          })
        }
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

  const progress = ((currentQuestion + 1) / questions.length) * 100
  const question = questions[currentQuestion]
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
                  <span className="font-bold text-black">{answeredCount} / {questions.length}</span>
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
                <li>• Total Questions: {questions.length}</li>
                <li>• Time Limit: 60 minutes</li>
                <li>• Total Points: {questions.reduce((sum, q) => sum + q.points, 0)}</li>
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
                Question {currentQuestion + 1} of {questions.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-gray-800">
              <span>Answered: {answeredCount}</span>
              <span>Remaining: {questions.length - answeredCount}</span>
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
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                    currentQuestion === index
                      ? 'bg-blue-600 text-white'
                      : answers[questions[index].id] !== undefined
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-black hover:bg-gray-400'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {currentQuestion === questions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
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
