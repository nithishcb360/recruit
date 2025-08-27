"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, 
  Monitor, Settings, Users, Clock, MessageSquare, 
  FileText, Share2, Play, Square, Volume2, VolumeX,
  Maximize, Camera, Send, Download
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Participant {
  id: string
  name: string
  role: 'interviewer' | 'candidate' | 'observer'
  isOnline: boolean
  video: boolean
  audio: boolean
  avatar?: string
}

interface ChatMessage {
  id: string
  sender: string
  message: string
  timestamp: Date
  type: 'message' | 'system'
}

export default function InterviewPlatform() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("video")
  const [interviewNotes, setInterviewNotes] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [interviewStatus, setInterviewStatus] = useState<'waiting' | 'active' | 'ended'>('waiting')
  const [duration, setDuration] = useState(0)
  const [newMessage, setNewMessage] = useState('')
  const [volume, setVolume] = useState(75)

  // Mock interview data
  const candidate = {
    name: "Sarah Johnson",
    jobTitle: "Senior Frontend Developer",
    interviewType: "Technical Interview",
    date: "March 10, 2024",
    time: "10:00 AM PST",
    meetingId: "INT-2024-001",
  }

  const [participants, setParticipants] = useState<Participant[]>([
    { 
      id: '1', 
      name: 'Alex Chen (You)', 
      role: 'interviewer', 
      isOnline: true, 
      video: true, 
      audio: true,
      avatar: '/placeholder.svg?height=40&width=40'
    },
    { 
      id: '2', 
      name: candidate.name, 
      role: 'candidate', 
      isOnline: false, 
      video: false, 
      audio: false,
      avatar: '/placeholder.svg?height=40&width=40'
    },
    { 
      id: '3', 
      name: 'Maria Rodriguez', 
      role: 'observer', 
      isOnline: false, 
      video: false, 
      audio: false,
      avatar: '/placeholder.svg?height=40&width=40'
    }
  ])

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'System',
      message: 'Interview room created. Waiting for participants to join...',
      timestamp: new Date(Date.now() - 300000),
      type: 'system'
    }
  ])

  const interviewQuestions = [
    {
      id: 1,
      category: "Technical",
      question: "Explain the difference between `useState` and `useReducer` in React.",
      asked: false
    },
    {
      id: 2,
      category: "Technical", 
      question: "How would you optimize a React application for performance?",
      asked: false
    },
    {
      id: 3,
      category: "Behavioral",
      question: "Tell me about a challenging project you worked on recently.",
      asked: false
    },
    {
      id: 4,
      category: "System Design",
      question: "How would you design a scalable chat application?",
      asked: false
    }
  ]

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (interviewStatus === 'active') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [interviewStatus])

  // Handle joining the interview
  const handleJoinInterview = () => {
    setInterviewStatus('active')
    setParticipants(prev => prev.map(p => 
      p.role === 'candidate' 
        ? { ...p, isOnline: true, video: true, audio: true }
        : p
    ))
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'System',
      message: `${candidate.name} joined the interview`,
      timestamp: new Date(),
      type: 'system'
    }])
    toast({
      title: "Interview Started",
      description: `${candidate.name} has joined the interview.`,
      variant: "default"
    })
  }

  // Handle ending the interview
  const handleEndInterview = () => {
    setInterviewStatus('ended')
    setIsRecording(false)
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'System',
      message: 'Interview session ended',
      timestamp: new Date(),
      type: 'system'
    }])
    toast({
      title: "Interview Ended",
      description: "The interview session has been concluded.",
      variant: "default"
    })
  }

  // Toggle recording
  const toggleRecording = () => {
    setIsRecording(!isRecording)
    toast({
      title: isRecording ? "Recording Stopped" : "Recording Started",
      description: isRecording 
        ? "Interview recording has been stopped and saved."
        : "Interview is now being recorded.",
      variant: "default"
    })
  }

  // Toggle video/audio
  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn)
    setParticipants(prev => prev.map(p => 
      p.id === '1' ? { ...p, video: !isVideoOn } : p
    ))
  }

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn)
    setParticipants(prev => prev.map(p => 
      p.id === '1' ? { ...p, audio: !isAudioOn } : p
    ))
  }

  // Handle screen sharing
  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing)
    toast({
      title: isScreenSharing ? "Screen Share Stopped" : "Screen Share Started",
      description: isScreenSharing 
        ? "You stopped sharing your screen."
        : "You are now sharing your screen.",
      variant: "default"
    })
  }

  // Send chat message
  const sendMessage = () => {
    if (newMessage.trim()) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'You',
        message: newMessage,
        timestamp: new Date(),
        type: 'message'
      }])
      setNewMessage('')
    }
  }

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Interview Platform</h1>
          <p className="text-muted-foreground">
            {candidate.interviewType} with {candidate.name}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono">{formatTime(duration)}</span>
          </div>
          {interviewStatus === 'active' && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-red-600 font-medium">LIVE</span>
            </div>
          )}
          <Badge variant={interviewStatus === 'active' ? 'default' : 'secondary'}>
            {interviewStatus.charAt(0).toUpperCase() + interviewStatus.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Video Panel */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="video">Video Call</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
            </TabsList>

            <TabsContent value="video" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {/* Video Grid */}
                  <div className="relative aspect-video bg-gray-900 rounded-t-lg overflow-hidden">
                    <div className="grid grid-cols-2 h-full">
                      {/* Main video (interviewer) */}
                      <div className="relative bg-blue-900 flex items-center justify-center">
                        {isVideoOn ? (
                          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                            <Camera className="h-16 w-16 text-white/70" />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                            <VideoOff className="h-16 w-16 text-white/70" />
                          </div>
                        )}
                        <div className="absolute bottom-4 left-4 bg-black/50 px-2 py-1 rounded text-white text-sm">
                          You {!isAudioOn && <MicOff className="inline h-3 w-3 ml-1" />}
                        </div>
                      </div>
                      
                      {/* Candidate video */}
                      <div className="relative bg-green-900 flex items-center justify-center">
                        {interviewStatus === 'active' ? (
                          <div className="w-full h-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
                            <Camera className="h-16 w-16 text-white/70" />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                            <Users className="h-16 w-16 text-white/70" />
                            <div className="absolute text-white text-center">
                              <p className="text-lg font-medium">Waiting for {candidate.name}</p>
                              <p className="text-sm opacity-75">Meeting ID: {candidate.meetingId}</p>
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-4 left-4 bg-black/50 px-2 py-1 rounded text-white text-sm">
                          {candidate.name} {interviewStatus !== 'active' && '(Not joined)'}
                        </div>
                      </div>
                    </div>

                    {/* Screen sharing overlay */}
                    {isScreenSharing && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Monitor className="h-16 w-16 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold">Screen Sharing Active</h3>
                          <p className="text-sm opacity-75">Your screen is being shared with participants</p>
                        </div>
                      </div>
                    )}

                    {/* Recording indicator */}
                    {isRecording && (
                      <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full text-white text-sm flex items-center">
                        <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                        REC
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="p-4 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={isAudioOn ? "default" : "destructive"}
                        size="sm"
                        onClick={toggleAudio}
                      >
                        {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant={isVideoOn ? "default" : "destructive"}
                        size="sm"
                        onClick={toggleVideo}
                      >
                        {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant={isScreenSharing ? "default" : "outline"}
                        size="sm"
                        onClick={toggleScreenShare}
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={isRecording ? "destructive" : "outline"}
                        size="sm"
                        onClick={toggleRecording}
                      >
                        {isRecording ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2">
                      {interviewStatus === 'waiting' && (
                        <Button onClick={handleJoinInterview} className="bg-green-600 hover:bg-green-700">
                          Start Interview
                        </Button>
                      )}
                      {interviewStatus === 'active' && (
                        <Button variant="destructive" onClick={handleEndInterview}>
                          <PhoneOff className="h-4 w-4 mr-2" />
                          End Interview
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="questions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Interview Questions</CardTitle>
                  <CardDescription>Pre-planned questions for the interview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {interviewQuestions.map((question) => (
                    <div key={question.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{question.category || 'General'}</Badge>
                        <Button size="sm" variant="outline">
                          Mark as Asked
                        </Button>
                      </div>
                      <p className="text-sm">{question.question || 'No question available'}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Interview Notes</CardTitle>
                  <CardDescription>Take notes during the interview</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Take notes about the candidate's responses..."
                    value={interviewNotes}
                    onChange={(e) => setInterviewNotes(e.target.value)}
                    rows={10}
                    className="resize-none"
                  />
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-sm text-muted-foreground">
                      Auto-saved • {interviewNotes.length} characters
                    </p>
                    <Button size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export Notes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="feedback" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Post-Interview Feedback</CardTitle>
                  <CardDescription>Complete after the interview ends</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Overall Rating</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 - Excellent</SelectItem>
                        <SelectItem value="4">4 - Very Good</SelectItem>
                        <SelectItem value="3">3 - Good</SelectItem>
                        <SelectItem value="2">2 - Fair</SelectItem>
                        <SelectItem value="1">1 - Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Technical Skills</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Rate technical skills" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Exceptional</SelectItem>
                        <SelectItem value="4">Strong</SelectItem>
                        <SelectItem value="3">Adequate</SelectItem>
                        <SelectItem value="2">Below Average</SelectItem>
                        <SelectItem value="1">Weak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Communication</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Rate communication skills" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Excellent</SelectItem>
                        <SelectItem value="4">Very Good</SelectItem>
                        <SelectItem value="3">Good</SelectItem>
                        <SelectItem value="2">Fair</SelectItem>
                        <SelectItem value="1">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recommendation</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recommendation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strong-hire">Strong Hire</SelectItem>
                        <SelectItem value="hire">Hire</SelectItem>
                        <SelectItem value="lean-hire">Lean Hire</SelectItem>
                        <SelectItem value="no-hire">No Hire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full">Submit Feedback</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Participants */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Participants ({participants.filter(p => p.isOnline).length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={participant.avatar} />
                    <AvatarFallback>
                      {(participant.name || 'Unknown').split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{participant.name || 'Unknown'}</p>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${participant.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-xs text-muted-foreground">
                        {participant.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {participant.isOnline && (
                      <>
                        <div className={participant.video ? 'text-green-600' : 'text-red-600'}>
                          {participant.video ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                        </div>
                        <div className={participant.audio ? 'text-green-600' : 'text-red-600'}>
                          {participant.audio ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Chat */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ScrollArea className="h-60">
                <div className="space-y-2">
                  {chatMessages.map((message) => (
                    <div key={message.id} className={`text-xs ${
                      message.type === 'system' ? 'text-muted-foreground italic' : ''
                    }`}>
                      <span className="font-medium">{message.sender || 'Unknown'}:</span> {message.message || ''}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="text-sm"
                />
                <Button size="sm" onClick={sendMessage}>
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}