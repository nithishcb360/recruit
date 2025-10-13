"use client"
 
import { Badge } from "@/components/ui/badge"
 
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Send, Trash, Edit, Save, XCircle, MessageSquareText, Star, ListChecks, Loader2, Image, Video, Calendar, Clock, Radio, CalendarClock, Eye } from "lucide-react"
import {
  getFeedbackTemplates,
  createFeedbackTemplate,
  updateFeedbackTemplate,
  deleteFeedbackTemplate,
  publishFeedbackTemplate,
  unpublishFeedbackTemplate,
  generateAIQuestions,
  type FeedbackTemplate,
  type Question,
  type FormType,
  type QuestionGenerationRequest
} from "@/lib/api/feedback-templates"
import { saveFormResponse, getFormResponses, deleteFormResponse, cleanupFormResponsesStorage, type FormResponse } from "@/lib/api/form-responses"

// Helper function for fetch with timeout and complete error suppression
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 3000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  // Store original console.error to restore later
  const originalError = console.error
  
  try {
    // Temporarily suppress console.error for fetch calls
    console.error = () => {}
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    console.error = originalError // Restore console.error
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    console.error = originalError // Restore console.error
    
    // Create a clean error without exposing connection details
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('Failed to fetch'))) {
      throw new Error('Backend unavailable')
    }
    throw error
  }
}
import { useToast } from "@/hooks/use-toast"
 
 
export default function FeedbackFormBuilder() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("forms")
  const [forms, setForms] = useState<FeedbackTemplate[]>([])
  const [editingForm, setEditingForm] = useState<FeedbackTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newQuestionText, setNewQuestionText] = useState("")
  const [newQuestionType, setNewQuestionType] = useState<Question["type"]>("text")
  const [newQuestionOptions, setNewQuestionOptions] = useState("")
  const [newQuestionRequired, setNewQuestionRequired] = useState(false)
  const [previewForm, setPreviewForm] = useState<FeedbackTemplate | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isFillingForm, setIsFillingForm] = useState(false)
  const [formResponses, setFormResponses] = useState<Record<number, any>>({})
  const [savedFormResponses, setSavedFormResponses] = useState<FormResponse[]>([])
  const [savingQuestions, setSavingQuestions] = useState<Set<number>>(new Set())
  const [builderResponses, setBuilderResponses] = useState<Record<number, any>>({})
  const [isFillingInBuilder, setIsFillingInBuilder] = useState(false)

  // New state for form type functionality
  const [selectedFormType, setSelectedFormType] = useState<FormType>('question_only')
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiTopic, setAiTopic] = useState("")
  const [aiNumQuestions, setAiNumQuestions] = useState(5)
  const [aiQuestionTypes, setAiQuestionTypes] = useState<Array<'text' | 'textarea' | 'audio' | 'video' | 'multiple_choice' | 'code'>>(['text', 'textarea'])
  const [aiConfig, setAiConfig] = useState<{provider: string; apiKey: string; customPrompt?: string} | null>(null)
  const [customPrompt, setCustomPrompt] = useState("")
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)

  // Helper functions for local storage
  const saveFormsToLocalStorage = (forms: FeedbackTemplate[]) => {
    try {
      localStorage.setItem('feedback-forms', JSON.stringify(forms))
    } catch (error) {
      console.warn('Failed to save forms to localStorage:', error)
    }
  }

  const loadFormsFromLocalStorage = (): FeedbackTemplate[] => {
    try {
      const stored = localStorage.getItem('feedback-forms')
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.warn('Failed to load forms from localStorage:', error)
      return []
    }
  }
 
  // Load AI configuration from localStorage (from organization settings)
  useEffect(() => {
    try {
      // Load organization settings to get AI config
      const orgSettings = localStorage.getItem('organizationSettings')
      if (orgSettings) {
        const settings = JSON.parse(orgSettings)
        const aiProvider = settings.general?.aiProvider
        const aiApiKey = settings.general?.aiApiKey
        const questionPrompt = settings.ai?.implementations?.questionGeneration?.prompt

        if (aiProvider && aiApiKey) {
          setAiConfig({
            provider: aiProvider,
            apiKey: aiApiKey,
            customPrompt: questionPrompt
          })
          setCustomPrompt(questionPrompt || "")
        }
      }

      // Fallback to old ai-config if organization settings not found
      const storedConfig = localStorage.getItem('ai-config')
      if (storedConfig && !aiConfig) {
        setAiConfig(JSON.parse(storedConfig))
      }
    } catch (error) {
      console.warn('Failed to load AI config:', error)
    }
  }, [])

  // Function to handle AI question generation
  const handleGenerateAIQuestions = async () => {
    if (!aiTopic.trim()) {
      toast({
        title: "Topic Required",
        description: "Please enter a topic for AI question generation.",
        variant: "destructive"
      })
      return
    }

    if (!aiConfig || !aiConfig.apiKey) {
      toast({
        title: "AI Configuration Missing",
        description: "Please configure AI settings first. Using demo mode with limited functionality.",
        variant: "default"
      })
    }

    setIsGeneratingAI(true)

    try {
      const request: QuestionGenerationRequest = {
        topic: aiTopic,
        num_questions: aiNumQuestions,
        question_types: aiQuestionTypes,
        include_answers: selectedFormType === 'ai_question_with_answer'
      }

      // Use custom prompt if available and being edited, otherwise use from config
      const finalConfig = aiConfig ? {
        ...aiConfig,
        customPrompt: customPrompt || aiConfig.customPrompt
      } : undefined

      const generatedQuestions = await generateAIQuestions(
        request,
        finalConfig
      )

      if (editingForm) {
        setEditingForm(prev => prev ? {
          ...prev,
          questions: [...prev.questions, ...generatedQuestions],
          form_type: selectedFormType,
          ai_config: {
            provider: aiConfig?.provider || 'anthropic',
            topic: aiTopic,
            num_questions: aiNumQuestions
          }
        } : null)

        toast({
          title: "AI Questions Generated!",
          description: `Successfully generated ${generatedQuestions.length} questions about "${aiTopic}".`,
          variant: "default"
        })

        // Reset AI form
        setAiTopic("")
        setAiNumQuestions(5)
      }
    } catch (error) {
      console.error('AI generation error:', error)

      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('authentication_error')) {
        toast({
          title: "API Key Invalid",
          description: "Your Anthropic API key is invalid. Using demo questions instead. Configure a valid API key in settings for full AI functionality.",
          variant: "default"
        })
      } else {
        toast({
          title: "Generation Failed",
          description: error instanceof Error ? error.message : "Failed to generate AI questions. Using demo questions instead.",
          variant: "default"
        })
      }
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Load feedback templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true)
        
        // Clean up any corrupted form response data on startup
        cleanupFormResponsesStorage()
        
        // Try to load from backend first
        let backendForms: FeedbackTemplate[] = []
        try {
          const response = await getFeedbackTemplates()
          backendForms = response.results
        } catch (error) {
          console.warn('Backend not available, using local storage:', error)
        }
        
        // Load locally created forms
        const localForms = loadFormsFromLocalStorage()
        
        // Combine backend and local forms, remove duplicates
        const allForms = [...backendForms, ...localForms]
        const uniqueForms = allForms.filter((form, index, array) => 
          array.findIndex(f => f.id === form.id) === index
        )
        
        setForms(uniqueForms)
      } catch (error) {
        console.error('Error loading feedback templates:', error)
        // Fallback to local storage only
        const localForms = loadFormsFromLocalStorage()
        setForms(localForms)
        
        toast({
          title: "Offline Mode",
          description: "Loading forms from local storage. Backend not available.",
          variant: "default"
        })
      } finally {
        setIsLoading(false)
      }
    }
 
    fetchTemplates()
  }, [toast])
 
  const handleCreateNewForm = () => {
    setEditingForm({
      id: 0, // New form
      name: "New Feedback Form",
      description: "",
      questions: [],
      sections: [],
      rating_criteria: [],
      status: "draft",
      is_active: true,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      form_type: selectedFormType,
    })
    setActiveTab("builder")
  }
 
  const handleEditForm = async (form: FeedbackTemplate) => {
    // Check if this is a local form (timestamp-based ID > 1000000000000)
    const isLocalForm = form.id > 1000000000000
    
    if (!isLocalForm) {
      // Only try backend validation for server forms
      try {
        const response = await fetchWithTimeout(`http://localhost:8000/api/feedback-templates/${form.id}/`, {
          method: 'GET'
        })
        
        if (!response.ok && response.status === 404) {
          toast({
            title: "Note",
            description: `Form "${form.name}" not found on server. Editing locally.`,
            variant: "default"
          })
        }
      } catch (error) {
        console.warn('Backend validation failed, editing locally:', error)
        toast({
          title: "Offline Mode", 
          description: "Editing form locally. Backend not available.",
          variant: "default"
        })
      }
    }
    
    // Always proceed with editing regardless of backend status
    setEditingForm({ ...form })
    setActiveTab("builder")
  }
 
  const handleSaveForm = async () => {
    if (!editingForm) return
 
    // Debug logging to understand form state

    try {
      setIsSubmitting(true)
     
      const formData = {
        name: editingForm.name,
        description: editingForm.description,
        questions: editingForm.questions,
        status: editingForm.status,
        is_active: editingForm.is_active,
        is_default: editingForm.is_default,
        form_type: editingForm.form_type,
        ai_config: editingForm.ai_config
      }
 
      let savedForm: FeedbackTemplate
     
      // Check if this is a new form (ID is 0, null, or undefined)
      if (!editingForm.id || editingForm.id === 0) {
        // Create new form
        try {
          savedForm = await createFeedbackTemplate(formData)
        } catch (error) {
          // If backend fails, create locally with unique ID
          console.warn('Backend create failed, creating locally:', error)
          savedForm = {
            ...formData,
            id: Date.now(), // Use timestamp as unique ID
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sections: [],
            rating_criteria: [],
            form_type: editingForm.form_type || 'question_only',
            ai_config: editingForm.ai_config
          } as FeedbackTemplate
        }
        
        setForms(prev => {
          const newForms = [...prev, savedForm]
          // Save updated forms to localStorage
          saveFormsToLocalStorage(newForms)
          return newForms
        })

        toast({
          title: "Success!",
          description: `Feedback form "${savedForm.name}" has been created.`,
          variant: "default"
        })
      } else {
        // Update existing form
        console.log('Updating form with ID:', editingForm.id, 'Data:', formData)
        
        // Validate that we have a valid ID before attempting update
        if (!editingForm.id || editingForm.id === 0) {
          throw new Error('Cannot update form: Invalid or missing form ID')
        }
        
        const isLocalForm = editingForm.id > 1000000000000
        let updateFailed = false
        
        if (isLocalForm) {
          // For local forms, skip backend call and update locally
          updateFailed = true
          savedForm = {
            ...editingForm,
            ...formData,
            updated_at: new Date().toISOString()
          }
        } else {
          // For server forms, try backend update first
          try {
            savedForm = await updateFeedbackTemplate(editingForm.id, formData)
          } catch (updateError: any) {
            // If backend update fails, update locally
            console.warn('Backend update failed, updating locally:', updateError)
            updateFailed = true
            savedForm = {
              ...editingForm,
              ...formData,
              updated_at: new Date().toISOString()
            }
          }
        }
        
        setForms(prev => {
          const updatedForms = prev.map(f => f.id === savedForm.id ? savedForm : f)
          // Save updated forms to localStorage
          saveFormsToLocalStorage(updatedForms)
          return updatedForms
        })
        
        toast({
          title: updateFailed ? "Offline Update" : "Success!",
          description: updateFailed 
            ? "Form updated locally. Backend not available." 
            : `Feedback form "${savedForm.name}" has been updated.`,
          variant: "default"
        })
      }
     
      setEditingForm(null)
      setActiveTab("forms")
     
    } catch (error: any) {
      console.error('Error saving feedback form:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save feedback form. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
 
  const handleDeleteForm = async (id: number) => {
    if (!confirm("Are you sure you want to delete this form?")) return
   
    try {
      setIsSubmitting(true)
      try {
        await deleteFeedbackTemplate(id)
      } catch (error) {
        console.warn('Backend delete failed, deleting locally:', error)
      }
      
      setForms(prev => {
        const filteredForms = prev.filter(form => form.id !== id)
        // Save updated forms to localStorage
        saveFormsToLocalStorage(filteredForms)
        return filteredForms
      })
      toast({
        title: "Success!",
        description: "Feedback form has been deleted.",
        variant: "default"
      })
    } catch (error: any) {
      console.error('Error deleting feedback form:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete feedback form. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenForm = async (form: FeedbackTemplate) => {
    setPreviewForm(form)
    setIsPreviewOpen(true)
    setIsFillingForm(false)
    setFormResponses({})
    
    // Load existing responses for this form
    try {
      console.log('Loading responses for form:', form.id, 'Form name:', form.name)
      console.log('Form questions:', form.questions.map(q => ({ id: q.id, text: q.text })))

      const responses = await getFormResponses(form.id)
      setSavedFormResponses(responses)

      // Populate form responses state with existing data
      const responseMap: Record<number, any> = {}
      console.log('Loading saved form responses:', responses.length, 'responses found for form', form.id)

      responses.forEach(response => {
        console.log(`Processing response for question ${response.question_id}:`, {
          formId: response.form_id,
          questionId: response.question_id,
          type: response.response_type,
          fileName: response.file_name,
          fileType: response.file_type,
          hasFileData: !!response.response_file,
          responseText: response.response_text,
          fileDataPreview: response.response_file?.substring(0, 50)
        })

        if (response.response_type === 'text' || response.response_type === 'textarea') {
          responseMap[response.question_id] = response.response_text || ''
        } else if (response.response_type === 'audio' || response.response_type === 'video') {
          responseMap[response.question_id] = {
            name: response.file_name,
            type: response.file_type,
            data: response.response_file,
            uploadType: response.response_type
          }
        }
      })
      setFormResponses(responseMap)

      console.log('Form responses state updated:', Object.keys(responseMap))
      console.log('Response map content:', responseMap)
    } catch (error) {
      console.error('Error loading form responses:', error)
      setSavedFormResponses([])
    }
  }

  const handleStartFilling = () => {
    setIsFillingForm(true)
    // Don't clear formResponses - keep existing saved responses
  }

  const handleResponseChange = (questionId: number, value: any) => {
    setFormResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleFileUpload = async (questionId: number, file: File, type: 'audio' | 'video') => {
    try {
      // Convert file to base64 for persistent storage
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      setFormResponses(prev => ({
        ...prev,
        [questionId]: {
          name: file.name,
          size: file.size,
          type: file.type,
          data: base64Data, // Store as base64
          uploadType: type
        }
      }))
    } catch (error) {
      console.error('Error converting file:', error)
      toast({
        title: "Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleSaveIndividualQuestion = async (questionId: number) => {
    if (!previewForm) return
    
    const response = formResponses[questionId]
    if (!response) {
      toast({
        title: "No Response",
        description: "Please add a response before saving.",
        variant: "destructive"
      })
      return
    }

    setSavingQuestions(prev => new Set([...prev, questionId]))

    try {
      const question = previewForm.questions.find(q => q.id === questionId)
      if (!question) throw new Error('Question not found')

      let responseData
      if (question.type === 'text' || question.type === 'textarea') {
        responseData = {
          form_id: previewForm.id,
          question_id: questionId,
          response_text: response,
          response_type: question.type as 'text' | 'textarea'
        }
      } else if (question.type === 'audio' || question.type === 'video') {
        responseData = {
          form_id: previewForm.id,
          question_id: questionId,
          response_file: response.data,
          file_name: response.name,
          file_type: response.type,
          response_type: question.type as 'audio' | 'video'
        }
      } else {
        throw new Error('Unsupported question type')
      }

      console.log('Saving response data:', responseData)
      const savedResponse = await saveFormResponse(responseData)
      console.log('Response saved successfully:', savedResponse)

      // Update saved responses
      const responses = await getFormResponses(previewForm.id)
      console.log('Reloaded responses after save:', responses.length, 'responses')
      console.log('All responses after save:', responses)
      setSavedFormResponses(responses)

      // Also update the form responses state immediately
      setFormResponses(prev => ({
        ...prev,
        [questionId]: response
      }))

      // Show appropriate success message based on storage method
      const isLocalStorage = savedResponse.id && savedResponse.id > 1000000000000 // localStorage uses timestamp IDs
      toast({
        title: isLocalStorage ? "Saved Locally!" : "Saved!",
        description: isLocalStorage ? 
          `Response saved to local storage (backend unavailable). Data will persist until browser storage is cleared.` :
          `Response for question ${questionId} has been saved to server.`,
        variant: "default"
      })
    } catch (error) {
      console.error('Error saving question response:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast({
        title: "Save Failed",
        description: `Failed to save response: ${errorMessage}. Please check your connection and try again.`,
        variant: "destructive"
      })
    } finally {
      setSavingQuestions(prev => {
        const newSet = new Set(prev)
        newSet.delete(questionId)
        return newSet
      })
    }
  }

  const handleSaveResponses = () => {
    if (!previewForm) return
    
    // Filter out empty responses
    const filteredResponses = Object.entries(formResponses)
      .filter(([_, value]) => {
        if (typeof value === 'string') {
          return value.trim() !== ''
        }
        if (typeof value === 'object' && value !== null) {
          return value.data || value.name // For file uploads
        }
        return value !== null && value !== undefined && value !== ''
      })
      .reduce((acc, [key, value]) => {
        acc[parseInt(key)] = value
        return acc
      }, {} as Record<number, any>)

    // Save responses to localStorage for demo
    const responseData = {
      formId: previewForm.id,
      formName: previewForm.name,
      responses: filteredResponses,
      totalQuestions: previewForm.questions.length,
      answeredQuestions: Object.keys(filteredResponses).length,
      submittedAt: new Date().toISOString()
    }
    
    console.log('Saving response data:', responseData) // Debug log
    console.log('Form responses state:', formResponses) // Debug current state
    
    try {
      const existingResponses = localStorage.getItem('form-responses')
      const responses = existingResponses ? JSON.parse(existingResponses) : []
      responses.push(responseData)
      localStorage.setItem('form-responses', JSON.stringify(responses))
      
      console.log('All responses saved:', responses) // Debug log
      
      toast({
        title: "Success!",
        description: `Your responses have been saved successfully. (${Object.keys(filteredResponses).length} answers)`,
        variant: "default"
      })
      
      setIsFillingForm(false)
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: "Error",
        description: "Failed to save responses. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleBuilderResponseChange = (questionId: number, value: any) => {
    setBuilderResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleBuilderFileUpload = async (questionId: number, file: File, type: 'audio' | 'video') => {
    try {
      // Convert file to base64 for persistent storage
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      setBuilderResponses(prev => ({
        ...prev,
        [questionId]: {
          name: file.name,
          size: file.size,
          type: file.type,
          data: base64Data,
          uploadType: type
        }
      }))
    } catch (error) {
      console.error('Error converting file:', error)
      toast({
        title: "Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleSaveBuilderQuestion = async (questionId: number) => {
    if (!editingForm) return

    const response = builderResponses[questionId]
    if (!response) {
      toast({
        title: "No Response",
        description: "Please add a response before saving.",
        variant: "destructive"
      })
      return
    }

    setSavingQuestions(prev => new Set([...prev, questionId]))

    try {
      const question = editingForm.questions.find(q => q.id === questionId)
      if (!question) throw new Error('Question not found')

      let responseData
      if (question.type === 'text' || question.type === 'textarea') {
        responseData = {
          form_id: editingForm.id,
          question_id: questionId,
          response_text: response,
          response_type: question.type as 'text' | 'textarea'
        }
      } else if (question.type === 'audio' || question.type === 'video') {
        responseData = {
          form_id: editingForm.id,
          question_id: questionId,
          response_file: response.data,
          file_name: response.name,
          file_type: response.type,
          response_type: question.type as 'audio' | 'video'
        }
      } else {
        throw new Error('Unsupported question type')
      }

      await saveFormResponse(responseData)

      toast({
        title: "Question Saved!",
        description: `Response for this question has been saved.`,
        variant: "default"
      })
    } catch (error) {
      console.error('Error saving builder question response:', error)
      toast({
        title: "Error",
        description: "Failed to save response. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSavingQuestions(prev => {
        const newSet = new Set(prev)
        newSet.delete(questionId)
        return newSet
      })
    }
  }
 
  const handlePublishForm = async (id: number) => {
    try {
      setIsSubmitting(true)
      await publishFeedbackTemplate(id)
      setForms(prev => prev.map(form =>
        form.id === id ? { ...form, status: "published" } : form
      ))
      toast({
        title: "Success!",
        description: "Feedback form has been published.",
        variant: "default"
      })
    } catch (error: any) {
      console.error('Error publishing feedback form:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to publish feedback form. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
 
  const handleUnpublishForm = async (id: number) => {
    try {
      setIsSubmitting(true)
      await unpublishFeedbackTemplate(id)
      setForms(prev => prev.map(form =>
        form.id === id ? { ...form, status: "draft" } : form
      ))
      toast({
        title: "Success!",
        description: "Feedback form has been unpublished.",
        variant: "default"
      })
    } catch (error: any) {
      console.error('Error unpublishing feedback form:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to unpublish feedback form. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
 
  const handleAddQuestion = () => {
    if (!editingForm || !newQuestionText) return
 
    const newQ: Question = {
      id: editingForm.questions.length ? Math.max(...editingForm.questions.map((q) => q.id)) + 1 : 1,
      text: newQuestionText,
      type: newQuestionType,
      required: newQuestionRequired,
    }
    
 
    setEditingForm((prev) => {
      const updated = prev ? { ...prev, questions: [...prev.questions, newQ] } : null
      return updated
    })
    setNewQuestionText("")
    setNewQuestionType("text")
    setNewQuestionOptions("")
    setNewQuestionRequired(false)
  }
 
  const handleRemoveQuestion = (id: number) => {
    setEditingForm((prev) => (prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== id) } : null))
  }
 
  const handleQuestionPropertyChange = (questionId: number, field: keyof Question, value: any) => {
    setEditingForm((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q) => (q.id === questionId ? { ...q, [field]: value } : q)),
          }
        : null,
    )
  }
 
  const getQuestionIcon = (type: Question["type"]) => {
    switch (type) {
      case "text":
      case "textarea":
        return <MessageSquareText className="h-4 w-4" />
      case "audio":
        return <Radio className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      default:
        return <MessageSquareText className="h-4 w-4" />
    }
  }
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
              <MessageSquareText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Feedback Form Builder
              </h1>
              <p className="text-slate-600 text-xs mt-1">Create and manage custom feedback forms for interviews and assessments.</p>
            </div>
          </div>
        </div>
 
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white border border-slate-300 rounded-lg p-1">
            <TabsTrigger
              value="forms"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-600 rounded-md font-medium transition-all duration-200 py-2 px-4"
            >
              Your Forms
            </TabsTrigger>
            <TabsTrigger
              value="builder"
              disabled={!editingForm}
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-600 rounded-md font-medium transition-all duration-200 disabled:opacity-50 py-2 px-4"
            >
              Form Builder
            </TabsTrigger>
          </TabsList>
 
          <TabsContent value="forms" className="mt-6">
            <Card className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 pb-6">
                <div className="flex flex-col space-y-4">
                  {/* Title Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                        <ListChecks className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-lg font-bold text-slate-900">Feedback Forms</CardTitle>
                    </div>
                  </div>

                  {/* Form Type Selection Row */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-slate-700 whitespace-nowrap">Form Type:</Label>
                      <Select
                        value={selectedFormType}
                        onValueChange={(value) => setSelectedFormType(value as FormType)}
                      >
                        <SelectTrigger className="w-56 bg-white border-slate-300 text-black font-medium hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                          <SelectValue className="text-black" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-slate-300 shadow-xl text-black">
                          {/* <SelectItem value="question_only" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">
                            <div className="flex items-center gap-2 text-black">
                              <MessageSquareText className="h-4 w-4 text-gray-600" />
                              <span className="text-black font-medium">Question Only</span>
                            </div>
                          </SelectItem> */}
                          <SelectItem value="question_with_answer" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">
                            <div className="flex items-center gap-2 text-black">
                              <MessageSquareText className="h-4 w-4 text-gray-600" />
                              <span className="text-black font-medium">Question with Answer</span>
                            </div>
                          </SelectItem>
                          {/* <SelectItem value="ai_question_only" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">
                            <div className="flex items-center gap-2 text-black">
                              <Star className="h-4 w-4 text-purple-600" />
                              <span className="text-black font-medium">AI Question Only</span>
                            </div>
                          </SelectItem> */}
                          <SelectItem value="ai_question_with_answer" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">
                            <div className="flex items-center gap-2 text-black">
                              <Star className="h-4 w-4 text-purple-600" />
                              <span className="text-black font-medium">AI Question with Answer</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleCreateNewForm}
                      className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Create New Form
                    </Button>
                  </div>

                  {/* Form Type Description */}
                  <div className="bg-white/70 rounded-lg p-3 border border-slate-200">
                    <p className="text-sm text-slate-600">
                      {selectedFormType === 'question_only' && "Create forms with custom questions for manual responses."}
                      {selectedFormType === 'question_with_answer' && "Create forms with questions that include predefined answer options."}
                      {selectedFormType === 'ai_question_only' && "Let AI generate relevant questions based on your topic."}
                      {selectedFormType === 'ai_question_with_answer' && "Let AI generate questions with sample answers and response guidance."}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {isLoading ? (
                  <div className="flex flex-col justify-center items-center py-12">
                    <div className="relative">
                      <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                      <div className="absolute inset-0 h-12 w-12 animate-pulse bg-blue-400 rounded-full opacity-20"></div>
                    </div>
                    <span className="mt-4 text-sm text-slate-600 font-medium">Loading feedback forms...</span>
                  </div>
                ) : forms.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                      <MessageSquareText className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Forms Yet</h3>
                    <p className="text-sm text-slate-600">Create your first feedback form to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {forms.map((form, formIndex) => (
                      <div key={`form-${form.id}-${formIndex}`} className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-300 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
                            {getQuestionIcon("text")}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-slate-900 mb-1">{form.name}</h3>
                            <p className="text-sm text-slate-600 mb-3">{form.description}</p>
                            <div className="flex items-center gap-3">
                              <Badge
                                className={
                                  form.status === "published"
                                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-sm"
                                    : "bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0 shadow-sm"
                                }
                              >
                                {form.status}
                              </Badge>
                              <div className="flex items-center gap-1 text-slate-500">
                                <MessageSquareText className="h-4 w-4" />
                                <span className="text-xs font-medium">
                                  {form.questions.length} question{form.questions.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3 ml-4">
                          <Button
                            size="sm"
                            onClick={() => handleEditForm(form)}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-4 py-2"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {form.status === "draft" ? (
                            <Button
                              size="sm"
                              onClick={() => handlePublishForm(form.id)}
                              disabled={isSubmitting}
                              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 px-4 py-2"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleUnpublishForm(form.id)}
                              disabled={isSubmitting}
                              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 px-4 py-2"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleOpenForm(form)}
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-4 py-2"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDeleteForm(form.id)}
                            disabled={isSubmitting}
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 px-4 py-2"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
 
        <TabsContent value="builder" className="mt-4">
          {editingForm && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Form Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="form-name">Form Name</Label>
                    <Input
                      id="form-name"
                      value={editingForm.name}
                      onChange={(e) => setEditingForm({ ...editingForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="form-description">Description</Label>
                    <Textarea
                      id="form-description"
                      value={editingForm.description}
                      onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
 
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Questions</CardTitle>
                  <CardDescription className="text-sm">Add and manage questions for this feedback form.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {editingForm.questions && editingForm.questions.length > 0 ? (
                      editingForm.questions.map((question, questionIndex) => (
                      <div key={`edit-question-${question.id || questionIndex}`} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getQuestionIcon(question.type)}
                            <span className="text-sm font-medium">Question {question.id}</span>
                            <Badge variant="secondary">{question.type}</Badge>
                            {question.required && <Badge variant="outline">Required</Badge>}
                            {question.ai_generated && <Badge className="bg-purple-100 text-purple-800 border-purple-200">AI</Badge>}
                            {question.answer && <Badge className="bg-green-100 text-green-800 border-green-200">With Answer</Badge>}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveForm}
                              disabled={isSubmitting}
                              className="bg-green-600 hover:bg-green-700 text-white disabled:bg-green-400 disabled:text-white"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRemoveQuestion(question.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Input
                            value={question.text}
                            onChange={(e) =>
                              handleQuestionPropertyChange(question.id, "text", e.target.value)
                            }
                            placeholder="Question text..."
                          />
                          <div className="flex gap-4">
                            <Select
                              value={question.type}
                              onValueChange={(value) =>
                                handleQuestionPropertyChange(question.id, "type", value)
                              }
                            >
                              <SelectTrigger className="w-40 bg-white border-slate-300 text-black font-medium hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                                <SelectValue className="text-black" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border border-slate-300 shadow-xl text-black">
                                <SelectItem value="text" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer font-medium">Text</SelectItem>
                                <SelectItem value="textarea" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer font-medium">Textarea</SelectItem>
                                <SelectItem value="audio" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer font-medium">Audio</SelectItem>
                                <SelectItem value="video" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer font-medium">Video</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`required-${question.id}`}
                                checked={question.required}
                                onCheckedChange={(checked) =>
                                  handleQuestionPropertyChange(question.id, "required", checked)
                                }
                              />
                              <Label htmlFor={`required-${question.id}`}>Required</Label>
                            </div>
                          </div>

                          {/* Show answer if it exists */}
                          {question.answer && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                              <Label className="text-sm font-medium text-green-800 mb-2 block">
                                Sample Answer/Guidance:
                              </Label>
                              <p className="text-sm text-green-700">{question.answer}</p>
                              {editingForm?.form_type === 'question_with_answer' && (
                                <div className="mt-2">
                                  <Textarea
                                    value={question.answer}
                                    onChange={(e) =>
                                      handleQuestionPropertyChange(question.id, "answer", e.target.value)
                                    }
                                    placeholder="Edit answer or guidance..."
                                    className="text-sm"
                                    rows={3}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Add answer field for question_with_answer type */}
                          {editingForm?.form_type === 'question_with_answer' && !question.answer && (
                            <div className="mt-3">
                              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                                Add Sample Answer/Guidance:
                              </Label>
                              <Textarea
                                placeholder="Provide a sample answer or guidance for this question..."
                                onChange={(e) =>
                                  handleQuestionPropertyChange(question.id, "answer", e.target.value)
                                }
                                className="text-sm"
                                rows={3}
                              />
                            </div>
                          )}

                          {/* {question.type === "text" && (
                            <div className="mt-2">
                              <label className="text-xs text-gray-600">Text Input Preview:</label>
                              <Input
                                placeholder="User can type text here..."
                                className="bg-white border border-gray-300 mt-1"
                              />
                            </div>
                          )}
                          {question.type === "textarea" && (
                            <div className="mt-2">
                              <label className="text-xs text-gray-600">Textarea Preview:</label>
                              <Textarea
                                placeholder="User can type long text here..."
                                rows={3}
                                className="bg-white border border-gray-300 mt-1"
                              />
                            </div>
                          )}
                          {question.type === "audio" && (
                            <div className="mt-2">
                              <label className="text-xs text-gray-600">Audio Upload Preview:</label>
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white mt-1">
                                <Radio className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-xs text-gray-600 mb-2">User can upload audio files here</p>
                                <input type="file" accept="audio/*" className="text-xs text-gray-600" />
                              </div>
                            </div>
                          )}
                          {question.type === "video" && (
                            <div className="mt-2">
                              <label className="text-xs text-gray-600">Video Upload Preview:</label>
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white mt-1">
                                <Video className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-xs text-gray-600 mb-2">User can upload video files here</p>
                                <input type="file" accept="video/*" className="text-xs text-gray-600" />
                              </div>
                            </div>
                          )} */}

                          {/* Add Response Section for each question in builder */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-sm font-medium text-gray-900">Test This Question</h5>
                              <Button
                                size="sm"
                                onClick={() => setIsFillingInBuilder(!isFillingInBuilder)}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                {isFillingInBuilder ? 'Hide Response' : 'Add Response'}
                              </Button>
                            </div>
                            
                            {isFillingInBuilder && (
                              <div className="space-y-3">
                                {question.type === "text" && (
                                  <div>
                                    <label className="text-xs font-medium text-gray-700">Your Response:</label>
                                    <Input
                                      value={builderResponses[question.id] || ''}
                                      onChange={(e) => handleBuilderResponseChange(question.id, e.target.value)}
                                      placeholder="Type your response here..."
                                      className="mt-1"
                                    />
                                  </div>
                                )}
                                
                                {question.type === "textarea" && (
                                  <div>
                                    <label className="text-xs font-medium text-gray-700">Your Response:</label>
                                    <Textarea
                                      value={builderResponses[question.id] || ''}
                                      onChange={(e) => handleBuilderResponseChange(question.id, e.target.value)}
                                      placeholder="Type your detailed response here..."
                                      rows={3}
                                      className="mt-1"
                                    />
                                  </div>
                                )}
                                
                                {question.type === "audio" && (
                                  <div>
                                    <label className="text-xs font-medium text-gray-700">Upload Audio:</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center mt-1">
                                      <Radio className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                                      <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleBuilderFileUpload(question.id, file, 'audio');
                                          }
                                        }}
                                        className="text-xs"
                                      />
                                    </div>
                                    {builderResponses[question.id] && (
                                      <div className="bg-blue-50 p-2 rounded mt-2">
                                        <p className="text-xs text-blue-700">{builderResponses[question.id].name}</p>
                                        <audio controls className="mt-1 w-full">
                                          <source src={builderResponses[question.id].data} type={builderResponses[question.id].type} />
                                        </audio>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {question.type === "video" && (
                                  <div>
                                    <label className="text-xs font-medium text-gray-700">Upload Video:</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center mt-1">
                                      <Video className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                                      <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleBuilderFileUpload(question.id, file, 'video');
                                          }
                                        }}
                                        className="text-xs"
                                      />
                                    </div>
                                    {builderResponses[question.id] && (
                                      <div className="bg-purple-50 p-2 rounded mt-2">
                                        <p className="text-xs text-purple-700">{builderResponses[question.id].name}</p>
                                        <video controls className="mt-1 w-full max-w-xs">
                                          <source src={builderResponses[question.id].data} type={builderResponses[question.id].type} />
                                        </video>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div className="flex justify-end">
                                  <Button
                                    onClick={() => handleSaveBuilderQuestion(question.id)}
                                    disabled={savingQuestions.has(question.id) || !builderResponses[question.id]}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white disabled:bg-green-400"
                                  >
                                    {savingQuestions.has(question.id) ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Save Response
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                    ) : (
                      <div className="text-center text-sm text-gray-500 py-4">
                        No questions added yet. Use the form below to add questions.
                      </div>
                    )}
                  </div>
 
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
                    <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Plus className="h-5 w-5 text-blue-600" />
                      Add New Question
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="new-question-text" className="text-sm font-medium text-slate-700">
                          Question Text
                        </Label>
                        <Input
                          id="new-question-text"
                          value={newQuestionText}
                          onChange={(e) => setNewQuestionText(e.target.value)}
                          placeholder="Enter your question here..."
                          className="mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-slate-700">Question Type</Label>
                          <Select
                            value={newQuestionType}
                            onValueChange={(value) => setNewQuestionType(value as Question["type"])}
                          >
                            <SelectTrigger className="mt-1 bg-white border-slate-300 text-black font-medium hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                              <SelectValue className="text-black" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-slate-300 shadow-xl text-black">
                              <SelectItem value="text" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer font-medium">Text Input</SelectItem>
                              <SelectItem value="textarea" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer font-medium">Long Text</SelectItem>
                              <SelectItem value="audio" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer font-medium">Audio Upload</SelectItem>
                              <SelectItem value="video" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer font-medium">Video Upload</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center mt-6">
                          <Checkbox
                            id="new-required"
                            checked={newQuestionRequired}
                            onCheckedChange={(checked) => setNewQuestionRequired(checked as boolean)}
                          />
                          <Label htmlFor="new-required" className="ml-2 text-sm font-medium text-slate-700">
                            Required field
                          </Label>
                        </div>
                      </div>

                      {/* Question Type Preview */}
                      <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
                        <Label className="text-sm font-medium text-slate-600 mb-2 block">
                          Question Preview:
                        </Label>

                        {newQuestionType === "text" && (
                          <Input
                            placeholder="Users will see a text input like this..."
                            disabled
                            className="bg-slate-50"
                          />
                        )}

                        {newQuestionType === "textarea" && (
                          <Textarea
                            placeholder="Users will see a large text area like this for longer responses..."
                            rows={3}
                            disabled
                            className="bg-slate-50"
                          />
                        )}

                        {newQuestionType === "audio" && (
                          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50">
                            <Radio className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                            <p className="text-sm text-slate-600 mb-2">Audio File Upload Area</p>
                            <p className="text-xs text-slate-500">Users can upload .mp3, .wav, or other audio files</p>
                          </div>
                        )}

                        {newQuestionType === "video" && (
                          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50">
                            <Video className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                            <p className="text-sm text-slate-600 mb-2">Video File Upload Area</p>
                            <p className="text-xs text-slate-500">Users can upload .mp4, .mov, or other video files</p>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={handleAddQuestion}
                          disabled={!newQuestionText.trim()}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Question
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Question Generation Section */}
              {editingForm && (editingForm.form_type === 'ai_question_only' || editingForm.form_type === 'ai_question_with_answer') && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-5 w-5 text-purple-600" />
                      AI Question Generation
                    </CardTitle>
                    <CardDescription>Generate professional questions using AI</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ai-topic" className="text-sm font-medium text-slate-700">
                          Topic/Subject
                        </Label>
                        <Input
                          id="ai-topic"
                          value={aiTopic}
                          onChange={(e) => setAiTopic(e.target.value)}
                          placeholder="e.g., Technical Interview, Leadership Skills..."
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="ai-num" className="text-sm font-medium text-slate-700">
                          Number of Questions
                        </Label>
                        <Select
                          value={aiNumQuestions.toString()}
                          onValueChange={(value) => setAiNumQuestions(parseInt(value))}
                        >
                          <SelectTrigger className="mt-1 bg-white border-slate-300 text-black font-medium hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                            <SelectValue className="text-black" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-slate-300 shadow-xl text-black">
                            <SelectItem value="3" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer font-medium">3 questions</SelectItem>
                            <SelectItem value="5" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer font-medium">5 questions</SelectItem>
                            <SelectItem value="8" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer font-medium">8 questions</SelectItem>
                            <SelectItem value="10" className="text-black hover:bg-gray-100 focus:bg-gray-100 cursor-pointer font-medium">10 questions</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">
                        Question Types (select multiple)
                      </Label>
                      <div className="flex flex-wrap gap-3">
                        {(['text', 'textarea', 'audio', 'video', 'code', 'multiple_choice'] as const).map((type) => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              id={`ai-type-${type}`}
                              checked={aiQuestionTypes.includes(type)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setAiQuestionTypes(prev => [...prev, type])
                                } else {
                                  setAiQuestionTypes(prev => prev.filter(t => t !== type))
                                }
                              }}
                            />
                            <Label htmlFor={`ai-type-${type}`} className="text-sm capitalize">
                              {type === 'textarea' ? 'Long Text' : type === 'code' ? 'Program Coding' : type === 'multiple_choice' ? 'Multiple Choice' : type}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Custom AI Prompt Section */}
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium text-slate-700">
                          AI Generation Prompt
                        </Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                          className="text-xs"
                        >
                          {isEditingPrompt ? 'Hide' : 'Edit'} Prompt
                        </Button>
                      </div>

                      {isEditingPrompt && (
                        <div className="space-y-2 mt-3">
                          <Textarea
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder="Enter custom AI prompt for question generation..."
                            rows={8}
                            className="font-mono text-xs bg-white"
                          />
                          <p className="text-xs text-slate-500">
                            This prompt will be used to guide the AI in generating questions.
                            You can also update the default prompt in Settings → AI Configuration.
                          </p>
                        </div>
                      )}

                      {!isEditingPrompt && (
                        <p className="text-xs text-slate-600 mt-1">
                          {customPrompt ?
                            `Using custom prompt (${customPrompt.length} characters)` :
                            'Using default prompt from settings'
                          }
                        </p>
                      )}
                    </div>

                    {!aiConfig && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-amber-700">
                              <strong>AI Configuration Missing:</strong> Configure your AI provider in settings for full functionality.
                            </p>
                            <p className="text-xs text-amber-600 mt-1">
                              For demo purposes, you can use the built-in fallback mode with limited capabilities.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              // Set up demo config
                              const demoConfig = {
                                provider: 'anthropic',
                                apiKey: 'demo-key'
                              };
                              localStorage.setItem('ai-config', JSON.stringify(demoConfig));
                              setAiConfig(demoConfig);
                              toast({
                                title: "Demo Mode Enabled",
                                description: "Using demo AI configuration. Configure proper API keys in settings for full functionality.",
                                variant: "default"
                              });
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                          >
                            Enable Demo
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleGenerateAIQuestions}
                        disabled={!aiTopic.trim() || isGeneratingAI}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingAI ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-2" />
                            Generate AI Questions
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSaveForm} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400 disabled:text-white">
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Form
                </Button>
                <Button
                  onClick={() => {
                    setEditingForm(null)
                    setActiveTab("forms")
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Form Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full bg-white text-black p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b bg-white flex-shrink-0">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-lg font-bold text-black">{previewForm?.name}</DialogTitle>
              {!isFillingForm ? (
                <Button
                  onClick={handleStartFilling}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Fill Form
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setIsFillingForm(false)
                      toast({
                        title: "Form Closed",
                        description: "Individual responses have been saved. Use 'Save This Answer' on each question.",
                        variant: "default"
                      })
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Close Form
                  </Button>
                  <Button
                    onClick={() => setIsFillingForm(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-white min-h-0"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 #f8fafc',
              maxHeight: 'calc(95vh - 80px)'
            }}
          >
          
          {previewForm && (
            <div className="space-y-6 text-black">
              {/* Form Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={previewForm.status === "published" ? "default" : "secondary"}>
                    {previewForm.status}
                  </Badge>
                  {previewForm.is_default && <Badge variant="outline">Default</Badge>}
                </div>
                {previewForm.description && (
                  <p className="text-sm text-gray-700">{previewForm.description}</p>
                )}
              </div>

              {/* Questions Section */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-black">
                  {isFillingForm ? 'Fill Out Form' : `Questions (${previewForm.questions.length})`}
                </h3>
                
                {previewForm.questions.length === 0 ? (
                  <p className="text-sm text-gray-600 italic">No questions added yet.</p>
                ) : (
                  <div className="space-y-6">
                    {previewForm.questions.map((question, index) => (
                      <div key={`form-question-${question.id || index}`} className="border border-gray-200 rounded-lg p-6 bg-white">
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            {getQuestionIcon(question.type)}
                            <span className="text-sm font-medium text-black">Question {index + 1}</span>
                            {question.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium text-black mb-4">{question.text}</p>
                        </div>
                        
                        {/* Interactive Form Elements */}
                        {isFillingForm ? (
                          <div className="space-y-4">
                            {question.type === "text" && (
                              <Input
                                value={formResponses[question.id] || ''}
                                onChange={(e) => handleResponseChange(question.id, e.target.value)}
                                placeholder="Enter your response here..."
                                className="w-full"
                              />
                            )}
                            
                            {question.type === "textarea" && (
                              <Textarea
                                value={formResponses[question.id] || ''}
                                onChange={(e) => handleResponseChange(question.id, e.target.value)}
                                placeholder="Enter your detailed response here..."
                                rows={4}
                                className="w-full"
                              />
                            )}
                            
                            {question.type === "audio" && (
                              <div className="space-y-3">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                  <Radio className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                  <p className="text-xs text-gray-600 mb-3">Upload Audio File</p>
                                  <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleFileUpload(question.id, file, 'audio');
                                      }
                                    }}
                                    className="mb-2"
                                  />
                                </div>
                                {formResponses[question.id] && (
                                  <div className="bg-green-50 p-3 rounded border">
                                    <p className="text-xs text-green-700 font-medium">Audio uploaded:</p>
                                    <p className="text-xs text-green-600">{formResponses[question.id].name}</p>
                                    <audio controls className="mt-2 w-full">
                                      <source src={formResponses[question.id].data} type={formResponses[question.id].type} />
                                      Your browser does not support the audio element.
                                    </audio>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {question.type === "video" && (
                              <div className="space-y-3">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                  <Video className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                  <p className="text-xs text-gray-600 mb-3">Upload Video File</p>
                                  <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleFileUpload(question.id, file, 'video');
                                      }
                                    }}
                                    className="mb-2"
                                  />
                                </div>
                                {formResponses[question.id] && (
                                  <div className="bg-green-50 p-3 rounded border">
                                    <p className="text-xs text-green-700 font-medium">Video uploaded:</p>
                                    <p className="text-xs text-green-600">{formResponses[question.id].name}</p>
                                    <video controls className="mt-2 w-full max-w-md">
                                      <source src={formResponses[question.id].data} type={formResponses[question.id].type} />
                                      Your browser does not support the video element.
                                    </video>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Individual Save Button for each question */}
                            <div className="flex justify-end pt-3 border-t border-gray-200">
                              <Button
                                onClick={() => handleSaveIndividualQuestion(question.id)}
                                disabled={savingQuestions.has(question.id) || !formResponses[question.id]}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400"
                              >
                                {savingQuestions.has(question.id) ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4 mr-2" />
                                )}
                                Save This Answer
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* Preview Mode with Saved Response */
                          <div >
                            <div >
                              {/* <div className="text-xs text-gray-600 mb-2 flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {question.type.replace('-', ' ').replace('_', ' ')}
                                </Badge>
                                Preview Mode
                              </div> */}
                              {/* {question.type === "text" && (
                                <Input placeholder="Text input preview..." disabled className="bg-gray-100" />
                              )}
                              {question.type === "textarea" && (
                                <Textarea placeholder="Textarea preview..." rows={3} disabled className="bg-gray-100" />
                              )}
                              {question.type === "audio" && (
                                <div className="border border-gray-300 rounded p-3 text-center text-gray-500">
                                  <Radio className="h-6 w-6 mx-auto mb-1" />
                                  <p className="text-xs">Audio upload field</p>
                                </div>
                              )}
                              {question.type === "video" && (
                                <div className="border border-gray-300 rounded p-3 text-center text-gray-500">
                                  <Video className="h-6 w-6 mx-auto mb-1" />
                                  <p className="text-xs">Video upload field</p>
                                </div>
                              )} */}
                            </div>
                            
                            {/* Show Saved Response */}
                            {(() => {
                              const savedResponse = savedFormResponses.find(r => r.question_id === question.id)
                              if (savedResponse) {
                                return (
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline" className="text-green-700 border-green-300">
                                        Saved Response
                                      </Badge>
                                      <span className="text-xs text-green-600">
                                        {new Date(savedResponse.created_at || '').toLocaleString()}
                                      </span>
                                    </div>
                                    
                                    {(question.type === 'text' || question.type === 'textarea') && (
                                      <div className="bg-white p-3 rounded border">
                                        <p className="text-gray-800">{savedResponse.response_text}</p>
                                      </div>
                                    )}
                                    
                                    {question.type === 'audio' && savedResponse.response_file && (
                                      <div className="bg-white p-3 rounded border">
                                        <p className="text-xs text-blue-700 font-medium mb-2">Audio Response: {savedResponse.file_name}</p>
                                        <audio controls className="w-full">
                                          <source src={savedResponse.response_file} type={savedResponse.file_type} />
                                          Your browser does not support the audio element.
                                        </audio>
                                      </div>
                                    )}
                                    
                                    {question.type === 'video' && savedResponse.response_file && (
                                      <div className="bg-white p-3 rounded border">
                                        <p className="text-xs text-purple-700 font-medium mb-2">Video Response: {savedResponse.file_name}</p>
                                        {(() => {
                                          console.log('Rendering saved video response:', {
                                            fileName: savedResponse.file_name,
                                            fileType: savedResponse.file_type,
                                            hasData: !!savedResponse.response_file,
                                            dataLength: savedResponse.response_file?.length,
                                            dataPreview: savedResponse.response_file?.substring(0, 50)
                                          });
                                          return null;
                                        })()}
                                        {savedResponse.response_file?.startsWith('data:') ? (
                                          <div className="relative">
                                            <video 
                                              controls 
                                              className="w-full max-w-md" 
                                              preload="metadata"
                                              style={{ maxHeight: '300px' }}
                                              onLoadStart={() => console.log('Saved video loading started:', savedResponse.file_name)}
                                              onCanPlay={() => {
                                                console.log('Saved video can play:', savedResponse.file_name);
                                                // Remove any existing error messages when video loads successfully
                                                const errorDiv = document.querySelector('.saved-video-error');
                                                if (errorDiv) errorDiv.remove();
                                              }}
                                              onLoadedMetadata={(e) => {
                                                const video = e.target as HTMLVideoElement;
                                                console.log('Saved video metadata loaded:', {
                                                  name: savedResponse.file_name,
                                                  duration: video.duration,
                                                  videoWidth: video.videoWidth,
                                                  videoHeight: video.videoHeight
                                                });
                                              }}
                                              onError={(e) => {
                                                console.error('Saved video playback error:', e, 'for file:', savedResponse.file_name);
                                                console.error('Saved video data length:', savedResponse.response_file?.length);
                                                console.error('Saved video data preview:', savedResponse.response_file?.substring(0, 100));
                                                const target = e.target as HTMLVideoElement;
                                                target.style.display = 'none';
                                                const parent = target.parentElement;
                                                if (parent && !parent.querySelector('.saved-video-error')) {
                                                  const errorDiv = document.createElement('div');
                                                  errorDiv.className = 'text-xs text-red-600 p-2 border border-red-200 rounded bg-red-50 saved-video-error';
                                                  errorDiv.innerHTML = `
                                                    <p><strong>Saved Video Playback Error</strong></p>
                                                    <p>File: ${savedResponse.file_name}</p>
                                                    <p>Type: ${savedResponse.file_type}</p>
                                                    <p>Data length: ${savedResponse.response_file?.length || 0} chars</p>
                                                    <p class="text-xs mt-1">The saved video may be corrupted or in an unsupported format.</p>
                                                  `;
                                                  parent.appendChild(errorDiv);
                                                }
                                              }}
                                            >
                                              <source src={savedResponse.response_file} type={savedResponse.file_type || 'video/mp4'} />
                                              <source src={savedResponse.response_file} type="video/mp4" />
                                              <source src={savedResponse.response_file} type="video/webm" />
                                              <source src={savedResponse.response_file} type="video/ogg" />
                                              Your browser does not support the video element.
                                            </video>
                                          </div>
                                        ) : (
                                          <div className="text-xs text-gray-500 p-2 border border-gray-200 rounded bg-gray-50">
                                            <p><strong>Saved Video Issue</strong></p>
                                            <p><strong>File:</strong> {savedResponse.file_name}</p>
                                            <p><strong>Type:</strong> {savedResponse.file_type}</p>
                                            <p><strong>Issue:</strong> Video data format appears invalid or missing.</p>
                                            <p className="text-xs mt-2 font-mono truncate">
                                              Data format: {savedResponse.response_file ? 
                                                (savedResponse.response_file.startsWith('data:') ? 'Base64 Data URL' : 'Raw data') : 
                                                'No data'
                                              }
                                            </p>
                                            {savedResponse.response_file && (
                                              <p className="text-xs font-mono truncate">Preview: {savedResponse.response_file.substring(0, 50)}...</p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Metadata */}
              <div className="border-t border-gray-200 pt-4 text-sm text-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong className="text-sm text-black">Created:</strong> {new Date(previewForm.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    <strong className="text-sm text-black">Last Updated:</strong> {new Date(previewForm.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}