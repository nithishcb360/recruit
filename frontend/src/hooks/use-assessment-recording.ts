import { useState, useRef, useCallback, useEffect } from 'react'

interface RecordingUrls {
  videoUrl: string
  audioUrl: string
  screenUrl: string
}

export function useAssessmentRecording() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingUrls, setRecordingUrls] = useState<RecordingUrls>({
    videoUrl: '',
    audioUrl: '',
    screenUrl: ''
  })

  const videoRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRecorderRef = useRef<MediaRecorder | null>(null)
  const screenRecorderRef = useRef<MediaRecorder | null>(null)

  const videoChunksRef = useRef<Blob[]>([])
  const audioChunksRef = useRef<Blob[]>([])
  const screenChunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      // Request camera/microphone access
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      // Request screen sharing
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen' as MediaStreamConstraints['video'] & { mediaSource: string }
        } as MediaTrackConstraints
      })

      // Get audio stream separately for better quality
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })

      // Video + Audio Recorder (webcam)
      const videoRecorder = new MediaRecorder(videoStream, {
        mimeType: 'video/webm;codecs=vp9'
      })
      videoChunksRef.current = []
      videoRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data)
        }
      }
      videoRecorderRef.current = videoRecorder
      videoRecorder.start(1000) // Collect data every second

      // Audio Recorder (microphone)
      const audioRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      audioChunksRef.current = []
      audioRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      audioRecorderRef.current = audioRecorder
      audioRecorder.start(1000)

      // Screen Recorder
      const screenRecorder = new MediaRecorder(screenStream, {
        mimeType: 'video/webm;codecs=vp9'
      })
      screenChunksRef.current = []
      screenRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          screenChunksRef.current.push(event.data)
        }
      }
      screenRecorderRef.current = screenRecorder
      screenRecorder.start(1000)

      setIsRecording(true)

      return { success: true }
    } catch (error) {
      console.error('Error starting recording:', error)
      return { success: false, error }
    }
  }, [])

  const stopRecording = useCallback(async (): Promise<RecordingUrls> => {
    return new Promise((resolve) => {
      const urls: RecordingUrls = {
        videoUrl: '',
        audioUrl: '',
        screenUrl: ''
      }

      // Stop all recorders
      if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
        videoRecorderRef.current.stop()
        videoRecorderRef.current.onstop = () => {
          const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' })
          urls.videoUrl = URL.createObjectURL(videoBlob)
        }
      }

      if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
        audioRecorderRef.current.stop()
        audioRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          urls.audioUrl = URL.createObjectURL(audioBlob)
        }
      }

      if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
        screenRecorderRef.current.stop()
        screenRecorderRef.current.onstop = () => {
          const screenBlob = new Blob(screenChunksRef.current, { type: 'video/webm' })
          urls.screenUrl = URL.createObjectURL(screenBlob)

          // All recorders stopped, resolve with URLs
          setRecordingUrls(urls)
          setIsRecording(false)
          resolve(urls)
        }
      }
    })
  }, [])

  const getRecordingBlobs = useCallback(() => {
    return {
      videoBlob: videoChunksRef.current.length > 0
        ? new Blob(videoChunksRef.current, { type: 'video/webm' })
        : null,
      audioBlob: audioChunksRef.current.length > 0
        ? new Blob(audioChunksRef.current, { type: 'audio/webm' })
        : null,
      screenBlob: screenChunksRef.current.length > 0
        ? new Blob(screenChunksRef.current, { type: 'video/webm' })
        : null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRecorderRef.current) {
        videoRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      }
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      }
      if (screenRecorderRef.current) {
        screenRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return {
    isRecording,
    recordingUrls,
    startRecording,
    stopRecording,
    getRecordingBlobs
  }
}
